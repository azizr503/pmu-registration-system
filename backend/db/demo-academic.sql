-- Demo sections, grades, registrations, announcements, settings (INSERT OR IGNORE / REPLACE).
-- Course IDs: c-<CODE> (e.g. c-GEIT1411). Requires users, students, faculty from seed / data/users.json
-- and full catalog from backend/db/pmu-course-catalog.json (via seed or migrate).

INSERT OR IGNORE INTO sections (id, course_id, faculty_id, semester, days, start_time, end_time, room, capacity, enrolled_count) VALUES
('sec-f25-GEIT1411', 'c-GEIT1411', 'u-f1', 'Fall 2025', 'Sun,Tue', '08:00', '09:30', 'GEIT-A101', 35, 28),
('sec-f25-GEIT1412', 'c-GEIT1412', 'u-f1', 'Fall 2025', 'Sun,Tue', '10:00', '11:30', 'GEIT-A102', 35, 28),
('sec-f25-COMM1311', 'c-COMM1311', 'u-f2', 'Fall 2025', 'Mon,Wed', '09:00', '10:30', 'COMM-E101', 35, 28),
('sec-sp26-GEIT1411', 'c-GEIT1411', 'u-f1', 'Spring 2026', 'Sun,Tue', '08:00', '09:30', 'GEIT-A101', 35, 0),
('sec-sp26-GEIT1412', 'c-GEIT1412', 'u-f1', 'Spring 2026', 'Sun,Tue', '10:00', '11:30', 'GEIT-A102', 35, 0),
('sec-sp26-GEIT2421', 'c-GEIT2421', 'u-f1', 'Spring 2026', 'Mon,Wed', '08:00', '09:30', 'GEIT-B201', 35, 0),
('sec-sp26-GEIT2331', 'c-GEIT2331', 'u-f1', 'Spring 2026', 'Mon,Wed', '10:00', '11:30', 'GEIT-B202', 35, 0),
('sec-sp26-GEIT3341', 'c-GEIT3341', 'u-f1', 'Spring 2026', 'Sun,Tue', '14:00', '15:30', 'GEIT-C301', 35, 0),
('sec-sp26-GEIT3331', 'c-GEIT3331', 'u-f1', 'Spring 2026', 'Mon,Wed', '14:00', '15:30', 'GEIT-C302', 35, 0),
('sec-sp26-GEIT3351', 'c-GEIT3351', 'u-f1', 'Spring 2026', 'Tue,Thu', '08:00', '09:30', 'GEIT-D401', 35, 0),
('sec-sp26-MATH1422', 'c-MATH1422', 'u-f1', 'Spring 2026', 'Sun,Tue', '12:00', '13:30', 'MATH-M101', 35, 0),
('sec-sp26-MATH1423', 'c-MATH1423', 'u-f1', 'Spring 2026', 'Mon,Wed', '12:00', '13:30', 'MATH-M102', 35, 0),
('sec-sp26-MATH2313', 'c-MATH2313', 'u-f1', 'Spring 2026', 'Tue,Thu', '10:00', '11:30', 'MATH-M201', 35, 0),
('sec-sp26-COSC3351', 'c-COSC3351', 'u-f1', 'Spring 2026', 'Sun,Tue', '16:00', '17:30', 'COSC-LAB1', 35, 0),
('sec-sp26-COSC4361', 'c-COSC4361', 'u-f1', 'Spring 2026', 'Mon,Wed', '16:00', '17:30', 'COSC-LAB2', 35, 0),
('sec-sp26-COSC4362', 'c-COSC4362', 'u-f1', 'Spring 2026', 'Tue,Thu', '14:00', '15:30', 'COSC-AI01', 35, 0);

INSERT OR IGNORE INTO grades (id, student_id, section_id, midterm, final, assignment, calculated_grade, override_grade, letter_grade, submitted_at, is_final) VALUES
('g1', 'u-s1', 'sec-f25-GEIT1411', 88, 92, 90, 90, NULL, 'A-', datetime('now'), 1),
('g2', 'u-s1', 'sec-f25-GEIT1412', 82, 85, 80, 83.25, NULL, 'B', datetime('now'), 1),
('g3', 'u-s1', 'sec-f25-COMM1311', 90, 88, 92, 90, NULL, 'A-', datetime('now'), 1);

INSERT OR IGNORE INTO registrations (id, student_id, section_id, semester, status, registered_at, attendance_pct) VALUES
('r1', 'u-s1', 'sec-sp26-COSC4361', 'Spring 2026', 'registered', datetime('now'), 96),
('r2', 'u-s1', 'sec-sp26-COSC4362', 'Spring 2026', 'registered', datetime('now'), 100),
('r3', 'u-s2', 'sec-sp26-GEIT2421', 'Spring 2026', 'registered', datetime('now'), 92);

INSERT OR IGNORE INTO announcements (id, title, content, target_role, created_by, created_at) VALUES
('a1', 'Spring 2026 Registration is OPEN', 'Register early for the best schedule. Maximum 18 credit hours.', 'student', 'u-admin', datetime('now')),
('a2', 'Faculty: Submit midterm grades reminder', 'Please ensure grade submission deadlines are met for all sections.', 'faculty', 'u-admin', datetime('now'));

INSERT OR REPLACE INTO registration_settings (id, is_open, semester_label, start_date, end_date, max_credits)
VALUES (1, 1, 'Spring 2026', '2026-01-15', '2026-02-15', 18);

UPDATE sections SET enrolled_count = (
  SELECT COUNT(*) FROM registrations r WHERE r.section_id = sections.id AND r.status = 'registered'
);
