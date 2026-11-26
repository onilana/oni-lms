/**
 * ONI LMS — Bulk Enrollment Excel Template Generator
 * Run from: e:\oni-lms\frontend (so node_modules/xlsx is on the path)
 * Usage: node ../generate_bulk_template.js
 */

const XLSX = require('E:\\oni-lms\\frontend\\node_modules\\xlsx\\xlsx.js');
const path = require('path');

const wb = XLSX.utils.book_new();

/* =====================================================================
   HELPER STYLES — SheetJS CE does not support rich cell styles, but we
   can at least set column widths and add a frozen header row via !freeze.
   ===================================================================== */

function makeSheet(headers, sampleRows, colWidths) {
  const data = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = colWidths.map(w => ({ wch: w }));
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };   // freeze first row
  return ws;
}

/* =====================================================================
   SHEET 1: Students
   Endpoint: POST /api/v1/users/bulk-enroll  (or /api/v1/students/import)
   Required: name, email
   role column accepted aliases: student
   ===================================================================== */

const studentHeaders = [
  'name',                // Required  – Full name
  'email',               // Required  – Unique institutional email
  'password',            // Optional  – If blank, default Student@2026! is used
  'role',                // Optional  – Keep "student" (default if omitted)
  'student_id_number',   // Optional  – e.g. STU-2026-A1B2C; auto-generated if blank
  'programme',           // Optional  – Programme code OR name (e.g. BCA, B.Tech CSE)
  'programme_id',        // Optional  – UUID of programme (preferred over programme name)
  'batch_id',            // Optional  – UUID of batch (leave blank to use programme default)
  'current_semester',    // Optional  – 1–16; defaults to 1
  'admission_date',      // Optional  – YYYY-MM-DD; defaults to today
  'date_of_birth',       // Optional  – YYYY-MM-DD
  'gender',              // Optional  – male / female / other
  'class_roll_no',       // Optional  – Class roll number
  'phone',               // Optional  – Mobile number
  'father_name',         // Optional
  'mother_name',         // Optional
  'address',             // Optional  – Full postal address
  'department',          // Optional  – Department code/name (used if programme_id blank)
  'department_id',       // Optional  – UUID of department (used if programme_id blank)
];

const studentSample = [
  [
    'Anjali Sharma', 'anjali.sharma@college.edu', '', 'student',
    'STU-2026-001', 'Bachelor of Science', '', '', '1', '2026-07-01',
    '2005-03-15', 'female', 'ZOO-01', '9876543210',
    'Ramesh Sharma', 'Priya Sharma',
    '12 MG Road, Bangalore, KA 560001',
    'Department of Zoology', '',
  ],
  [
    'Ravi Kumar', 'ravi.kumar@college.edu', '', 'student',
    'STU-2026-002', 'Bachelor of Arts', '', '', '1', '2026-07-01',
    '2004-11-22', 'male', 'ENG-02', '9123456780',
    'Suresh Kumar', 'Meena Kumar',
    '45 Brigade Road, Bangalore, KA 560025',
    'Department of English', '',
  ],
  [
    'Fatima Noor', 'fatima.noor@college.edu', '', 'student',
    'STU-2026-003', 'Bachelor of Commerce', '', '', '3', '2025-07-01',
    '2003-06-10', 'female', 'COM-05', '9988776655',
    'Mohd. Noor', 'Zainab Noor',
    '78 Commercial Street, Bangalore, KA 560001',
    'Department of Commerce', '',
  ],
  [
    'Kiran Verma', 'kiran.verma@college.edu', 'Custom@Pass1!', 'student',
    'STU-2026-004', 'Bachelor of Education (B.Ed.)', '', '', '1', '2026-07-01',
    '2002-09-18', 'female', 'BED-01', '9845012345',
    'Vikram Verma', 'Sunita Verma',
    '19 Residency Road, Bangalore, KA 560025',
    'Department of Education', '',
  ],
];

const studentWidths = [
  22, 30, 18, 10, 18, 18, 36, 36, 10, 14,
  14, 10, 14, 14, 20, 20, 36, 20, 36,
];

/* =====================================================================
   SHEET 2: Teachers / Faculty
   role column accepted aliases: teacher, faculty, professor, instructor,
                                  lecturer, hod, head of department
   ===================================================================== */

const teacherHeaders = [
  'name',                   // Required
  'email',                  // Required
  'password',               // Optional – default Staff@2026! if blank
  'role',                   // Required – teacher | hod | head_of_department
  'employee_id_number',     // Optional – e.g. FAC-2026-X1Y2Z; auto-generated if blank
  'department',             // Optional – Department code or name
  'department_id',          // Optional – UUID of department (preferred)
  'designation',            // Optional – Professor / Associate Professor / Lecturer …
  'qualification',          // Optional – Ph.D. / M.Tech / M.Sc. …
  'phone',                  // Optional
];

const teacherSample = [
  [
    'Dr. Priya Menon', 'priya.menon@college.edu', '', 'teacher',
    'FAC-2026-001', 'Department of Zoology', '', 'Associate Professor', 'Ph.D.', '9811234567',
  ],
  [
    'Prof. Arun Pillai', 'arun.pillai@college.edu', '', 'hod',
    'FAC-2026-002', 'Department of Botany', '', 'Head of Department', 'Ph.D.', '9922334455',
  ],
  [
    'Dr. Deepa Verma', 'deepa.verma@college.edu', 'Custom@Pass1!', 'teacher',
    'FAC-2026-003', 'Department of Physics', '', 'Assistant Professor', 'Ph.D.', '9833445566',
  ],
  [
    'Dr. Sanjay Nair', 'sanjay.nair@college.edu', '', 'teacher',
    'FAC-2026-004', 'Department of Chemistry', '', 'Professor', 'Ph.D.', '9844556677',
  ],
];

const teacherWidths = [24, 32, 18, 12, 18, 20, 36, 26, 18, 14];

/* =====================================================================
   SHEET 3: Administrators / Staff
   role column accepted aliases:
     college_admin | admin | school_admin
     dept_admin
   These users get no teacher/student profile – just a system role.
   ===================================================================== */

const adminHeaders = [
  'name',       // Required
  'email',      // Required
  'password',   // Optional – default Staff@2026! if blank
  'role',       // Required – college_admin | dept_admin | support_staff
  'phone',      // Optional
  'department', // Optional – for dept_admin; code or name
  'department_id', // Optional – UUID preferred
];

const adminSample = [
  [
    'College Admin', 'admin@college.edu', 'Admin@Secure1!', 'college_admin',
    '8011223344', '', '',
  ],
  [
    'Dept. Admin Zoology', 'zoodept.admin@college.edu', '', 'dept_admin',
    '8099887766', 'Department of Zoology', '',
  ],
  [
    'Support Staff', 'support@college.edu', '', 'support_staff',
    '8077665544', '', '',
  ],
];

const adminWidths = [24, 32, 18, 16, 14, 20, 36];

/* =====================================================================
   SHEET 4: Mixed Bulk (all roles in one file — used with bulkEnroll)
   The endpoint reads the "role" column to decide which profile to create.
   ===================================================================== */

const mixedHeaders = [
  'name', 'email', 'password', 'role',
  // Student fields
  'student_id_number', 'programme', 'programme_id', 'batch_id',
  'current_semester', 'admission_date',
  'date_of_birth', 'gender', 'class_roll_no',
  // Teacher/Admin fields
  'employee_id_number', 'department', 'department_id',
  'designation', 'qualification',
  // Shared optional
  'phone', 'father_name', 'mother_name', 'address',
];

const mixedSample = [
  [
    'Anjali Sharma', 'anjali.sharma@college.edu', '', 'student',
    'STU-2026-001', 'Bachelor of Science', '', '', '1', '2026-07-01',
    '2005-03-15', 'female', 'ZOO-01',
    '', 'Department of Zoology', '', '', '',
    '9876543210', 'Ramesh Sharma', 'Priya Sharma', '12 MG Road Bangalore',
  ],
  [
    'Dr. Priya Menon', 'priya.menon@college.edu', '', 'teacher',
    '', '', '', '', '', '',
    '', '', '',
    'FAC-2026-001', 'Department of Chemistry', '', 'Associate Professor', 'Ph.D.',
    '9811234567', '', '', '',
  ],
  [
    'College Admin', 'admin@college.edu', 'Admin@Secure1!', 'college_admin',
    '', '', '', '', '', '',
    '', '', '',
    '', '', '', '', '',
    '8011223344', '', '', '',
  ],
];

const mixedWidths = [
  22, 30, 18, 14,
  18, 18, 36, 36,
  10, 14,
  14, 10, 14,
  18, 18, 36,
  26, 18,
  14, 20, 20, 36,
];

/* =====================================================================
   SHEET 5: Instructions / README
   ===================================================================== */

const readmeData = [
  ['ONI LMS — Bulk Enrollment Template', '', ''],
  ['', '', ''],
  ['VERSION', '1.0', ''],
  ['GENERATED', new Date().toISOString().slice(0, 10), ''],
  ['ENDPOINT (students)', 'POST /api/v1/students/import', ''],
  ['ENDPOINT (all roles)', 'POST /api/v1/users/bulk-enroll', ''],
  ['', '', ''],
  ['=== HOW TO USE ===', '', ''],
  ['1.', 'Fill the sheet that matches your user type (Students / Teachers / Admins).', ''],
  ['2.', 'For a mixed upload of all roles in one file, use the "Mixed_Bulk" sheet.', ''],
  ['3.', 'Save the sheet you want to upload as CSV, then POST it as multipart/form-data', ''],
  ['', '   with the field name "file".', ''],
  ['4.', 'Alternatively, POST a JSON body: { "users": [ {...}, {...} ] }', ''],
  ['', '', ''],
  ['=== REQUIRED COLUMNS ===', '', ''],
  ['Column', 'Required?', 'Notes'],
  ['name', 'YES', 'Full name of the user'],
  ['email', 'YES', 'Must be unique. Used as login username.'],
  ['role', 'YES for mixed sheet', 'See valid values below. Defaults to "student" if omitted.'],
  ['', '', ''],
  ['=== VALID ROLE VALUES ===', '', ''],
  ['Value in CSV', 'Maps to Role', ''],
  ['student', 'student', ''],
  ['teacher / faculty / professor / instructor / lecturer', 'teacher', ''],
  ['hod / head of department / dept_head', 'head_of_department', ''],
  ['admin / college_admin / school_admin', 'college_admin', ''],
  ['dept_admin', 'dept_admin', ''],
  ['support_staff', 'support_staff', ''],
  ['', '', ''],
  ['=== VALID STATUS VALUES ===', '', ''],
  ['active', 'User can log in and access the system', ''],
  ['inactive', 'Account exists but cannot log in', ''],
  ['suspended', 'Account is locked', ''],
  ['', '', ''],
  ['=== VALID GENDER VALUES ===', '', ''],
  ['male / female / other', 'Case-insensitive', ''],
  ['', '', ''],
  ['=== DATES ===', '', ''],
  ['Format', 'YYYY-MM-DD', 'e.g. 2026-07-01'],
  ['', '', ''],
  ['=== PASSWORDS ===', '', ''],
  ['If blank (students)', 'Default: Student@2026!', 'User MUST change on first login'],
  ['If blank (staff/admin)', 'Default: Staff@2026!', 'User MUST change on first login'],
  ['Custom', 'Min 8 chars; must include uppercase, digit, special char', ''],
  ['', '', ''],
  ['=== IDs (programme_id / batch_id / department_id) ===', '', ''],
  ['These are UUIDs (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).', '', ''],
  ['Obtain them from the Admin → Academic Structures panel.', '', ''],
  ['Alternatively, use the "programme" or "department" text column', '', ''],
  ['which accepts the programme/dept code or partial name.', '', ''],
  ['', '', ''],
  ['=== CURRENT SEMESTER ===', '', ''],
  ['Integer 1–16.', 'Default: 1', ''],
  ['', '', ''],
  ['=== NOTES ===', '', ''],
  ['• Duplicate emails are skipped with an error in the response.', '', ''],
  ['• All created users are set to email_verified automatically.', '', ''],
  ['• Course access is auto-synced based on programme/department.', '', ''],
  ['• The API returns: { imported_count, breakdown, errors[] }', '', ''],
  ['• Authorized roles: super_admin, college_admin, dept_admin', '', ''],
];

const wsReadme = XLSX.utils.aoa_to_sheet(readmeData);
wsReadme['!cols'] = [{ wch: 50 }, { wch: 45 }, { wch: 40 }];

/* =====================================================================
   BUILD WORKBOOK
   ===================================================================== */

XLSX.utils.book_append_sheet(wb, wsReadme, 'README');
XLSX.utils.book_append_sheet(wb, makeSheet(studentHeaders, studentSample, studentWidths), 'Students');
XLSX.utils.book_append_sheet(wb, makeSheet(teacherHeaders, teacherSample, teacherWidths), 'Teachers');
XLSX.utils.book_append_sheet(wb, makeSheet(adminHeaders, adminSample, adminWidths), 'Admins');
XLSX.utils.book_append_sheet(wb, makeSheet(mixedHeaders, mixedSample, mixedWidths), 'Mixed_Bulk');

const outPath = path.join(__dirname, 'bulk_enrollment_template.xlsx');
XLSX.writeFile(wb, outPath);
console.log('Template written to:', outPath);
