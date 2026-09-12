/**
 * extract_data.js
 *
 * Run this ONCE locally to bake contest data into src/data/stats.json.
 * Requires the main-db Docker container to be running.
 *
 * Usage:
 *   node extract_data.js
 *
 * The script connects to PostgreSQL via the docker exec command and writes
 * src/data/stats.json — the Vite app then bundles this as static data.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const OUT_FILE = path.join(__dirname, "src", "data", "stats.json");

function sql(query) {
    const escaped = query.replace(/'/g, "'\\''");
    const result = execSync(
        `docker exec -i main-db psql -U postgres -d contest_db -t -A -F '|' -c '${escaped}'`,
        { encoding: "utf8" }
    );
    return result
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
}

function parseRows(lines, cols) {
    return lines.map((line) => {
        const parts = line.split("|");
        const obj = {};
        cols.forEach((c, i) => {
            obj[c] = parts[i] ?? null;
        });
        return obj;
    });
}

console.log("🔍 Fetching users...");
const userLines = sql(`
  SELECT u.id, u.username, u.team_name,
         u.rapidfire_score, u.cascade_score, u.dsa_score,
         (u.rapidfire_score + u.cascade_score + u.dsa_score) AS total_score
  FROM users u
  ORDER BY total_score DESC, u.username ASC
`);
const users = parseRows(userLines, [
    "id", "username", "team_name",
    "rapidfire_score", "cascade_score", "dsa_score", "total_score"
]);

// Assign ranks
users.forEach((u, i) => { u.rank = i + 1; });

console.log(`  → ${users.length} users found`);

// ── Rapidfire: user_sessions ──
console.log("🔍 Fetching rapidfire sessions...");
const rfSessionLines = sql(`
  SELECT s.user_id, s.join_time, s.end_time, s.completed,
         EXTRACT(EPOCH FROM (s.end_time - s.join_time)) AS duration_secs
  FROM user_sessions s
`);
const rfSessions = {};
parseRows(rfSessionLines, ["user_id", "join_time", "end_time", "completed", "duration_secs"])
    .forEach((r) => { rfSessions[r.user_id] = r; });

// ── Rapidfire: per-question ──
console.log("🔍 Fetching rapidfire question results...");
const rfQLines = sql(`
  SELECT uq.user_id, uq.sequence_order, uq.status, uq.score_awarded, q.title
  FROM user_questions uq
  JOIN questions q ON q.id = uq.question_id
  ORDER BY uq.user_id, uq.sequence_order
`);
const rfQuestions = {};
parseRows(rfQLines, ["user_id", "sequence_order", "status", "score_awarded", "title"])
    .forEach((r) => {
        if (!rfQuestions[r.user_id]) rfQuestions[r.user_id] = [];
        rfQuestions[r.user_id].push(r);
    });

// ── Cascade: sessions ──
console.log("🔍 Fetching cascade sessions...");
const csSessionLines = sql(`
  SELECT s.user_id, s.join_time, s.end_time, s.completed,
         s.current_streak, s.max_streak,
         s.highest_forward_index, s.streak_bonus_applied
  FROM cascade_sessions s
`);
const csSessions = {};
parseRows(csSessionLines, [
    "user_id", "join_time", "end_time", "completed",
    "current_streak", "max_streak", "highest_forward_index", "streak_bonus_applied"
]).forEach((r) => { csSessions[r.user_id] = r; });

// ── Cascade: per-question ──
console.log("🔍 Fetching cascade question results...");
const csQLines = sql(`
  SELECT cuq.user_id, cuq.sequence_order, cuq.status,
         cuq.score_awarded, cuq.is_streak_eligible, q.title
  FROM cascade_user_questions cuq
  JOIN questions q ON q.id = cuq.question_id
  ORDER BY cuq.user_id, cuq.sequence_order
`);
const csQuestions = {};
parseRows(csQLines, ["user_id", "sequence_order", "status", "score_awarded", "is_streak_eligible", "title"])
    .forEach((r) => {
        if (!csQuestions[r.user_id]) csQuestions[r.user_id] = [];
        csQuestions[r.user_id].push(r);
    });

// ── DSA: sessions ──
console.log("🔍 Fetching DSA sessions...");
const dsaSessionLines = sql(`
  SELECT s.user_id, s.join_time, s.end_time, s.completed,
         s.total_score, s.last_score_update,
         EXTRACT(EPOCH FROM (s.end_time - s.join_time)) AS duration_secs
  FROM dsa_sessions s
`);
const dsaSessions = {};
parseRows(dsaSessionLines, [
    "user_id", "join_time", "end_time", "completed",
    "total_score", "last_score_update", "duration_secs"
]).forEach((r) => { dsaSessions[r.user_id] = r; });

// ── DSA: per-question ──
console.log("🔍 Fetching DSA question results...");
const dsaQLines = sql(`
  SELECT duq.user_id, duq.sequence_order, duq.status,
         duq.score_awarded, duq.passed_count, duq.base_points, q.title
  FROM dsa_user_questions duq
  JOIN questions q ON q.id = duq.question_id
  ORDER BY duq.user_id, duq.sequence_order
`);
const dsaQuestions = {};
parseRows(dsaQLines, ["user_id", "sequence_order", "status", "score_awarded", "passed_count", "base_points", "title"])
    .forEach((r) => {
        if (!dsaQuestions[r.user_id]) dsaQuestions[r.user_id] = [];
        dsaQuestions[r.user_id].push(r);
    });

// ── Disqualifications ──
console.log("🔍 Fetching disqualifications...");
const dqLines = sql(`
  SELECT team_name, round, violations, logged_at FROM disqualification_log
`);
const dqMap = {};
parseRows(dqLines, ["team_name", "round", "violations", "logged_at"]).forEach((r) => {
    if (!dqMap[r.team_name]) dqMap[r.team_name] = [];
    dqMap[r.team_name].push(r);
});

// ── Assemble ──
console.log("🛠  Assembling final stats...");
const stats = users.map((u) => ({
    id: parseInt(u.id),
    username: u.username,
    team_name: u.team_name || u.username,
    rank: u.rank,
    rapidfire_score: parseFloat(u.rapidfire_score) || 0,
    cascade_score: parseFloat(u.cascade_score) || 0,
    dsa_score: parseFloat(u.dsa_score) || 0,
    total_score: parseFloat(u.total_score) || 0,
    rapidfire: {
        session: rfSessions[u.id] || null,
        questions: (rfQuestions[u.id] || []).map((q) => ({
            sequence_order: parseInt(q.sequence_order),
            title: q.title,
            status: q.status,
            score_awarded: parseFloat(q.score_awarded) || 0,
        })),
    },
    cascade: {
        session: csSessions[u.id]
            ? {
                ...csSessions[u.id],
                max_streak: parseInt(csSessions[u.id].max_streak) || 0,
                current_streak: parseInt(csSessions[u.id].current_streak) || 0,
                streak_bonus_applied: csSessions[u.id].streak_bonus_applied === "t",
                completed: csSessions[u.id].completed === "t",
            }
            : null,
        questions: (csQuestions[u.id] || []).map((q) => ({
            sequence_order: parseInt(q.sequence_order),
            title: q.title,
            status: q.status,
            score_awarded: parseFloat(q.score_awarded) || 0,
            is_streak_eligible: q.is_streak_eligible === "t",
        })),
    },
    dsa: {
        session: dsaSessions[u.id]
            ? {
                ...dsaSessions[u.id],
                total_score: parseInt(dsaSessions[u.id].total_score) || 0,
                completed: dsaSessions[u.id].completed === "t",
                duration_secs: parseFloat(dsaSessions[u.id].duration_secs) || 0,
            }
            : null,
        questions: (dsaQuestions[u.id] || []).map((q) => ({
            sequence_order: parseInt(q.sequence_order),
            title: q.title,
            status: q.status,
            score_awarded: parseInt(q.score_awarded) || 0,
            passed_count: parseInt(q.passed_count) || 0,
            base_points: parseInt(q.base_points) || 0,
        })),
    },
    disqualifications: dqMap[u.team_name] || [],
}));

const outDir = path.dirname(OUT_FILE);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(OUT_FILE, JSON.stringify(stats, null, 2));
console.log(`✅ Written ${stats.length} team records → ${OUT_FILE}`);
