import React, { useState } from 'react';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { Badge } from '../ui/Badge.js';
import { Modal } from '../ui/Modal.js';
import { showToast } from '../ui/Toast.js';
import { api } from '../../lib/api.js';
import { LeaveRequest } from '../../types/index.js';
import { formatDate } from '../../lib/utils.js';
import {
  CheckSquare,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

interface AdminLeaveApprovalsProps {
  requests: LeaveRequest[];
  onRefresh: () => void;
}

export const AdminLeaveApprovals: React.FC<AdminLeaveApprovalsProps> = ({
  requests,
  onRefresh
}) => {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Review Modal State
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (departmentFilter !== 'all' && r.department !== departmentFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        (r.employee_name && r.employee_name.toLowerCase().includes(q)) ||
        (r.employee_id && r.employee_id.toLowerCase().includes(q)) ||
        r.remarks.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const openReviewModal = (req: LeaveRequest, action: 'approved' | 'rejected') => {
    setSelectedRequest(req);
    setReviewAction(action);
    setReviewComment(
      action === 'approved'
        ? 'Approved per department guidelines.'
        : 'Unfortunately cannot be approved due to sprint handoff constraints.'
    );
  };

  const handleConfirmReview = async () => {
    if (!selectedRequest) return;

    setReviewLoading(true);
    try {
      await api.leave.review({
        request_id: selectedRequest.id,
        status: reviewAction,
        comment: reviewComment.trim()
      });

      showToast(
        reviewAction === 'approved' ? 'Leave Approved' : 'Leave Rejected',
        reviewAction === 'approved' ? 'success' : 'warning',
        `Processed application for ${selectedRequest.employee_name}`
      );
      setSelectedRequest(null);
      onRefresh();
    } catch (err: any) {
      showToast('Review Failed', 'error', err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* Header & Pending Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Leave Approvals Center</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review, approve, or reject employee time-off requests with optional reviewer notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            {pendingCount} Pending Decisions
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by employee name or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold"
            >
              <option value="pending">Pending Queue</option>
              <option value="approved">Approved Requests</option>
              <option value="rejected">Rejected Requests</option>
              <option value="all">All Submissions</option>
            </select>

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
          </div>
        </div>
      </Card>

      {/* Requests List */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Applicant</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Date Range</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Applicant Remarks</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No requests found matching current filter ({statusFilter}).
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {req.employee_name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {req.department} • {req.employee_id}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {req.leave_type} Leave
                    </td>

                    <td className="py-3.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {req.start_date} → {req.end_date}
                    </td>

                    <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                      {req.days_count} {req.days_count === 1 ? 'day' : 'days'}
                    </td>

                    <td className="py-3.5 px-3 max-w-xs text-slate-600 dark:text-slate-400 truncate" title={req.remarks}>
                      {req.remarks}
                    </td>

                    <td className="py-3.5 px-3">
                      <Badge variant={req.status}>{req.status}</Badge>
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => openReviewModal(req, 'approved')}
                            className="text-xs py-1 px-2.5 h-7"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => openReviewModal(req, 'rejected')}
                            className="text-xs py-1 px-2.5 h-7"
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 italic max-w-xs truncate" title={req.review_comment || ''}>
                          {req.review_comment || `Processed by ${req.reviewed_by_name || 'HR Admin'}`}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review Confirmation Modal */}
      <Modal
        isOpen={Boolean(selectedRequest)}
        onClose={() => !reviewLoading && setSelectedRequest(null)}
        title={reviewAction === 'approved' ? 'Approve Time Off Request' : 'Reject Time Off Request'}
        description={`Confirm decision for ${selectedRequest?.employee_name} (${selectedRequest?.leave_type} leave)`}
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Applicant:</span>
              <strong className="text-slate-900 dark:text-slate-100">{selectedRequest?.employee_name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Department:</span>
              <span>{selectedRequest?.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Requested Period:</span>
              <span className="font-mono">{selectedRequest?.start_date} to {selectedRequest?.end_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Business Days:</span>
              <strong className="text-emerald-600 dark:text-emerald-400">{selectedRequest?.days_count} Days</strong>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 block mb-0.5">Reason:</span>
              <p className="text-slate-700 dark:text-slate-300 italic">"{selectedRequest?.remarks}"</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              HR Reviewer Note (Optional)
            </label>
            <textarea
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Add review feedback or handoff instructions..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedRequest(null)}
              disabled={reviewLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={reviewAction === 'approved' ? 'success' : 'danger'}
              onClick={handleConfirmReview}
              isLoading={reviewLoading}
            >
              Confirm {reviewAction === 'approved' ? 'Approval' : 'Rejection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
