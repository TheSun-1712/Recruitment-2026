# Contest Timer Architecture & Security Audit Report

> **Target Platform:** Opulence / Grand Prix (GP) Ultimate Quiz Platform  
> **Topic:** Server-Authoritative Contest Timer Architecture & Cross-Device Synchronization  
> **Document Type:** System Audit & Reusable Implementation Blueprint  

---

## Executive Summary

In competitive programming and timed quiz platforms, relying on the client's browser clock to track contest duration is one of the most common critical vulnerabilities. This report audits how this platform implements **absolute server-side time tracking**, preventing:
- Timer resets on page reload.
- Timer restarts when continuing on another device.
- Timer freezing / drifting when browser tabs are throttled, minimized, or when laptops sleep.
- Client-side tampering via browser DevTools or memory injection.
- Unfair advantages during contest pauses and resumes.

---

## 1. The Naive Approach vs. This Platform's Architecture

### The Naive (Client-Centric) Flaw
Many platforms store a duration variable in memory or localStorage:
```javascript
// ❌ VULNERABLE APPROACH
let timeLeft = 3600; // 60 minutes
setInterval(() => {
    timeLeft--;
}, 1000);
```
**Why this fails:**
1. **Page Reload:** Re-executing the script resets `timeLeft` back to 3600 seconds.
2. **Device Switching:** A different laptop has no local state and starts fresh with full time.
3. **Tab Inactivity:** Browsers (Chrome, Firefox, Safari) throttle background tabs to 1 execution per minute or freeze `setInterval` completely during sleep mode, giving inactive users extra time.
4. **Tampering:** A participant can open DevTools and run `timeLeft = 999999` in the console.

---

### The Platform's Paradigm: Absolute Deadline Timestamps

Instead of tracking *"how many seconds remain"*, this platform tracks a single **immutable absolute deadline (`end_time`) stored in PostgreSQL**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              POSTGRESQL DB                                  │
│                                                                             │
│  dsa_sessions / cascade_sessions / user_sessions                            │
│  ├── user_id: 42                                                            │
│  ├── join_time: 2026-09-11 10:00:00 UTC                                     │
│  └── end_time:  2026-09-11 12:00:00 UTC   <── ABSOLUTE FIXED DEADLINE       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
     [ API Request: /join ]                       [ API Request: /submit ]
Server computes on the fly:                  Server checks against system clock:
timeLeft = end_time - NOW()                  if (NOW() > end_time) -> REJECT 403
```

#### 1. Session Creation (`server/routes/dsa.js`, `cascade.js`, `rapidfire.js`)
When a user joins a round for the first time:
```javascript
const now = new Date();
const endTime = new Date(now.getTime() + CONTEST_DURATION_MINUTES * 60 * 1000);

await pool.query(
    "INSERT INTO dsa_sessions(user_id, join_time, end_time) VALUES ($1, $2, $3)",
    [user.id, now, endTime]
);
```

#### 2. Delivering Time to Client
The server computes the remaining delta in seconds at that exact instant:
```javascript
const totalTimeLeft = Math.max(0, Math.floor((new Date(session.end_time) - now) / 1000));

res.json({
    totalTimeLeft,
    endTime: session.end_time,
    // ...
});
```
> **Key Takeaway:** The client's browser is treated solely as a display terminal. It has zero authority over time calculation or session validity.

---

## 2. In-Depth Audit: Real-World Scenarios

### Scenario 1: Page Reload / Refresh
* **Question:** If the participant reloads the page, does the timer reset back to 60 or 120 minutes?
* **Answer:** **No.**
* **Mechanism:**
  1. On component mount (`client/src/pages/DSAContest.jsx` -> `initSession`), the client posts its token to `/<round>/join`.
  2. The server queries the database for existing sessions:
     ```sql
     SELECT * FROM dsa_sessions WHERE user_id = $1 ORDER BY join_time DESC LIMIT 1;
     ```
  3. If a session exists, the server checks:
     * `if (session.completed) -> 403 Forbidden`
     * `if (new Date(session.end_time) < now) -> 403 ("Contest has ended for this user")`
  4. If still valid, it calculates the *exact remaining seconds* based on `(session.end_time - now)`.
* **Example:** If a participant joins a 60-minute round, closes their browser for 25 minutes, and reopens it, the server responds with `2100` seconds (35 minutes remaining). If 61 minutes have passed, they are permanently locked out.

---

### Scenario 2: Switching to Another Device / Incognito
* **Question:** If the participant opens the contest on another laptop or phone, does the timer reset or allow double-submission?
* **Answer:** **No.**
* **Mechanism:**
  1. The user's account (`user.id`) maps to the single row in PostgreSQL with the original `end_time`.
  2. The new device queries the same database row and gets the exact same remaining time.
  3. **Single Active Device Eviction (Session Versioning):**
     To prevent multiple people from attempting questions concurrently:
     ```javascript
     // 1. Increment session_version in database (invalidates old JWT)
     const versionRes = await pool.query(
         'UPDATE users SET session_version = session_version + 1 WHERE id = $1 RETURNING session_version',
         [user.id]
     );

     // 2. Terminate existing WebSocket connection on previous device
     const existingSocketId = userSockets?.get(String(user.id));
     if (existingSocketId && io) {
         io.to(existingSocketId).emit('force_logout');
     }
     ```
     The first device instantly receives a `force_logout` event and is booted back to the login screen with the message: *"Your session was taken over on another device."*

---

### Scenario 3: Tab Out of Focus / Minimizing / Laptop Sleep
* **Question:** What happens when the browser tab is minimized, switched, or throttled?
* **Answer:** **The timer never freezes or drifts.**
* **Mechanism:**
  Modern browsers suspend or throttle background intervals to conserve battery. The platform counters this using two layers of protection:

  #### Layer A: Client-Side Re-sync via Page Visibility API
  In `client/src/pages/RapidfireContest.jsx` and `DSAContest.jsx`:
  ```javascript
  useEffect(() => {
      const handleVisibilityChange = async () => {
          if (document.visibilityState !== 'visible') return;
          // Tab regained focus: immediately re-sync with server clock
          await handleTimeReSync();
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
  ```

  #### Layer B: Dedicated Lightweight Time-Check Endpoint
  ```javascript
  // Server-side: POST /<round>/time-check
  const sessionRes = await pool.query(
      "SELECT end_time FROM dsa_sessions WHERE user_id = $1",
      [userId]
  );
  const totalTimeLeft = Math.max(0, Math.floor((new Date(sessionRes.rows[0].end_time) - effectiveNow) / 1000));
  res.json({ totalTimeLeft, isPaused });
  ```
  Whenever the user clicks back onto the tab, the client silently queries `/time-check` and instantly snaps the displayed timer to the real elapsed time.

  #### Layer C: Server-Side Submission Gatekeeping (Zero-Trust Enforcement)
  Even if a participant blocks the visibility listener or modifies client JavaScript variables:
  ```javascript
  // server/routes/dsa.js (POST /submit-result)
  if (new Date(session.end_time) < new Date()) {
      return res.status(403).json({ error: "Contest has ended" });
  }
  ```
  Any code submission received after `session.end_time` is rejected by the server with HTTP `403`.

---

### Scenario 4: Admin Pause and Resume (Fair Time Shift)
* **Question:** What happens if the contest is paused mid-way due to technical difficulties or announcements?
* **Answer:** **Timers freeze without decaying, and deadlines are shifted forward atomically in PostgreSQL.**
* **Mechanism:**
  1. **When Paused (`POST /admin/pause-round`):**
     * Database records: `round_control SET is_paused = true, paused_at = NOW()`.
     * Socket broadcasts `round_paused`.
     * Clients stop their local `setInterval`.
     * Any subsequent `/time-check` call uses `effectiveNow = pausedAt`, preventing time decay during the pause:
       ```javascript
       const effectiveNow = (isPaused && pausedAt) ? pausedAt : now;
       ```
  2. **When Resumed (`POST /admin/resume-round`):**
     * The server calculates the exact elapsed pause duration:
       ```javascript
       const pauseDurationMs = now - pausedAt;
       ```
     * It runs an atomic SQL interval shift across all active sessions:
       ```sql
       UPDATE dsa_sessions
       SET end_time = end_time + ($1 || ' milliseconds')::interval
       WHERE end_time > $2;
       ```
     * In Rapidfire, question-level `start_time` timestamps are shifted forward as well:
       ```sql
       UPDATE user_questions
       SET start_time = start_time + ($1 || ' milliseconds')::interval
       WHERE start_time IS NOT NULL AND status NOT IN ('ACCEPTED', 'TIMEOUT');
       ```
     * Socket emits `round_resumed`, causing clients to call `/time-check` and resume without losing a single second.

---

### Scenario 5: Two-Tier Timers (Contest Duration vs. Per-Question Duration)
In the Rapid Fire round, participants face a 50-minute overall contest timer **and** an independent 5-minute (300-second) timer for each question.
* `user_questions` records `start_time = NOW()` when the question is opened.
* When evaluating submissions (`server/routes/rapidfire.js`):
  ```javascript
  const SCORING_GRACE_SECONDS = 10; // Absorbs queue wait & judge execution latency
  const elapsed = (now - new Date(question.start_time)) / 1000;

  if (elapsed > QUESTION_DURATION + SCORING_GRACE_SECONDS) {
      await pool.query(
          "UPDATE user_questions SET status = 'TIMEOUT' WHERE user_id = $1 AND question_id = $2",
          [userId, questionId]
      );
      return res.status(403).json({ error: "Question timer expired", scoreAwarded: 0 });
  }
  ```
  If a user disconnects their network, solves the question locally, and reconnects after 10 minutes, the server computes `elapsed = 600s > 310s` and rejects the submission with `TIMEOUT`.

---

## 3. Blueprint: How to Implement This on Another Platform

Follow this 5-step blueprint to implement this robust timer architecture on any web application.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       REUSABLE ARCHITECTURAL PATTERN                        │
│                                                                             │
│  1. Database Schema  ──▶ Store started_at & expires_at (TIMESTAMPTZ)        │
│  2. Session Start    ──▶ INSERT / SELECT session; return (expires_at - now) │
│  3. Client Ticker    ──▶ Pure display decrement; re-sync on visibilitychange│
│  4. Submission Gate  ──▶ if (now > expires_at + grace) -> 403 Forbidden     │
│  5. Pause / Resume   ──▶ Shift expires_at by pause duration via SQL interval│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step 1: Database Schema
Never store remaining seconds as an integer in the database. Always store absolute timestamps with time zones:
```sql
CREATE TABLE contest_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    contest_id INT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    session_version INT DEFAULT 1,
    UNIQUE(user_id, contest_id)
);
```

### Step 2: Join / Resume API Endpoint (`POST /api/contest/join`)
```javascript
app.post('/api/contest/join', authenticateUser, async (req, res) => {
    const { userId, contestId } = req.user;
    const now = new Date();

    // Check for an existing session
    let session = await db.query(
        'SELECT * FROM contest_sessions WHERE user_id = $1 AND contest_id = $2',
        [userId, contestId]
    );

    if (session.rows.length === 0) {
        // First-time entry: compute absolute deadline
        const expiresAt = new Date(now.getTime() + CONTEST_DURATION_MINUTES * 60 * 1000);
        const insertRes = await db.query(
            'INSERT INTO contest_sessions (user_id, contest_id, started_at, expires_at) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, contestId, now, expiresAt]
        );
        session = insertRes.rows[0];
    } else {
        session = session.rows[0];
    }

    if (session.is_completed) {
        return res.status(403).json({ error: 'Contest already completed.' });
    }

    // Check expiration against server clock
    if (new Date(session.expires_at) <= now) {
        return res.status(403).json({ error: 'Contest has ended.' });
    }

    // Compute remaining seconds server-side
    const remainingSeconds = Math.max(0, Math.floor((new Date(session.expires_at) - now) / 1000));

    res.json({
        expiresAt: session.expires_at,
        remainingSeconds
    });
});
```

### Step 3: Client Timer Hook (React Example)
```jsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export function useContestTimer(initialSeconds, onExpire) {
    const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
    const isExpiredRef = useRef(false);

    // 1. Local ticker for smooth 1-second display decrements
    useEffect(() => {
        if (secondsLeft <= 0) {
            if (!isExpiredRef.current) {
                isExpiredRef.current = true;
                onExpire?.();
            }
            return;
        }

        const interval = setInterval(() => {
            setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [secondsLeft]);

    // 2. Re-sync with server whenever the tab becomes visible
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState !== 'visible' || isExpiredRef.current) return;
            try {
                const res = await axios.get('/api/contest/time-check');
                if (res.data.remainingSeconds <= 0) {
                    setSecondsLeft(0);
                    isExpiredRef.current = true;
                    onExpire?.();
                } else {
                    setSecondsLeft(res.data.remainingSeconds);
                }
            } catch (err) {
                console.error('Time check failed', err);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    return secondsLeft;
}
```

### Step 4: Submission Validation Endpoint (`POST /api/contest/submit`)
```javascript
app.post('/api/contest/submit', authenticateUser, async (req, res) => {
    const { userId, contestId, code } = req.body;
    const now = new Date();

    const sessionRes = await db.query(
        'SELECT expires_at, is_completed FROM contest_sessions WHERE user_id = $1 AND contest_id = $2',
        [userId, contestId]
    );

    if (sessionRes.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionRes.rows[0];

    // Buffer for network transit & queue delays (5 to 10 seconds)
    const NETWORK_GRACE_MS = 8000;
    const deadline = new Date(session.expires_at).getTime() + NETWORK_GRACE_MS;

    if (now.getTime() > deadline) {
        return res.status(403).json({ error: 'Submission rejected: Time has expired.' });
    }

    // Proceed to judge code...
});
```

### Step 5: Pause and Resume Atomic Shift
```javascript
// On Admin Pause
await db.query("UPDATE contest_metadata SET is_paused = TRUE, paused_at = NOW() WHERE id = $1", [contestId]);
socketServer.emit("contest_paused");

// On Admin Resume
const pauseRow = await db.query("SELECT paused_at FROM contest_metadata WHERE id = $1", [contestId]);
const pauseDurationMs = Date.now() - new Date(pauseRow.rows[0].paused_at).getTime();

// Atomic shift of all active sessions
await db.query(`
    UPDATE contest_sessions
    SET expires_at = expires_at + ($1 || ' milliseconds')::interval
    WHERE contest_id = $2 AND expires_at > $3
`, [pauseDurationMs, contestId, pauseRow.rows[0].paused_at]);

await db.query("UPDATE contest_metadata SET is_paused = FALSE, paused_at = NULL WHERE id = $1", [contestId]);
socketServer.emit("contest_resumed");
```

---

## 4. Summary Matrix

| Threat / Event | Naive Client-Timer Platform | This Server-Authoritative Architecture |
|---|---|---|
| **Page Refresh** | Resets timer back to initial duration | Re-queries server DB; calculates `end_time - now` |
| **Device Switching** | Fresh timer starts on device 2 | Reads same DB record + triggers `force_logout` on device 1 |
| **Background Tab Throttling** | Timer slows down / grants free time | Snaps to exact server time on `visibilitychange` |
| **DevTools Tampering** | Easy score / time cheat | Rejected by server on submission (`403 Contest Ended`) |
| **Contest Pause / Emergency** | Inconsistent across participants | Pauses decay + shifts `end_time` by pause duration |
