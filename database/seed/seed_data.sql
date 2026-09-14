-- ============================================================================
-- TATTI Student Portal - Seed Data
-- ============================================================================

-- Seed Courses Catalog
INSERT INTO public.courses (id, course_name, course_code, description, duration, eligibility, fee, category, skills, career_opportunities, available_seats, status)
VALUES
(
    'a1111111-1111-1111-1111-111111111111',
    'Full Stack Web Development',
    'FSWD-2026',
    'Comprehensive master training in React, Node.js, Express, TypeScript, Next.js, and Cloud Infrastructure.',
    '6 Months',
    '10+2 / Diploma / Any Graduate',
    45000.00,
    'Software Engineering',
    ARRAY['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'TailwindCSS', 'Docker'],
    ARRAY['Frontend Developer', 'Full Stack Engineer', 'Backend Engineer', 'React Specialist'],
    30,
    'available'
),
(
    'a2222222-2222-2222-2222-222222222222',
    'Artificial Intelligence & Data Science',
    'AIDS-2026',
    'Advanced applied intelligence covering Machine Learning, Deep Neural Networks, Python, and Predictive Analytics.',
    '8 Months',
    'Degree in Science/Engineering or equivalent',
    60000.00,
    'Data Science & AI',
    ARRAY['Python', 'TensorFlow', 'PyTorch', 'Pandas', 'Computer Vision', 'NLP'],
    ARRAY['Data Scientist', 'Machine Learning Engineer', 'AI Research Associate', 'BI Analyst'],
    25,
    'available'
),
(
    'a3333333-3333-3333-3333-333333333333',
    'Cybersecurity & Ethical Hacking',
    'CYBER-2026',
    'Professional defensive security, penetration testing, network forensics, and zero-trust protocol implementation.',
    '6 Months',
    'Basic networking knowledge preferred',
    50000.00,
    'Information Security',
    ARRAY['Ethical Hacking', 'Penetration Testing', 'Network Defense', 'Wireshark', 'SIEM', 'Kali Linux'],
    ARRAY['SOC Analyst', 'Penetration Tester', 'Security Consultant', 'Network Defense Engineer'],
    20,
    'available'
),
(
    'a4444444-4444-4444-4444-444444444444',
    'Cloud Computing & DevOps Architecture',
    'DEVOPS-2026',
    'Modern CI/CD, Kubernetes orchestration, AWS/Azure multi-cloud infrastructure and Terraform automation.',
    '6 Months',
    'Diploma / Degree in IT/CS or working professionals',
    55000.00,
    'Cloud & Infrastructure',
    ARRAY['AWS', 'Docker', 'Kubernetes', 'Terraform', 'GitHub Actions', 'Linux'],
    ARRAY['DevOps Engineer', 'Cloud Architect', 'Site Reliability Engineer (SRE)', 'Build Engineer'],
    25,
    'available'
)
ON CONFLICT (course_code) DO NOTHING;

-- Seed Questions for Entrance Assessment
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, marks, difficulty, category)
VALUES
(
    'Which of the following data structures operates on a Last In First Out (LIFO) order?',
    'Queue',
    'Stack',
    'Array',
    'Linked List',
    'B',
    1,
    'easy',
    'Computer Science'
),
(
    'In modern web development, what is the primary role of JSX in React?',
    'A database query language for fetching remote data',
    'A syntax extension for JavaScript that looks like HTML/XML',
    'A CSS preprocessor for styling components',
    'A server-side caching protocol',
    'B',
    1,
    'easy',
    'Web Technologies'
),
(
    'What is the worst-case time complexity of the standard Quicksort algorithm?',
    'O(n)',
    'O(n log n)',
    'O(n^2)',
    'O(log n)',
    'C',
    1,
    'medium',
    'Algorithms'
),
(
    'Which protocol is primarily used for secure, encrypted end-to-end communication on the web?',
    'HTTP',
    'FTP',
    'HTTPS',
    'Telnet',
    'C',
    1,
    'easy',
    'Networking'
),
(
    'In relational databases, what does the ACID acronym stand for?',
    'Atomicity, Consistency, Isolation, Durability',
    'Access, Control, Identification, Data',
    'Array, Cluster, Index, Database',
    'Authentication, Cipher, Integrity, Decryption',
    'A',
    1,
    'medium',
    'Database Systems'
);
