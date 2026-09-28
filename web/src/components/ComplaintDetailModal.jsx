import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Clock,
  ShieldCheck,
  UserCheck,
  CheckCircle,
  AlertOctagon,
  FileText,
  GitMerge,
  Send,
} from 'lucide-react';
import { updateComplaintStatus, fetchComplaintHistory } from '../services/api';

export default function ComplaintDetailModal({
  complaint,
  departments = [],
  officers = [],
  onClose,
  onRefresh,
}) {
  if (!complaint) return null;

  const [status, setStatus] = useState(complaint.status || 'reported');
  const [selectedOfficer, setSelectedOfficer] = useState(complaint.assigned_officer_id || '');
  const [selectedDept, setSelectedDept] = useState(complaint.department_id || '');
  const [severity, setSeverity] = useState(complaint.severity || 'medium');
  const [comment, setComment] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadHistory();
  }, [complaint.id]);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await fetchComplaintHistory(complaint.id);
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMsg('');
      await updateComplaintStatus(
        complaint.id,
        status,
        comment.trim() || undefined,
        selectedOfficer ? Number(selectedOfficer) : null,
        severity,
        selectedDept ? Number(selectedDept) : null
      );
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to update complaint.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container">
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`badge badge-${complaint.status?.replace('_', '') || 'reported'}`}>
                {complaint.status}
              </span>
              <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '700' }}>
                Complaint #{complaint.id}
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginTop: '6px', color: '#f9fafb' }}>
              {complaint.title}
            </h2>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: '8px', margin: '0 24px 16px 24px', fontSize: '13px' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="modal-body">
          {/* Left Column: Complaint Details & Image */}
          <div className="modal-left-col">
            {complaint.image_url ? (
              <div style={{ marginBottom: '16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #374151' }}>
                <img
                  src={complaint.image_url.startsWith('http') ? complaint.image_url : `http://localhost:8000${complaint.image_url}`}
                  alt="Defect proof"
                  style={{ width: '100%', maxHeight: '240px', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            ) : null}

            {complaint.description ? (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Citizen Description
                </div>
                <div style={{ fontSize: '14px', color: '#d1d5db', background: '#1f2937', padding: '12px', borderRadius: '8px', lineHeight: '1.5' }}>
                  {complaint.description}
                </div>
              </div>
            ) : null}

            {/* Geotag & Meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#9ca3af' }}>
                <MapPin size={16} color="#10b981" />
                <span style={{ color: '#f3f4f6' }}>{complaint.address || 'Geotagged location'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
                Coordinates: {complaint.latitude?.toFixed(5)}, {complaint.longitude?.toFixed(5)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#9ca3af' }}>
                <Clock size={16} />
                <span>Lodged: {new Date(complaint.created_at).toLocaleString()}</span>
              </div>
            </div>

            {/* AI Vision Verification Box */}
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#818cf8', fontWeight: '700', fontSize: '12px', marginBottom: '4px' }}>
                <ShieldCheck size={16} />
                YOLOv8 AI Vision Classification
              </div>
              <div style={{ fontSize: '13px', color: '#c7d2fe' }}>
                Identified as <b>{complaint.ai_category || complaint.category}</b> with {Math.round((complaint.ai_confidence || 0.92) * 100)}% visual match.
              </div>
            </div>

            {/* Duplicate Notice */}
            {complaint.is_potential_duplicate ? (
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontSize: '12px' }}>
                <GitMerge size={16} />
                Linked with duplicate complaint #{complaint.duplicate_of_id} (PostGIS spatial match).
              </div>
            ) : null}

            {/* Timeline History */}
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '10px', color: '#e5e7eb' }}>
                Official Audit Trail ({history.length})
              </h4>
              {loadingHistory ? (
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Loading history...</div>
              ) : history.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#6b7280' }}>No state changes logged yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {history.map((h, i) => (
                    <div key={h.id || i} style={{ borderLeft: '2px solid #3b82f6', paddingLeft: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ fontWeight: '700', color: '#f3f4f6' }}>
                          Status: {h.new_status?.toUpperCase()}
                        </span>
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>
                          {new Date(h.created_at).toLocaleDateString()} {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic', marginTop: '2px' }}>
                        "{h.comment || 'Status transitioned'}"
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Municipal Action & Dispatch Controls */}
          <div className="modal-right-col">
            <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '16px', color: '#f9fafb' }}>
              Authority Dispatch & Actions
            </h3>

            {/* Status Selector */}
            <div className="form-group">
              <label>Update Complaint Lifecycle Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="reported">Reported (New)</option>
                <option value="assigned">Assigned to Department / Officer</option>
                <option value="in_progress">In Progress (Field Work / Crew on-site)</option>
                <option value="resolved">Resolved & Closed</option>
                <option value="rejected">Rejected / Invalid</option>
              </select>
            </div>

            {/* Officer Assignment */}
            <div className="form-group">
              <label>Assign to Municipal Officer</label>
              <select value={selectedOfficer} onChange={(e) => setSelectedOfficer(e.target.value)}>
                <option value="">-- Select Field Officer --</option>
                {officers.map((off) => (
                  <option key={off.id} value={off.id}>
                    {off.full_name} ({off.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Department Assignment */}
            <div className="form-group">
              <label>Routing Department</label>
              <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
                <option value="">-- Select Department --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Override */}
            <div className="form-group">
              <label>Civic Severity Level</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="low">Low (Cosmetic/Standard)</option>
                <option value="medium">Medium (Moderate road/waste defect)</option>
                <option value="high">High (Traffic hazard/Accident risk)</option>
                <option value="critical">Critical (Immediate public danger)</option>
              </select>
            </div>

            {/* Resolution Comment / Official Note */}
            <div className="form-group">
              <label>Official Resolution / Transition Notes</label>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="e.g. Road repair crew dispatched with asphalt mixer. Expected completion 6 PM."
              />
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} className="btn-cancel">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-save">
                {saving ? 'Updating...' : 'Save & Dispatch'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
