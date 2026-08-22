import { Router, Response } from 'express';
import { jsPDF } from 'jspdf';
import { getDb, saveDatabase } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../auth.js';
import { SalaryStructure } from '../../src/types/index.js';

const router = Router();

// Calculate net pay from salary structure
function computeSalaryDetails(baseSalary: number, allowances: any, deductions: any) {
  const monthlyBase = Math.round(baseSalary / 12);
  const hra = Number(allowances.hra || allowances.house_rent_allowance || 0);
  const transport = Number(allowances.transport || allowances.transport_allowance || 0);
  const medical = Number(allowances.medical || allowances.medical_allowance || 0);
  const special = Number(allowances.special || allowances.special_allowance || 0);
  const totalAllowances = hra + transport + medical + special;

  const pf = Number(deductions.provident_fund || deductions.pf || 0);
  const tax = Number(deductions.tax || deductions.tax_deduction || 0);
  const insurance = Number(deductions.insurance || deductions.insurance_deduction || 0);
  const totalDeductions = pf + tax + insurance;

  const grossMonthly = monthlyBase + totalAllowances;
  const netMonthly = Math.max(0, grossMonthly - totalDeductions);

  return {
    monthlyBase,
    totalAllowances,
    grossMonthly,
    totalDeductions,
    netMonthly,
    annualGross: grossMonthly * 12,
    annualNet: netMonthly * 12,
    normalizedStructure: {
      base_salary: monthlyBase,
      annual_base: baseSalary,
      hra,
      transport_allowance: transport,
      medical_allowance: medical,
      special_allowance: special,
      provident_fund: pf,
      tax_deduction: tax,
      insurance_deduction: insurance
    }
  };
}

// Get My Payroll (Employee)
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = (req.query.employee_id as string) || req.user!.id;

    if (req.user?.role !== 'admin' && req.user?.id !== targetUserId) {
      res.status(403).json({ error: 'Forbidden. You can only view your own payroll.' });
      return;
    }

    const db = await getDb();
    const query = `
      SELECT p.user_id, COALESCE(ss.base_salary, 102000), ss.allowances, ss.deductions, COALESCE(ss.effective_from, p.date_joined),
             p.full_name, p.department, p.job_title, p.bank_account_no, p.bank_name, p.ifsc_or_routing,
             u.employee_id
      FROM profiles p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN salary_structures ss ON p.user_id = ss.profile_id
      WHERE p.user_id = ?
    `;
    const result = db.exec(query, [targetUserId]);

    if (!result[0] || result[0].values.length === 0) {
      res.status(404).json({ error: 'Employee profile not found.' });
      return;
    }

    const row = result[0].values[0];
    const baseSalary = Number(row[1]) || 102000;
    const monthlyBase = Math.round(baseSalary / 12);
    const defaultAllowances = {
      hra: Math.round(monthlyBase * 0.35),
      transport: 400,
      medical: 250,
      special: Math.round(monthlyBase * 0.15)
    };
    const defaultDeductions = {
      provident_fund: Math.round(monthlyBase * 0.08),
      tax: Math.round(monthlyBase * 0.12),
      insurance: 180
    };

    let allowances = defaultAllowances;
    let deductions = defaultDeductions;
    try {
      if (row[2]) allowances = { ...defaultAllowances, ...JSON.parse(String(row[2])) };
      if (row[3]) deductions = { ...defaultDeductions, ...JSON.parse(String(row[3])) };
    } catch {
      // Use defaults
    }

    const details = computeSalaryDetails(baseSalary, allowances, deductions);

    const profileData = {
      user_id: String(row[0]),
      employee_id: String(row[11]),
      full_name: String(row[5]),
      department: String(row[6]),
      job_title: String(row[7]),
      bank_account_no: String(row[8] || ''),
      bank_name: String(row[9] || ''),
      ifsc_or_routing: String(row[10] || '')
    };

    res.json({
      payroll: {
        profile_id: String(row[0]),
        base_salary: baseSalary,
        allowances,
        deductions,
        effective_from: String(row[4] || new Date().toISOString().split('T')[0]),
        employee_name: String(row[5]),
        department: String(row[6]),
        job_title: String(row[7]),
        bank_account_no: String(row[8] || 'Not specified'),
        bank_name: String(row[9] || 'Not specified'),
        ifsc_or_routing: String(row[10] || 'Not specified'),
        employee_id: String(row[11]),
        profile: profileData,
        structure: details.normalizedStructure,
        gross: details.grossMonthly,
        net: details.netMonthly,
        ...details
      }
    });
  } catch (err: any) {
    console.error('My payroll error:', err);
    res.status(500).json({ error: 'Failed to fetch payroll.' });
  }
});

// Admin All Payroll List
router.get('/all', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { department, search } = req.query;
    const db = await getDb();

    let query = `
      SELECT p.user_id, COALESCE(ss.base_salary, 102000), ss.allowances, ss.deductions, COALESCE(ss.effective_from, p.date_joined),
             p.full_name, p.department, p.job_title, p.bank_account_no, p.bank_name, p.ifsc_or_routing,
             u.employee_id
      FROM profiles p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN salary_structures ss ON p.user_id = ss.profile_id
      WHERE p.status = 'active'
    `;
    const params: any[] = [];

    if (department && typeof department === 'string' && department !== 'all') {
      query += ` AND p.department = ?`;
      params.push(department);
    }

    if (search && typeof search === 'string') {
      query += ` AND (p.full_name LIKE ? OR u.employee_id LIKE ?)`;
      const s = `%${search.trim()}%`;
      params.push(s, s);
    }

    query += ` ORDER BY p.full_name ASC`;

    const result = db.exec(query, params);
    const payrollList: any[] = [];
    let totalMonthlyOutflow = 0;

    if (result[0] && result[0].values) {
      for (const row of result[0].values) {
        const userId = String(row[0]);
        const baseSalary = Number(row[1]) || 102000;
        const monthlyBase = Math.round(baseSalary / 12);
        const defaultAllowances = {
          hra: Math.round(monthlyBase * 0.35),
          transport: 400,
          medical: 250,
          special: Math.round(monthlyBase * 0.15)
        };
        const defaultDeductions = {
          provident_fund: Math.round(monthlyBase * 0.08),
          tax: Math.round(monthlyBase * 0.12),
          insurance: 180
        };

        let allowances = defaultAllowances;
        let deductions = defaultDeductions;
        try {
          if (row[2]) allowances = { ...defaultAllowances, ...JSON.parse(String(row[2])) };
          if (row[3]) deductions = { ...defaultDeductions, ...JSON.parse(String(row[3])) };
        } catch {
          // fallback
        }

        const details = computeSalaryDetails(baseSalary, allowances, deductions);
        totalMonthlyOutflow += details.grossMonthly;

        const profileObj = {
          user_id: userId,
          employee_id: String(row[11]),
          full_name: String(row[5]),
          department: String(row[6]),
          job_title: String(row[7]),
          bank_account_no: String(row[8] || ''),
          bank_name: String(row[9] || ''),
          ifsc_or_routing: String(row[10] || '')
        };

        payrollList.push({
          profile_id: userId,
          profile: profileObj,
          employee_id: String(row[11]),
          employee_name: String(row[5]),
          department: String(row[6]),
          job_title: String(row[7]),
          base_salary: baseSalary,
          allowances,
          deductions,
          structure: details.normalizedStructure,
          effective_from: String(row[4] || ''),
          bank_account_no: String(row[8] || ''),
          bank_name: String(row[9] || ''),
          ifsc_or_routing: String(row[10] || ''),
          has_bank_details: Boolean(row[8] && row[9]),
          gross: details.grossMonthly,
          net: details.netMonthly,
          ...details
        });
      }
    }

    const count = payrollList.length;
    res.json({
      payrollList,
      summary: {
        totalEmployees: count,
        employeeCount: count,
        totalMonthlyPayroll: totalMonthlyOutflow,
        totalMonthlyOutflow,
        annualizedOutflow: totalMonthlyOutflow * 12,
        annualCommitted: totalMonthlyOutflow * 12,
        averageSalary: count > 0 ? Math.round(totalMonthlyOutflow / count) : 0,
        averageMonthlyGross: count > 0 ? Math.round(totalMonthlyOutflow / count) : 0
      }
    });
  } catch (err: any) {
    console.error('All payroll error:', err);
    res.status(500).json({ error: 'Failed to fetch payroll list.' });
  }
});

// Admin Update Salary Structure
router.put('/structure/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const body = req.body || {};

    // Support both flat form values and nested object structures
    let baseSalary = Number(body.base_salary);
    // If sent as monthly base in form ($8,500), convert to annual equivalent if needed ($102,000) or store correctly
    if (baseSalary < 20000 && baseSalary > 0) {
      baseSalary = baseSalary * 12; // Form sends monthly base
    }

    const allowances = body.allowances || {
      hra: Number(body.hra || 0),
      transport: Number(body.transport_allowance || body.transport || 0),
      medical: Number(body.medical_allowance || body.medical || 0),
      special: Number(body.special_allowance || body.special || 0)
    };

    const deductions = body.deductions || {
      provident_fund: Number(body.provident_fund || body.pf || 0),
      tax: Number(body.tax_deduction || body.tax || 0),
      insurance: Number(body.insurance_deduction || body.insurance || 0)
    };

    if (!baseSalary || isNaN(baseSalary) || baseSalary <= 0) {
      res.status(400).json({ error: 'Valid salary structure configuration is required.' });
      return;
    }

    const db = await getDb();
    db.run(
      `INSERT INTO salary_structures (profile_id, base_salary, allowances, deductions, effective_from)
       VALUES (?, ?, ?, ?, date('now'))
       ON CONFLICT(profile_id) DO UPDATE SET
         base_salary = excluded.base_salary,
         allowances = excluded.allowances,
         deductions = excluded.deductions,
         effective_from = excluded.effective_from`,
      [
        targetUserId,
        Number(baseSalary),
        JSON.stringify(allowances),
        JSON.stringify(deductions)
      ]
    );

    saveDatabase();
    res.json({ message: 'Salary structure updated successfully.' });
  } catch (err: any) {
    console.error('Update salary error:', err);
    res.status(500).json({ error: 'Failed to update salary structure.' });
  }
});

// Admin Payroll Integrity Check
router.get('/integrity-check', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const query = `
      SELECT p.user_id, p.full_name, p.department, p.bank_account_no, p.bank_name,
             u.employee_id, ss.base_salary, ss.allowances, ss.deductions
      FROM profiles p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN salary_structures ss ON p.user_id = ss.profile_id
      WHERE p.status = 'active'
    `;
    const result = db.exec(query);
    const anomalies: any[] = [];

    if (result[0] && result[0].values) {
      for (const row of result[0].values) {
        const userId = String(row[0]);
        const name = String(row[1]);
        const dept = String(row[2]);
        const bankAcc = String(row[3] || '');
        const bankName = String(row[4] || '');
        const empId = String(row[5]);
        const baseSalary = row[6] ? Number(row[6]) : 0;

        if (!bankAcc || !bankName) {
          anomalies.push({
            type: 'missing_bank_info',
            severity: 'high',
            employee_id: empId,
            employee_name: name,
            department: dept,
            issue: 'Missing bank account number or institution details for payroll wire transfer.'
          });
        }

        if (baseSalary <= 0) {
          anomalies.push({
            type: 'invalid_base_salary',
            severity: 'critical',
            employee_id: empId,
            employee_name: name,
            department: dept,
            issue: 'Active employee has zero or undefined base salary compensation structure.'
          });
        }
      }
    }

    res.json({
      status: anomalies.length === 0 ? 'healthy' : 'anomalies_detected',
      totalChecked: result[0]?.values?.length || 0,
      anomaliesCount: anomalies.length,
      anomalies
    });
  } catch (err: any) {
    console.error('Integrity check error:', err);
    res.status(500).json({ error: 'Failed to run payroll integrity check.' });
  }
});

// Download PDF Salary Slip (Streamed directly via authenticated endpoint)
router.get('/salary-slip/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const month = (req.query.month as string) || 'August 2026';

    if (req.user?.role !== 'admin' && req.user?.id !== targetUserId) {
      res.status(403).json({ error: 'Forbidden. You can only download your own salary slip.' });
      return;
    }

    const db = await getDb();
    const query = `
      SELECT ss.profile_id, ss.base_salary, ss.allowances, ss.deductions, ss.effective_from,
             p.full_name, p.department, p.job_title, p.bank_account_no, p.bank_name, p.ifsc_or_routing,
             u.employee_id, u.email
      FROM salary_structures ss
      JOIN profiles p ON ss.profile_id = p.user_id
      JOIN users u ON ss.profile_id = u.id
      WHERE ss.profile_id = ?
    `;
    const result = db.exec(query, [targetUserId]);

    if (!result[0] || result[0].values.length === 0) {
      res.status(404).json({ error: 'Payroll details not found.' });
      return;
    }

    const row = result[0].values[0];
    const baseSalary = Number(row[1]);
    const allowances = JSON.parse(String(row[2] || '{}'));
    const deductions = JSON.parse(String(row[3] || '{}'));
    const details = computeSalaryDetails(baseSalary, allowances, deductions);

    const empName = String(row[5]);
    const dept = String(row[6]);
    const jobTitle = String(row[7]);
    const bankAcc = String(row[8] || 'XXXX-XXXX-8921');
    const bankName = String(row[9] || 'Standard Chartered');
    const ifsc = String(row[10] || 'SCBLUS33');
    const empId = String(row[11]);
    const email = String(row[12]);

    // Generate PDF with jsPDF
    const doc = new jsPDF();

    // Palette & Header
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, 210, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DAYFLOW', 14, 18);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('HUMAN RESOURCE MANAGEMENT SYSTEM', 14, 25);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYSLIP STATEMENT', 140, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${month}`, 140, 25);

    // Employee Meta Box
    doc.setTextColor(30, 41, 59);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 38, 182, 38, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 38, 182, 38, 3, 3, 'S');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Name:', 20, 46);
    doc.text('Employee ID:', 20, 54);
    doc.text('Department:', 20, 62);
    doc.text('Designation:', 20, 70);

    doc.setFont('helvetica', 'normal');
    doc.text(empName, 60, 46);
    doc.text(empId, 60, 54);
    doc.text(dept, 60, 62);
    doc.text(jobTitle, 60, 70);

    doc.setFont('helvetica', 'bold');
    doc.text('Bank Name:', 110, 46);
    doc.text('Account No:', 110, 54);
    doc.text('IFSC/Routing:', 110, 62);
    doc.text('Generated On:', 110, 70);

    doc.setFont('helvetica', 'normal');
    doc.text(bankName, 145, 46);
    doc.text(bankAcc, 145, 54);
    doc.text(ifsc, 145, 62);
    doc.text(new Date().toLocaleDateString(), 145, 70);

    // Breakdown Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(14, 84, 91, 8, 'F');
    doc.rect(105, 84, 91, 8, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('EARNINGS & ALLOWANCES', 18, 90);
    doc.text('AMOUNT ($)', 75, 90);

    doc.text('DEDUCTIONS', 109, 90);
    doc.text('AMOUNT ($)', 166, 90);

    // Rows
    let y = 100;
    doc.setFont('helvetica', 'normal');

    // Earnings
    doc.text('Monthly Basic Salary', 18, y);
    doc.text(`$${details.monthlyBase.toLocaleString()}`, 75, y);
    doc.text('Provident Fund (PF)', 109, y);
    doc.text(`$${(deductions.provident_fund || 0).toLocaleString()}`, 166, y);

    y += 8;
    doc.text('House Rent Allowance (HRA)', 18, y);
    doc.text(`$${(allowances.hra || 0).toLocaleString()}`, 75, y);
    doc.text('Income Tax (Withholding)', 109, y);
    doc.text(`$${(deductions.tax || 0).toLocaleString()}`, 166, y);

    y += 8;
    doc.text('Transport Allowance', 18, y);
    doc.text(`$${(allowances.transport || 0).toLocaleString()}`, 75, y);
    doc.text('Health Insurance', 109, y);
    doc.text(`$${(deductions.insurance || 0).toLocaleString()}`, 166, y);

    y += 8;
    doc.text('Medical Allowance', 18, y);
    doc.text(`$${(allowances.medical || 0).toLocaleString()}`, 75, y);

    y += 8;
    doc.text('Special / Performance Allowance', 18, y);
    doc.text(`$${(allowances.special || 0).toLocaleString()}`, 75, y);

    // Totals Box
    y += 14;
    doc.setDrawColor(203, 213, 225);
    doc.line(14, y - 4, 196, y - 4);

    doc.setFont('helvetica', 'bold');
    doc.text('Gross Monthly Earnings:', 18, y);
    doc.text(`$${details.grossMonthly.toLocaleString()}`, 75, y);

    doc.text('Total Deductions:', 109, y);
    doc.text(`$${details.totalDeductions.toLocaleString()}`, 166, y);

    // Net Pay Highlight Box
    y += 14;
    doc.setFillColor(16, 185, 129); // Emerald
    doc.roundedRect(14, y, 182, 20, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('NET SALARY PAYABLE:', 24, y + 13);
    doc.setFontSize(16);
    doc.text(`$${details.netMonthly.toLocaleString()}.00`, 130, y + 13);

    // Footer
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('This is a system-generated document and does not require a physical signature.', 14, 280);
    doc.text('Dayflow HRMS • Confidential Payroll Record', 140, 280);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Dayflow_Payslip_${empId}_${month.replace(/\s+/g, '_')}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Salary slip error:', err);
    res.status(500).json({ error: 'Failed to generate salary slip PDF.' });
  }
});

export default router;
