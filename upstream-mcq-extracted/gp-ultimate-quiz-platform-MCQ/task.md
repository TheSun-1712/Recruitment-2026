# Current task — Exam Scheduling, Shifts & Grading plan

## Question Bank & scoring enhancements

- [x] Add inline Subject and Topic creation controls to the question editor.
- [x] Add per-question correct marks and wrong-answer deduction fields (defaults: +1 / -0).
- [x] Persist marks in single-question and bulk imports, and show them in the question bank.
- [x] Calculate manual and auto-submitted scores from per-question marks; store each result's total marks.
- [x] Show score denominators and per-question mark outcomes in results.
- [x] Verify: client production build, question-editor lint, and backend syntax checks pass.
- [x] Validate bulk-import topic IDs before insertion and show the valid active-exam topics for failed rows.
- [x] Repair missing unique constraint for idempotent result submission; verified `results(candidate_id, shift_id)`.
- [x] Verify: applied `server/scripts/migration_v2.sql`; marks and result total-marks columns exist in the target database.

## Workstream F — Paper Generator: Relax rigid constraints

- [x] F1: API accepts and validates selected `shift_ids`; legacy `num_shifts` remains supported.
- [x] F1: Paper Generator uses a checkbox list so admins choose the exact shifts to generate.
- [x] F2: API supports `allow_question_reuse`; strict mode prevents reuse in other shifts of the same exam.
- [x] F2: Migration drops the old global `shift_questions.question_id` unique constraint while retaining per-shift uniqueness.
- [x] F2: UI exposes the question-reuse option and validates the pool in the matching mode.
- [x] F3: Weightage/target mismatch returns an acknowledgement requirement and uses the weightage total when accepted.
- [x] F3: UI shows the mismatch warning and explicit proceed control.
- [x] F4: Weightage updates are no longer blocked after papers exist; the API and UI warn that regeneration is required.
- [x] Verify: client production build and backend route syntax checks pass.
- [/] Verify: client-wide lint was run; it remains blocked by 33 pre-existing errors in unrelated files (the new Paper Generator code has no lint errors).
- [/] Verify: applied `server/scripts/migration_v2.sql`; paper-generation live API smoke tests remain.

## Earlier unrelated `sample_input` task

The previous checklist below is retained for reference; it is not part of the current Workstream F task.

- [x] Research backend routes to understand question query structure
- [x] Check DB schema for `sample_input` field
- [x] Write & audit implementation plan
- [/] Execute: Add `sample_input` column to DB via migration SQL
- [ ] Execute: Update 3 backend routes to include `sample_input` in SELECT queries
  - [ ] Update rapidfire.js (2 SELECT queries)
  - [ ] Update cascade.js (2 SELECT queries)
  - [ ] Update dsa.js (2 SELECT queries)
- [ ] Execute: Update 3 frontend contest pages
  - [ ] Update RapidfireContest.jsx
  - [ ] Update DSAContest.jsx
  - [ ] Update CascadeContest.jsx
- [ ] Verify changes work correctly
