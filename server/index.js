const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env"), override: true });
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const { authenticateToken, authorizeAdmin } = require("./middleware/authMiddleware");

// Route modules
const adminRoutes = require("./routes/admin");
const examConfigRoutes = require("./routes/examconfig");
const shiftRoutes = require("./routes/shifts");
const { subjectRouter, topicRouter } = require("./routes/subjects");
const candidateRoutes = require("./routes/candidates");
const questionBankRoutes = require("./routes/questionbank");
const weightageRoutes = require("./routes/weightage");
const paperGeneratorRoutes = require("./routes/papergenerator");
const resultRoutes = require("./routes/results");
const examEngineRoutes = require("./routes/examengine");
const syncRoutes = require("./routes/sync");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Serve static uploaded files (question images, assets)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.IO
const io = new Server(server, {
  cors: { origin: "*" },
});
app.set("io", io); // Make io available in routes

// In-memory map: candidateId (string) -> socketId
// Used by join routes to emit force_logout to evicted sessions
const userSockets = new Map();
app.set("userSockets", userSockets);

// Health check
app.get("/", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW()");
    res.json({ status: "ok", dbTime: r.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

// Admin API Routes
app.use("/admin", adminRoutes); // Handles /admin/login (public), /admin/dashboard-stats, /admin/sessions/...
app.use("/admin/exam", examConfigRoutes);
app.use("/admin/shifts", shiftRoutes);
app.use("/admin/subjects", subjectRouter);
app.use("/admin/topics", topicRouter);
app.use("/admin/candidates", candidateRoutes);
app.use("/admin/questions", questionBankRoutes);
app.use("/admin/weightage", weightageRoutes);
app.use("/admin/generate", paperGeneratorRoutes);
app.use("/admin/results", resultRoutes);

// Cloud sync routes
app.use("/admin/sync-questions", syncRoutes);

// Candidate Exam Engine Routes (/exam/join, /exam/answer, /exam/mark, /exam/submit, /exam/status)
app.use("/exam", examEngineRoutes);

// Socket logic
// Soft auth middleware: set socket.user if JWT is valid
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      // Token invalid — socket.user stays undefined
    }
  }
  next(); // always allow connection
});

io.on("connection", (socket) => {
  const candidateId = socket.user?.candidateId || socket.user?.userId;
  console.log("Client connected:", socket.id, "| user:", candidateId || "anonymous");

  // Candidate joins shift broadcast room (authorized by JWT shiftId or admin role)
  socket.on("join_shift_room", ({ shiftId }) => {
    const reqShiftId = parseInt(shiftId, 10);
    if (!reqShiftId) return;
    if (socket.user?.role === "admin" || socket.user?.shiftId === reqShiftId) {
      socket.join(`shift:${reqShiftId}`);
      console.log(`Socket ${socket.id} joined room shift:${reqShiftId}`);
    } else {
      console.warn(`Socket ${socket.id} unauthorized attempt to join room shift:${reqShiftId}`);
    }
  });

  // Admin joins admin broadcast room
  socket.on("join_admin_room", () => {
    if (socket.user?.role === "admin") {
      socket.join("admin_room");
      console.log(`Admin socket ${socket.id} joined admin_room`);
    }
  });

  // Device registration / force logout pattern
  socket.on("register", async () => {
    const cid = socket.user?.candidateId || socket.user?.userId;
    if (!cid) return;

    // Verify session version matches DB before granting socket slot
    try {
      const versionRes = await pool.query(
        "SELECT session_version FROM candidates WHERE id = $1",
        [cid]
      );
      const dbVersion = versionRes.rows[0]?.session_version;
      if (dbVersion !== undefined && dbVersion !== socket.user?.sessionVersion) {
        socket.emit("force_logout", { message: "Logged in elsewhere. Please rejoin." });
        return;
      }
    } catch (err) {
      console.error("Socket register version check failed:", err.message);
    }

    // Kick any currently connected socket for this candidate
    const existingSocketId = userSockets.get(String(cid));
    if (existingSocketId && existingSocketId !== socket.id) {
      io.to(existingSocketId).emit("force_logout", { message: "Logged in from another device." });
    }

    // Register this socket as the authoritative one
    userSockets.set(String(cid), socket.id);

    // Update candidate_sessions socket_id for active sessions
    try {
      await pool.query(
        "UPDATE candidate_sessions SET socket_id = $1 WHERE candidate_id = $2 AND is_submitted = false",
        [socket.id, cid]
      );
    } catch (err) {
      console.error("Failed to update candidate_sessions socket_id:", err.message);
    }
  });

  // Tab visibility events (active timer tracking - server authoritative)
  socket.on("tab_inactive", async ({ sessionId }) => {
    const cid = socket.user?.candidateId || socket.user?.userId;
    if (!cid || !sessionId) return;

    try {
      // Compute elapsed active time since last_active_at and accumulate
      const sessCheck = await pool.query(
        `SELECT cs.last_active_at, cs.end_time, s.is_paused, s.paused_at, s.ended_at
         FROM candidate_sessions cs
         JOIN shifts s ON s.id = cs.shift_id
         WHERE cs.id = $1 AND cs.candidate_id = $2 AND cs.is_submitted = false`,
        [sessionId, cid]
      );
      const row = sessCheck.rows[0];
      if (!row || row.ended_at) return;

      const now = new Date();
      const effectiveNow = (row.is_paused && row.paused_at) ? new Date(row.paused_at) : now;
      const activeDeltaSec = row.last_active_at
        ? Math.max(0, Math.floor((Date.now() - new Date(row.last_active_at).getTime()) / 1000))
        : 0;
      // Calculate true server-side remaining time; NEVER trust client-passed time
      const serverRemainingSec = Math.max(0, Math.floor((new Date(row.end_time).getTime() - effectiveNow.getTime()) / 1000));

      await pool.query(
        `UPDATE candidate_sessions 
         SET tab_is_active = false,
             active_seconds = active_seconds + $1,
             time_remaining_sec = $2
         WHERE id = $3 AND candidate_id = $4 AND is_submitted = false`,
        [activeDeltaSec, serverRemainingSec, sessionId, cid]
      );
    } catch (err) {
      console.error("tab_inactive error:", err.message);
    }
  });

  socket.on("tab_active", async ({ sessionId }) => {
    const cid = socket.user?.candidateId || socket.user?.userId;
    if (!cid || !sessionId) return;

    try {
      const sessRes = await pool.query(
        `SELECT cs.end_time, cs.is_submitted, s.is_paused, s.paused_at, s.ended_at
         FROM candidate_sessions cs
         JOIN shifts s ON s.id = cs.shift_id
         WHERE cs.id = $1 AND cs.candidate_id = $2`,
        [sessionId, cid]
      );
      if (sessRes.rows.length > 0) {
        const sess = sessRes.rows[0];
        if (sess.is_submitted || sess.ended_at) return;

        const now = new Date();
        const effectiveNow = (sess.is_paused && sess.paused_at) ? new Date(sess.paused_at) : now;
        // Calculate true server-side remaining time
        const remSec = Math.max(0, Math.floor((new Date(sess.end_time).getTime() - effectiveNow.getTime()) / 1000));

        await pool.query(
          `UPDATE candidate_sessions 
           SET tab_is_active = true, 
               last_active_at = $1,
               time_remaining_sec = $2
           WHERE id = $3 AND candidate_id = $4 AND is_submitted = false`,
          [now, remSec, sessionId, cid]
        );

        socket.emit("time_sync", { timeRemainingSec: remSec, endTime: sess.end_time });
      }
    } catch (err) {
      console.error("tab_active error:", err.message);
    }
  });

  // Live answer and mark sync (authoritative socket & session-guarded)
  socket.on("answer_sync", async ({ questionId, selectedOpt }) => {
    const cid = socket.user?.candidateId || socket.user?.userId;
    if (!cid || !questionId) return;

    // Authoritative socket guard: only the active device socket can sync answers
    if (userSockets.get(String(cid)) !== socket.id) {
      socket.emit("force_logout", { message: "Session taken over on another device." });
      return;
    }

    const cleanOpt = selectedOpt !== null && selectedOpt !== undefined
      ? selectedOpt.toString().toLowerCase().trim()
      : null;

    if (cleanOpt !== null && !['a', 'b', 'c', 'd'].includes(cleanOpt)) return;

    try {
      // Validate active session state: not submitted, not paused, shift active, deadline not expired
      const sessRes = await pool.query(
        `SELECT cs.end_time, cs.is_submitted, s.is_paused, s.paused_at, s.ended_at
         FROM candidate_sessions cs
         JOIN shifts s ON s.id = cs.shift_id
         WHERE cs.candidate_id = $1
         ORDER BY cs.id DESC LIMIT 1`,
        [cid]
      );
      const sess = sessRes.rows[0];
      if (!sess || sess.is_submitted || sess.ended_at || sess.is_paused) return;

      const effectiveNow = (sess.is_paused && sess.paused_at) ? new Date(sess.paused_at) : new Date();
      if (effectiveNow.getTime() > new Date(sess.end_time).getTime() + 5000) return;

      const answeredAt = cleanOpt ? new Date() : null;
      const updateRes = await pool.query(
        `UPDATE candidate_questions
         SET selected_opt = $1,
             answered_at = $2
         WHERE candidate_id = $3 AND question_id = $4
         RETURNING question_id, selected_opt`,
        [cleanOpt, answeredAt, cid, questionId]
      );

      if (updateRes.rows.length > 0) {
        socket.emit("answer_saved", {
          questionId: parseInt(questionId, 10),
          selectedOpt: cleanOpt,
        });
      }
    } catch (err) {
      console.error("answer_sync error:", err.message);
    }
  });

  socket.on("mark_sync", async ({ questionId, isMarked }) => {
    const cid = socket.user?.candidateId || socket.user?.userId;
    if (!cid || !questionId) return;

    // Authoritative socket guard: only the active device socket can sync marks
    if (userSockets.get(String(cid)) !== socket.id) {
      socket.emit("force_logout", { message: "Session taken over on another device." });
      return;
    }

    try {
      // Validate active session state
      const sessRes = await pool.query(
        `SELECT cs.end_time, cs.is_submitted, s.is_paused, s.paused_at, s.ended_at
         FROM candidate_sessions cs
         JOIN shifts s ON s.id = cs.shift_id
         WHERE cs.candidate_id = $1
         ORDER BY cs.id DESC LIMIT 1`,
        [cid]
      );
      const sess = sessRes.rows[0];
      if (!sess || sess.is_submitted || sess.ended_at || sess.is_paused) return;

      const effectiveNow = (sess.is_paused && sess.paused_at) ? new Date(sess.paused_at) : new Date();
      if (effectiveNow.getTime() > new Date(sess.end_time).getTime() + 5000) return;

      const updateRes = await pool.query(
        `UPDATE candidate_questions
         SET is_marked = $1
         WHERE candidate_id = $2 AND question_id = $3
         RETURNING question_id, is_marked`,
        [Boolean(isMarked), cid, questionId]
      );

      if (updateRes.rows.length > 0) {
        socket.emit("mark_saved", {
          questionId: parseInt(questionId, 10),
          isMarked: Boolean(isMarked),
        });
      }
    } catch (err) {
      console.error("mark_sync error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    const cid = socket.user?.candidateId || socket.user?.userId;
    if (cid && userSockets.get(String(cid)) === socket.id) {
      userSockets.delete(String(cid));
    }
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = { app, server };
