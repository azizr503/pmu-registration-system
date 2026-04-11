-- Demo sections, grades, registrations, announcements, settings (INSERT OR IGNORE / REPLACE).
-- Requires users, students, faculty, and courses (same IDs as seed / data/users.json + data/courses.json).

INSERT OR IGNORE INTO sections (id, course_id, faculty_id, semester, days, start_time, end_time, room, capacity, enrolled_count) VALUES
('sec-f25-cs101', 'c-cs101', 'u-f1', 'Fall 2025', 'Sun,Tue', '08:00', '09:30', 'A-101', 40, 35),
('sec-f25-cs201', 'c-cs201', 'u-f1', 'Fall 2025', 'Sun,Tue', '10:00', '11:30', 'B-201', 35, 30),
('sec-f25-eng101', 'c-eng101', 'u-f2', 'Fall 2025', 'Mon,Wed', '09:00', '10:30', 'E-101', 45, 40),
('sec-sp26-cs101', 'c-cs101', 'u-f1', 'Spring 2026', 'Sun,Tue', '08:00', '09:30', 'A-101', 40, 0),
('sec-sp26-cs201-a', 'c-cs201', 'u-f1', 'Spring 2026', 'Sun,Tue', '10:00', '11:30', 'B-201', 35, 0),
('sec-sp26-cs201-b', 'c-cs201', 'u-f1', 'Spring 2026', 'Mon,Wed', '14:00', '15:30', 'B-205', 35, 0),
('sec-sp26-cs301', 'c-cs301', 'u-f1', 'Spring 2026', 'Mon,Wed', '10:00', '11:30', 'C-301', 30, 0),
('sec-sp26-cs401', 'c-cs401', 'u-f1', 'Spring 2026', 'Sun,Tue', '14:00', '15:30', 'C-401', 28, 0),
('sec-sp26-math201', 'c-math201', 'u-f2', 'Spring 2026', 'Sun,Tue', '10:00', '11:30', 'M-201', 40, 0),
('sec-sp26-eng101', 'c-eng101', 'u-f2', 'Spring 2026', 'Mon,Wed', '08:00', '09:30', 'E-101', 45, 0);

INSERT OR IGNORE INTO grades (id, student_id, section_id, midterm, final, assignment, calculated_grade, override_grade, letter_grade, submitted_at, is_final) VALUES
('g1', 'u-s1', 'sec-f25-cs101', 88, 92, 90, 90, NULL, 'A-', datetime('now'), 1),
('g2', 'u-s1', 'sec-f25-cs201', 82, 85, 80, 83.25, NULL, 'B', datetime('now'), 1),
('g3', 'u-s1', 'sec-f25-eng101', 90, 88, 92, 90, NULL, 'A-', datetime('now'), 1);

INSERT OR IGNORE INTO registrations (id, student_id, section_id, semester, status, registered_at, attendance_pct) VALUES
('r1', 'u-s1', 'sec-sp26-cs301', 'Spring 2026', 'registered', datetime('now'), 96),
('r2', 'u-s1', 'sec-sp26-eng101', 'Spring 2026', 'registered', datetime('now'), 100),
('r3', 'u-s2', 'sec-sp26-cs201-a', 'Spring 2026', 'registered', datetime('now'), 92);

INSERT OR IGNORE INTO announcements (id, title, content, target_role, created_by, created_at) VALUES
('a1', 'Spring 2026 Registration is OPEN', 'Register early for the best schedule. Maximum 18 credit hours.', 'student', 'u-admin', datetime('now')),
('a2', 'Faculty: Submit midterm grades reminder', 'Please ensure grade submission deadlines are met for all sections.', 'faculty', 'u-admin', datetime('now'));

INSERT OR REPLACE INTO registration_settings (id, is_open, semester_label, start_date, end_date, max_credits)
VALUES (1, 1, 'Spring 2026', '2026-01-15', '2026-02-15', 18);

UPDATE sections SET enrolled_count = (
  SELECT COUNT(*) FROM registrations r WHERE r.section_id = sections.id AND r.status = 'registered'
);
