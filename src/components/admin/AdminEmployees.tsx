import React, { useState } from 'react';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { Input } from '../ui/Input.js';
import { Badge } from '../ui/Badge.js';
import { Modal } from '../ui/Modal.js';
import { showToast } from '../ui/Toast.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { Profile } from '../../types/index.js';
import { formatDate } from '../../lib/utils.js';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface AdminEmployeesProps {
  employees: Profile[];
  onRefresh: () => void;
}

export const AdminEmployees: React.FC<AdminEmployeesProps> = ({ employees, onRefresh }) => {
  const { setViewAsEmployee } = useAuth();

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Add Employee Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newEmpId, setNewEmpId] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'employee' | 'admin'>('employee');
  const [newDept, setNewDept] = useState('Engineering');
  const [newTitle, setNewTitle] = useState('Software Engineer');
  const [newSalary, setNewSalary] = useState('8500');
  const [newPassword, setNewPassword] = useState('Employee@12345');

  // Edit Employee Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Profile | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editRole, setEditRole] = useState<'employee' | 'admin'>('employee');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBankAcc, setEditBankAcc] = useState('');
  const [editIfsc, setEditIfsc] = useState('');
  const [editPan, setEditPan] = useState('');

  const filteredEmployees = employees.filter((emp) => {
    if (departmentFilter !== 'all' && emp.department !== departmentFilter) return false;
    if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        emp.full_name.toLowerCase().includes(q) ||
        emp.employee_id.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.job_title.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleOpenAdd = () => {
    const nextNum = employees.length + 1;
    setNewEmpId(`EMP${String(nextNum).padStart(3, '0')}`);
    setNewFullName('');
    setNewEmail('');
    setNewRole('employee');
    setNewDept('Engineering');
    setNewTitle('Software Engineer');
    setNewSalary('8500');
    setNewPassword('Employee@12345');
    setIsAddModalOpen(true);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await api.employees.create({
        employee_id: newEmpId,
        full_name: newFullName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        department: newDept,
        job_title: newTitle,
        base_salary: Number(newSalary) || 8500
      });

      showToast('Employee Added', 'success', `${newFullName} has been onboarded.`);
      setIsAddModalOpen(false);
      onRefresh();
    } catch (err: any) {
      showToast('Creation Failed', 'error', err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = (emp: Profile) => {
    setSelectedEmp(emp);
    setEditFullName(emp.full_name);
    setEditTitle(emp.job_title);
    setEditDept(emp.department);
    setEditRole(emp.role);
    setEditStatus(emp.status);
    setEditPhone(emp.phone || '');
    setEditAddress(emp.address || '');
    setEditBankAcc(emp.bank_account_number || '');
    setEditIfsc(emp.bank_ifsc || '');
    setEditPan(emp.pan_number || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    setEditLoading(true);
    try {
      await api.employees.update(selectedEmp.user_id, {
        full_name: editFullName,
        job_title: editTitle,
        department: editDept,
        role: editRole,
        status: editStatus,
        phone: editPhone,
        address: editAddress,
        bank_account_number: editBankAcc,
        bank_ifsc: editIfsc,
        pan_number: editPan
      });

      showToast('Profile Updated', 'success', `Saved changes for ${editFullName}`);
      setIsEditModalOpen(false);
      onRefresh();
    } catch (err: any) {
      showToast('Update Failed', 'error', err.message);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* Header & New Employee Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Workforce Directory</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage company employees, job titles, department assignments, and access roles.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenAdd}
          leftIcon={<UserPlus className="w-4 h-4" />}
          className="bg-purple-600 hover:bg-purple-500"
        >
          Add New Employee
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search by name, ID, or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Product">Product</option>
              <option value="Design">Design</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Marketing">Marketing</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Employee List Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Department & Role</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Joining Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No employees matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.user_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-xs">
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                            {emp.full_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {emp.employee_id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {emp.job_title}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {emp.department} • <span className="capitalize">{emp.role}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">
                      <div>{emp.email}</div>
                      <div className="text-[10px] text-slate-400">{emp.phone || '—'}</div>
                    </td>

                    <td className="py-3.5 px-3 text-slate-500">
                      {formatDate(emp.date_of_joining)}
                    </td>

                    <td className="py-3.5 px-3">
                      <Badge variant={emp.status === 'active' ? 'active' : 'inactive'}>
                        {emp.status}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setViewAsEmployee(emp);
                            showToast('Simulating Portal', 'info', `Switched to ${emp.full_name}'s view`);
                          }}
                          className="p-1.5 rounded-lg border border-purple-200 dark:border-purple-800/80 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-colors cursor-pointer"
                          title="Simulate Employee Portal"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(emp)}
                          leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                          className="text-xs py-1 px-2.5 h-7"
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ADD EMPLOYEE MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !addLoading && setIsAddModalOpen(false)}
        title="Onboard New Employee"
        description="Creates corporate authentication credentials and base salary package."
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Employee ID"
              value={newEmpId}
              onChange={(e) => setNewEmpId(e.target.value)}
              required
            />
            <Input
              label="Full Legal Name"
              placeholder="e.g. Maya Lin"
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              required
            />
          </div>

          <Input
            label="Corporate Email Address"
            type="email"
            placeholder="name@dayflow.internal"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Department
              </label>
              <select
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Design">Design</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="Operations">Operations</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Portal Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="employee">Standard Employee</option>
                <option value="admin">HR Administrator</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Job Designation"
              placeholder="e.g. Senior QA Engineer"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
            />

            <Input
              label="Base Monthly Wage ($)"
              type="number"
              value={newSalary}
              onChange={(e) => setNewSalary(e.target.value)}
              required
            />
          </div>

          <Input
            label="Initial Account Password"
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={addLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={addLoading}>
              Onboard Employee
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT EMPLOYEE MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => !editLoading && setIsEditModalOpen(false)}
        title={`Edit Profile: ${selectedEmp?.full_name}`}
        description="Update contact information, organizational tier, and banking identifiers."
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              required
            />
            <Input
              label="Job Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Department
              </label>
              <select
                value={editDept}
                onChange={(e) => setEditDept(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Design">Design</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Role
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="employee">Employee</option>
                <option value="admin">HR Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
            <Input
              label="Residential Address"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              placeholder="City, State"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Bank Account"
              value={editBankAcc}
              onChange={(e) => setEditBankAcc(e.target.value)}
            />
            <Input
              label="IFSC / Routing"
              value={editIfsc}
              onChange={(e) => setEditIfsc(e.target.value)}
            />
            <Input
              label="PAN / Tax ID"
              value={editPan}
              onChange={(e) => setEditPan(e.target.value)}
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={editLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={editLoading}>
              Save Profile
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
