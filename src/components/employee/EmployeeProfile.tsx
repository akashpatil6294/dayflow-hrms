import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { Input } from '../ui/Input.js';
import { Badge } from '../ui/Badge.js';
import { showToast } from '../ui/Toast.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { DocumentItem, Profile } from '../../types/index.js';
import { formatDate } from '../../lib/utils.js';
import {
  User,
  Upload,
  FileText,
  Download,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Camera,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface EmployeeProfileProps {
  profile: Profile | null;
  onProfileUpdated: () => void;
}

export const EmployeeProfile: React.FC<EmployeeProfileProps> = ({
  profile,
  onProfileUpdated
}) => {
  const { user, viewingAsEmployee } = useAuth();
  const activeProfile = viewingAsEmployee || profile;

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  // Editable fields state
  const [phone, setPhone] = useState(activeProfile?.phone || '');
  const [address, setAddress] = useState(activeProfile?.address || '');
  const [dob, setDob] = useState(activeProfile?.date_of_birth || '');
  const [gender, setGender] = useState(activeProfile?.gender || 'Not specified');
  const [bankAccount, setBankAccount] = useState(activeProfile?.bank_account_number || '');
  const [bankIfsc, setBankIfsc] = useState(activeProfile?.bank_ifsc || '');
  const [panNumber, setPanNumber] = useState(activeProfile?.pan_number || '');

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    if (!activeProfile) return;
    setDocsLoading(true);
    try {
      const data = await api.documents.list(activeProfile.user_id);
      setDocuments(data.documents);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [activeProfile?.user_id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;

    setLoading(true);
    try {
      await api.employees.update(activeProfile.user_id, {
        phone,
        address,
        date_of_birth: dob,
        gender,
        bank_account_number: bankAccount,
        bank_ifsc: bankIfsc,
        pan_number: panNumber
      });

      showToast('Profile Updated', 'success', 'Your personal details have been saved.');
      setIsEditing(false);
      onProfileUpdated();
    } catch (err: any) {
      showToast('Update Failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProfile) return;

    try {
      showToast('Uploading Document', 'info', file.name);
      await api.documents.upload(file, activeProfile.user_id);
      showToast('Document Uploaded', 'success', `${file.name} saved to secure vault.`);
      fetchDocuments();
    } catch (err: any) {
      showToast('Upload Failed', 'error', err.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast('Uploading Photo', 'info', 'Saving new profile photo...');
      await api.documents.uploadAvatar(file);
      showToast('Photo Updated', 'success', 'Your avatar has been updated.');
      onProfileUpdated();
    } catch (err: any) {
      showToast('Avatar Upload Failed', 'error', err.message);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* Top Profile Summary Card */}
      <Card className="p-6 sm:p-8 bg-white dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl font-bold uppercase shadow-md overflow-hidden">
                {activeProfile?.full_name?.charAt(0) || 'U'}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 bg-slate-950/50 rounded-2xl text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                title="Change Photo"
              >
                <Camera className="w-5 h-5" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {activeProfile?.full_name}
                </h1>
                <Badge variant={activeProfile?.status === 'active' ? 'active' : 'inactive'}>
                  {activeProfile?.status}
                </Badge>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-3">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {activeProfile?.job_title}
                </span>
                <span>•</span>
                <span>{activeProfile?.department}</span>
                <span>•</span>
                <span className="font-mono">ID: {activeProfile?.employee_id}</span>
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                <Mail className="w-3.5 h-3.5" />
                <span>{activeProfile?.email}</span>
              </div>
            </div>
          </div>

          <Button
            variant={isEditing ? 'outline' : 'primary'}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel Edit' : 'Edit Personal Details'}
          </Button>
        </div>
      </Card>

      {/* Main Details Form / Viewer */}
      <Card className="p-6">
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Section 1: Employment Details (Read-only for employees) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-100 dark:border-slate-800">
              Employment Records (HR Certified)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Corporate Role
                </span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold mt-1 block">
                  {activeProfile?.role === 'admin' ? 'HR Administrator' : 'Standard Employee'}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Department
                </span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold mt-1 block">
                  {activeProfile?.department}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Date of Joining
                </span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold mt-1 block">
                  {formatDate(activeProfile?.date_of_joining || '')}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Personal Details */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-100 dark:border-slate-800">
              Personal & Contact Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Input
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!isEditing}
                placeholder="+1 (555) 000-0000"
                leftIcon={<Phone className="w-4 h-4" />}
              />

              <Input
                label="Residential Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!isEditing}
                placeholder="Street address, City, State"
                leftIcon={<MapPin className="w-4 h-4" />}
              />

              <Input
                label="Date of Birth"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                disabled={!isEditing}
                leftIcon={<Calendar className="w-4 h-4" />}
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  disabled={!isEditing}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
                >
                  <option value="Not specified">Not specified</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Statutory & Banking Information */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-100 dark:border-slate-800">
              Banking & Statutory Identifiers
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <Input
                label="Direct Deposit Account No."
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                disabled={!isEditing}
                placeholder="Bank Account Number"
                leftIcon={<CreditCard className="w-4 h-4" />}
              />

              <Input
                label="IFSC / Routing Code"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value)}
                disabled={!isEditing}
                placeholder="e.g. DFLW0004921"
                leftIcon={<Building2 className="w-4 h-4" />}
              />

              <Input
                label="PAN / Tax ID"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value)}
                disabled={!isEditing}
                placeholder="e.g. ABCDE1234F"
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={loading}>
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </Card>

      {/* Authenticated Document Vault */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Encrypted Document Vault</span>
            </h3>
            <p className="text-xs text-slate-500">
              Upload compliance documents, government IDs, and tax declarations. Access is restricted to you and HR administrators.
            </p>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.docx,.txt"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Upload className="w-4 h-4" />}
            >
              Upload Document
            </Button>
          </div>
        </div>

        {/* Documents Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">File Name</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Size</th>
                <th className="py-3 px-3">Uploaded Date</th>
                <th className="py-3 px-3">Uploaded By</th>
                <th className="py-3 px-3 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No documents uploaded yet. Click "Upload Document" to add verified files.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>{doc.file_name}</span>
                    </td>
                    <td className="py-3 px-3 uppercase text-slate-500 font-mono text-[11px]">
                      {doc.file_type?.split('/')[1] || 'PDF'}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {formatFileSize(doc.file_size)}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {formatDate(doc.uploaded_at)}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {doc.uploader_name || 'System Admin'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <a
                        href={api.documents.downloadUrl(doc.id)}
                        download={doc.file_name}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
