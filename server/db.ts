import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import bcrypt from 'bcryptjs';

let db: Database | null = null;
let SQL: SqlJsStatic | null = null;

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'dayflow.sqlite');
const STORAGE_DIR = path.join(process.cwd(), 'storage');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  }
}

export async function getDb(): Promise<Database> {
  if (db) return db;

  SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const filebuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run("PRAGMA foreign_keys = ON;");

  // Create schema
  initSchema(db);

  // Check if seed needed
  const res = db.exec("SELECT COUNT(*) as count FROM users");
  const count = res[0]?.values[0]?.[0] as number || 0;
  if (count === 0) {
    await seedDatabase(db);
  }

  saveDatabase();
  return db;
}

function initSchema(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      employee_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      hashed_password TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'employee')) NOT NULL DEFAULT 'employee',
      is_email_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      department TEXT NOT NULL,
      job_title TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      profile_picture_file_id TEXT,
      date_joined TEXT NOT NULL DEFAULT (date('now')),
      status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
      bank_account_no TEXT DEFAULT '',
      bank_name TEXT DEFAULT '',
      ifsc_or_routing TEXT DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS salary_structures (
      profile_id TEXT PRIMARY KEY,
      base_salary REAL NOT NULL,
      allowances TEXT NOT NULL, -- JSON string
      deductions TEXT NOT NULL, -- JSON string
      effective_from TEXT NOT NULL DEFAULT (date('now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      date TEXT NOT NULL, -- YYYY-MM-DD
      check_in TEXT, -- ISO timestamp
      check_out TEXT, -- ISO timestamp
      status TEXT CHECK(status IN ('present', 'absent', 'half_day', 'leave')) NOT NULL DEFAULT 'present',
      notes TEXT,
      FOREIGN KEY (profile_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      UNIQUE(profile_id, date)
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      leave_type TEXT CHECK(leave_type IN ('paid', 'sick', 'unpaid')) NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days_count REAL NOT NULL DEFAULT 1,
      remarks TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      review_comment TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS leave_balances (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      leave_type TEXT CHECK(leave_type IN ('paid', 'sick', 'unpaid')) NOT NULL,
      total_days REAL NOT NULL,
      used_days REAL NOT NULL DEFAULT 0,
      year INTEGER NOT NULL,
      FOREIGN KEY (profile_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      UNIQUE(profile_id, leave_type, year)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      uploaded_by TEXT NOT NULL,
      FOREIGN KEY (profile_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      related_entity_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

export async function seedDatabase(database: Database) {
  // Clear tables
  database.run(`
    DELETE FROM email_verification_tokens;
    DELETE FROM notifications;
    DELETE FROM documents;
    DELETE FROM leave_balances;
    DELETE FROM leave_requests;
    DELETE FROM attendance;
    DELETE FROM salary_structures;
    DELETE FROM profiles;
    DELETE FROM users;
  `);

  const adminPasswordHash = await bcrypt.hash("Admin@12345", 10);
  const employeePasswordHash = await bcrypt.hash("Employee@12345", 10);

  const initialEmployees = [
    {
      id: "usr_admin_1",
      employee_id: "EMP001",
      email: "admin@dayflow.internal",
      password: adminPasswordHash,
      role: "admin",
      verified: 1,
      full_name: "Elena Rostova",
      department: "Human Resources",
      job_title: "Head of People & Operations",
      phone: "+1 (555) 234-5670",
      address: "452 Hudson St, New York, NY 10014",
      date_joined: "2023-01-15",
      base_salary: 115000,
      bank: { acc: "98765432101", name: "JPMorgan Chase", ifsc: "CHASUS33" }
    },
    {
      id: "usr_emp_2",
      employee_id: "EMP002",
      email: "alex.rivers@dayflow.internal",
      password: employeePasswordHash,
      role: "employee",
      verified: 1,
      full_name: "Alex Rivers",
      department: "Engineering",
      job_title: "Senior Full Stack Engineer",
      phone: "+1 (555) 345-6781",
      address: "128 Market St, San Francisco, CA 94105",
      date_joined: "2023-03-01",
      base_salary: 135000,
      bank: { acc: "11223344556", name: "Silicon Valley Bank", ifsc: "SVBKUS6S" }
    },
    {
      id: "usr_emp_3",
      employee_id: "EMP003",
      email: "sarah.chen@dayflow.internal",
      password: employeePasswordHash,
      role: "employee",
      verified: 1,
      full_name: "Sarah Chen",
      department: "Product",
      job_title: "Principal Product Manager",
      phone: "+1 (555) 456-7892",
      address: "782 Broadway, Seattle, WA 98102",
      date_joined: "2023-04-10",
      base_salary: 140000,
      bank: { acc: "22334455667", name: "Bank of America", ifsc: "BOFAUS3N" }
    },
    {
      id: "usr_emp_4",
      employee_id: "EMP004",
      email: "marcus.vance@dayflow.internal",
      password: employeePasswordHash,
      role: "employee",
      verified: 1,
      full_name: "Marcus Vance",
      department: "Engineering",
      job_title: "Staff Systems Architect",
      phone: "+1 (555) 567-8903",
      address: "310 Austin Blvd, Austin, TX 78701",
      date_joined: "2023-02-15",
      base_salary: 155000,
      bank: { acc: "33445566778", name: "Wells Fargo", ifsc: "WFBIUS6S" }
    },
    {
      id: "usr_emp_5",
      employee_id: "EMP005",
      email: "priya.sharma@dayflow.internal",
      password: employeePasswordHash,
      role: "employee",
      verified: 1,
      full_name: "Priya Sharma",
      department: "Design",
      job_title: "Lead Product Designer",
      phone: "+1 (555) 678-9014",
      address: "64 Elm St, Chicago, IL 60611",
      date_joined: "2023-06-01",
      base_salary: 120000,
      bank: { acc: "44556677889", name: "Citibank", ifsc: "CITIUS33" }
    },
    {
      id: "usr_emp_6",
      employee_id: "EMP006",
      email: "liam.gallagher@dayflow.internal",
      password: employeePasswordHash,
      role: "employee",
      verified: 1,
      full_name: "Liam Gallagher",
      department: "Marketing",
      job_title: "Growth Marketing Director",
      phone: "+1 (555) 789-0125",
      address: "90 Newbury St, Boston, MA 02116",
      date_joined: "2023-07-15",
      base_salary: 110000,
      bank: { acc: "55667788990", name: "PNC Bank", ifsc: "PNCCUS33" }
    },
    {
      id: "usr_emp_7",
      employee_id: "EMP007",
      email: "tanya.morales@dayflow.internal",
      password: employeePasswordHash,
      role: "employee",
      verified: 1,
      full_name: "Tanya Morales",
      department: "Sales",
      job_title: "Enterprise Account Executive",
      phone: "+1 (555) 890-1236",
      address: "150 Biscayne Blvd, Miami, FL 33132",
      date_joined: "2023-08-01",
      base_salary: 95000,
      bank: { acc: "66778899001", name: "Capital One", ifsc: "CAPOUS33" }
    },
    {
      id: "usr_emp_8",
      employee_id: "EMP008",
      email: "devon.knight@dayflow.internal",
      password: employeePasswordHash,
      role: "employee",
      verified: 1,
      full_name: "Devon Knight",
      department: "Engineering",
      job_title: "DevOps & Infrastructure Lead",
      phone: "+1 (555) 901-2347",
      address: "520 2nd Ave, Denver, CO 80203",
      date_joined: "2023-09-12",
      base_salary: 130000,
      bank: { acc: "77889900112", name: "First Republic", ifsc: "FRBKUS6S" }
    },
    {
      id: "usr_emp_9",
      employee_id: "EMP009",
      email: "aisha.khan@dayflow.internal",
      password: employeePasswordHash,
      role: "employee",
      verified: 1,
      full_name: "Aisha Khan",
      department: "Human Resources",
      job_title: "HR Generalist & People Partner",
      phone: "+1 (555) 012-3458",
      address: "210 Park Ave, New York, NY 10017",
      date_joined: "2023-10-01",
      base_salary: 82000,
      bank: { acc: "88990011223", name: "TD Bank", ifsc: "TDBKUS33" }
    },
    {
      id: "usr_emp_10",
      employee_id: "EMP010",
      email: "daniel.kim@dayflow.internal",
      password: employeePasswordHash,
      role: "employee",
      verified: 1,
      full_name: "Daniel Kim",
      department: "Operations",
      job_title: "Operations & Logistics Manager",
      phone: "+1 (555) 123-4569",
      address: "410 S Spring St, Los Angeles, CA 90013",
      date_joined: "2023-11-15",
      base_salary: 98000,
      bank: { acc: "99001122334", name: "US Bank", ifsc: "USBKUS44" }
    },
    {
      id: "usr_emp_11",
      employee_id: "EMP011",
      email: "chloe.dupont@dayflow.internal",
      password: employeePasswordHash,
      role: "employee",
      verified: 1,
      full_name: "Chloe Dupont",
      department: "Design",
      job_title: "UI/UX Specialist",
      phone: "+1 (555) 234-5678",
      address: "18 Pine St, Philadelphia, PA 19106",
      date_joined: "2024-01-08",
      base_salary: 90000,
      bank: { acc: "10111213141", name: "PNC Bank", ifsc: "PNCCUS33" }
    },
    {
      id: "usr_emp_12",
      employee_id: "EMP012",
      email: "zack.miller@dayflow.internal",
      password: employeePasswordHash,
      role: "employee",
      verified: 1,
      full_name: "Zackary Miller",
      department: "Engineering",
      job_title: "Frontend Engineer",
      phone: "+1 (555) 345-6789",
      address: "88 Peachtree St, Atlanta, GA 30303",
      date_joined: "2024-02-01",
      base_salary: 105000,
      bank: { acc: "12131415161", name: "Truist Bank", ifsc: "TRUIUS33" }
    },
    {
      id: "usr_emp_13",
      employee_id: "EMP013",
      email: "rachel.green@dayflow.internal",
      password: employeePasswordHash,
      role: "employee",
      verified: 1,
      full_name: "Rachel Green",
      department: "Sales",
      job_title: "Senior SDR Specialist",
      phone: "+1 (555) 456-7890",
      address: "740 Broadway, Nashville, TN 37203",
      date_joined: "2024-03-15",
      base_salary: 75000,
      bank: { acc: "13141516171", name: "Regions Bank", ifsc: "RGBKUS44" }
    },
    {
      id: "usr_emp_14",
      employee_id: "EMP014",
      email: "nathan.drake@dayflow.internal",
      password: employeePasswordHash,
      role: "employee",
      verified: 1,
      full_name: "Nathan Drake",
      department: "Product",
      job_title: "Technical Product Analyst",
      phone: "+1 (555) 567-8901",
      address: "320 SW Washington, Portland, OR 97204",
      date_joined: "2024-04-01",
      base_salary: 88000,
      bank: { acc: "14151617181", name: "Umpqua Bank", ifsc: "UMPQUS66" }
    },
    {
      id: "usr_emp_15",
      employee_id: "EMP015",
      email: "olivia.bennett@dayflow.internal",
      password: employeePasswordHash,
      role: "employee",
      verified: 1,
      full_name: "Olivia Bennett",
      department: "Marketing",
      job_title: "Content & Brand Strategist",
      phone: "+1 (555) 678-9012",
      address: "450 St Charles Ave, New Orleans, LA 70130",
      date_joined: "2024-05-10",
      base_salary: 85000,
      bank: { acc: "15161718191", name: "Whitney Bank", ifsc: "WHITUS44" }
    }
  ];

  const currentYear = new Date().getFullYear();

  for (const emp of initialEmployees) {
    // Insert user
    database.run(
      `INSERT INTO users (id, employee_id, email, hashed_password, role, is_email_verified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [emp.id, emp.employee_id, emp.email, emp.password, emp.role, emp.verified, emp.date_joined + " 09:00:00"]
    );

    // Insert profile
    database.run(
      `INSERT INTO profiles (user_id, full_name, department, job_title, phone, address, date_joined, status, bank_account_no, bank_name, ifsc_or_routing)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [emp.id, emp.full_name, emp.department, emp.job_title, emp.phone, emp.address, emp.date_joined, emp.bank.acc, emp.bank.name, emp.bank.ifsc]
    );

    // Insert salary structure
    const monthlyBase = Math.round(emp.base_salary / 12);
    const allowances = {
      hra: Math.round(monthlyBase * 0.35),
      transport: 400,
      medical: 250,
      special: Math.round(monthlyBase * 0.15)
    };
    const deductions = {
      provident_fund: Math.round(monthlyBase * 0.08),
      tax: Math.round(monthlyBase * 0.12),
      insurance: 180
    };

    database.run(
      `INSERT INTO salary_structures (profile_id, base_salary, allowances, deductions, effective_from)
       VALUES (?, ?, ?, ?, ?)`,
      [emp.id, emp.base_salary, JSON.stringify(allowances), JSON.stringify(deductions), emp.date_joined]
    );

    // Insert leave balances
    const leaveTypes: Array<{ type: 'paid' | 'sick' | 'unpaid'; total: number; used: number }> = [
      { type: 'paid', total: 18, used: Math.floor(Math.random() * 5) + 1 },
      { type: 'sick', total: 10, used: Math.floor(Math.random() * 3) },
      { type: 'unpaid', total: 5, used: 0 }
    ];

    for (const lb of leaveTypes) {
      database.run(
        `INSERT INTO leave_balances (id, profile_id, leave_type, total_days, used_days, year)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [`lb_${emp.id}_${lb.type}`, emp.id, lb.type, lb.total, lb.used, currentYear]
      );
    }

    // Seed historical attendance for the last 14 days
    const today = new Date();
    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      // Skip weekends
      if (d.getDay() === 0 || d.getDay() === 6) continue;

      const dateStr = d.toISOString().split('T')[0];
      const isToday = i === 0;

      let status: 'present' | 'absent' | 'half_day' | 'leave' = 'present';
      let checkIn: string | null = `${dateStr}T09:${String(Math.floor(Math.random() * 25) + 5).padStart(2, '0')}:00Z`;
      let checkOut: string | null = isToday ? null : `${dateStr}T17:${String(Math.floor(Math.random() * 45) + 15).padStart(2, '0')}:00Z`;

      // Variation
      const rand = Math.random();
      if (!isToday) {
        if (rand < 0.05) {
          status = 'absent';
          checkIn = null;
          checkOut = null;
        } else if (rand < 0.1) {
          status = 'leave';
          checkIn = null;
          checkOut = null;
        } else if (rand < 0.15) {
          status = 'half_day';
          checkOut = `${dateStr}T13:30:00Z`;
        }
      }

      database.run(
        `INSERT INTO attendance (id, profile_id, date, check_in, check_out, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`att_${emp.id}_${dateStr}`, emp.id, dateStr, checkIn, checkOut, status, status === 'half_day' ? 'Doctor appointment' : null]
      );
    }
  }

  // Seed sample leave requests
  database.run(
    `INSERT INTO leave_requests (id, profile_id, leave_type, start_date, end_date, days_count, remarks, status, reviewed_by, review_comment, reviewed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 days'))`,
    [
      "lr_sample_1",
      "usr_emp_2", // Alex Rivers
      "paid",
      "2026-09-02",
      "2026-09-05",
      4,
      "Family vacation to Pacific Northwest.",
      "pending",
      null,
      null,
      null
    ]
  );

  database.run(
    `INSERT INTO leave_requests (id, profile_id, leave_type, start_date, end_date, days_count, remarks, status, reviewed_by, review_comment, reviewed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-4 days'))`,
    [
      "lr_sample_2",
      "usr_emp_3", // Sarah Chen
      "sick",
      "2026-08-15",
      "2026-08-16",
      2,
      "Flu and medical consultation.",
      "approved",
      "usr_admin_1",
      "Approved. Get well soon Sarah!",
      "2026-08-14 11:30:00"
    ]
  );

  database.run(
    `INSERT INTO leave_requests (id, profile_id, leave_type, start_date, end_date, days_count, remarks, status, reviewed_by, review_comment, reviewed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-1 day'))`,
    [
      "lr_sample_3",
      "usr_emp_5", // Priya Sharma
      "paid",
      "2026-08-28",
      "2026-08-29",
      2,
      "Attending UX Design Summit.",
      "pending",
      null,
      null,
      null
    ]
  );

  // Seed notifications
  database.run(
    `INSERT INTO notifications (id, profile_id, type, message, is_read, related_entity_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-1 hour'))`,
    ["notif_1", "usr_admin_1", "leave_request", "Alex Rivers submitted a new Paid Leave request for 4 days.", 0, "lr_sample_1"]
  );

  database.run(
    `INSERT INTO notifications (id, profile_id, type, message, is_read, related_entity_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-3 hours'))`,
    ["notif_2", "usr_admin_1", "leave_request", "Priya Sharma submitted a new Paid Leave request for 2 days.", 0, "lr_sample_3"]
  );

  database.run(
    `INSERT INTO notifications (id, profile_id, type, message, is_read, related_entity_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-1 day'))`,
    ["notif_3", "usr_emp_3", "leave_status", "Your Sick Leave request for Aug 15 - Aug 16 was approved by Elena Rostova.", 1, "lr_sample_2"]
  );

  database.run(
    `INSERT INTO notifications (id, profile_id, type, message, is_read, related_entity_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-2 days'))`,
    ["notif_4", "usr_emp_2", "payroll_update", "August 2026 Payroll Statement is ready for download.", 0, null]
  );

  // Seed sample documents
  database.run(
    `INSERT INTO documents (id, profile_id, file_name, file_type, file_size, storage_path, uploaded_at, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-10 days'), ?)`,
    ["doc_1", "usr_emp_2", "Employment_Agreement_AlexRivers.pdf", "application/pdf", 145020, "usr_emp_2/Employment_Agreement_AlexRivers.pdf", "usr_admin_1"]
  );

  database.run(
    `INSERT INTO documents (id, profile_id, file_name, file_type, file_size, storage_path, uploaded_at, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-5 days'), ?)`,
    ["doc_2", "usr_emp_2", "Tax_Declaration_W4.pdf", "application/pdf", 98210, "usr_emp_2/Tax_Declaration_W4.pdf", "usr_emp_2"]
  );

  saveDatabase();
}
