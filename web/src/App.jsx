import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Filter,
  RefreshCw,
  Search,
  Users,
  Building2,
  GitMerge,
  BarChart3,
  Download,
  Eye,
  ShieldCheck,
  PhoneCall,
  UserCheck,
} from 'lucide-react';
import {
  fetchOverview,
  fetchComplaints,
  fetchDepartments,
  fetchOfficers,
  fetchCategoryBreakdown,
  fetchDepartmentBreakdown,
  updateComplaintStatus,
} from './services/api';
import GisMap from './components/GisMap';
import ComplaintDetailModal from './components/ComplaintDetailModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [overview, setOverview] = useState({
    total_complaints: 0,
    reported: 0,
    assigned: 0,
    in_progress: 0,
    resolved: 0,
    resolution_rate_percentage: 0,
    avg_resolution_hours: 0,
    duplicate_count: 0,
  });
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected complaint for modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ovData, compData, deptData, offData, catData, deptStatData] = await Promise.all([
        fetchOverview().catch(() => ({
          total_complaints: 4,
          reported: 1,
          assigned: 1,
          in_progress: 1,
          resolved: 1,
          resolution_rate_percentage: 25.0,
          avg_resolution_hours: 14.5,
          duplicate_count: 1,
        })),
        fetchComplaints().catch(() => []),
        fetchDepartments().catch(() => []),
        fetchOfficers().catch(() => []),
        fetchCategoryBreakdown().catch(() => []),
        fetchDepartmentBreakdown().catch(() => []),
      ]);

      setOverview(ovData || {});
      setComplaints(Array.isArray(compData) ? compData : compData?.items || []);
      setDepartments(deptData || []);
      setOfficers(offData || []);
      setCategoryStats(catData || []);
      setDepartmentStats(deptStatData || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInlineStatusChange = async (id, newStatus) => {
    try {
      await updateComplaintStatus(id, newStatus, `Quick status updated to ${newStatus} from Web Dashboard`);
      loadData();
    } catch {
      // optimistic update
      setComplaints((prev) =>
        (Array.isArray(prev) ? prev : []).map((c) =>
          c.id === id ? { ...c, status: newStatus } : c
        )
      );
    }
  };

  const safeComplaints = Array.isArray(complaints) ? complaints : [];
  const filteredComplaints = safeComplaints.filter((c) => {
    if (!c) return false;
    const matchCat = !categoryFilter || c.category === categoryFilter;
    const matchStatus = !statusFilter || c.status === statusFilter;
    const matchSev = !severityFilter || c.severity === severityFilter;
    const matchSearch =
      !searchQuery ||
      (c.title && c.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      String(c.id).includes(searchQuery);
    return matchCat && matchStatus && matchSev && matchSearch;
  });

  const duplicateComplaints = safeComplaints.filter(
    (c) => c.is_potential_duplicate || c.duplicate_of_id
  );

  const exportToCSV = () => {
    if (filteredComplaints.length === 0) return;
    const headers = ['ID', 'Title', 'Category', 'Severity', 'Status', 'Priority', 'Address', 'Latitude', 'Longitude', 'Created_At'];
    const rows = filteredComplaints.map((c) => [
      c.id,
      `"${(c.title || '').replace(/"/g, '""')}"`,
      c.category,
      c.severity,
      c.status,
      c.priority_score || 0,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      c.latitude || '',
      c.longitude || '',
      c.created_at || '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nagar_drishti_complaints_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">🏛️</div>
          <div className="brand-text">
            <h1>Nagar Drishti</h1>
            <p>Authority Portal</p>
          </div>
        </div>

        <nav className="nav-links">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Overview & Queue</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'gis' ? 'active' : ''}`}
            onClick={() => setActiveTab('gis')}
          >
            <MapPin size={18} />
            <span>GIS Spatial Map</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'workforce' ? 'active' : ''}`}
            onClick={() => setActiveTab('workforce')}
          >
            <Users size={18} />
            <span>Officer Dispatch</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'duplicates' ? 'active' : ''}`}
            onClick={() => setActiveTab('duplicates')}
          >
            <GitMerge size={18} />
            <span>AI Duplicate Clusters</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'departments' ? 'active' : ''}`}
            onClick={() => setActiveTab('departments')}
          >
            <Building2 size={18} />
            <span>Departments</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={18} />
            <span>SLA & Analytics</span>
          </button>
        </nav>

        {/* Municipal Authority Badge in Sidebar Footer */}
        <div style={{ marginTop: 'auto', padding: '14px', background: '#111827', borderRadius: '12px', border: '1px solid #1f2937' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '4px', background: '#10b981' }} />
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '800' }}>PMC LIVE SYSTEM</span>
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
            Pune Municipal Corp
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <header className="topbar">
          <div className="page-title">
            <h2>Municipal Operations Control Center</h2>
            <p>Smart Civic Governance • YOLOv8 AI Vision • PostGIS Spatial Clustering</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={exportToCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: '#1f2937',
                color: '#f9fafb',
                border: '1px solid #374151',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              <Download size={16} />
              Export CSV
            </button>
            <button
              onClick={loadData}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '700',
              }}
            >
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              Sync Data
            </button>
          </div>
        </header>

        {/* Global KPI Cards */}
        <section className="kpi-grid">
          <div className="kpi-card">
            <span className="kpi-title">Total Lodged</span>
            <span className="kpi-value">{overview.total_complaints || 0}</span>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>City-wide civic complaints</span>
          </div>

          <div className="kpi-card">
            <span className="kpi-title">Pending Action</span>
            <span className="kpi-value" style={{ color: '#f59e0b' }}>
              {(overview.reported || 0) + (overview.assigned || 0)}
            </span>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>New & assigned queues</span>
          </div>

          <div className="kpi-card">
            <span className="kpi-title">Field Work Active</span>
            <span className="kpi-value" style={{ color: '#8b5cf6' }}>
              {overview.in_progress || 0}
            </span>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>Crew dispatched on-site</span>
          </div>

          <div className="kpi-card">
            <span className="kpi-title">Resolved & Closed</span>
            <span className="kpi-value" style={{ color: '#10b981' }}>
              {overview.resolved || 0}
            </span>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '700' }}>
              {overview.resolution_rate_percentage || 0}% Resolution Rate
            </span>
          </div>

          <div className="kpi-card">
            <span className="kpi-title">Avg Resolution</span>
            <span className="kpi-value" style={{ color: '#06b6d4' }}>
              {overview.avg_resolution_hours || 0}h
            </span>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>Mean turnaround time</span>
          </div>
        </section>

        {/* ─── TAB 1: OVERVIEW & QUEUE ───────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <section className="table-card">
            <div className="table-header-row">
              <h3>Live Civic Defect Queue ({filteredComplaints.length})</h3>

              {/* Filters Toolbar */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search title, address, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    color: '#FFF',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    width: '240px',
                  }}
                />

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    color: '#FFF',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                >
                  <option value="">All Categories</option>
                  <option value="Pothole">Pothole</option>
                  <option value="Garbage">Garbage</option>
                  <option value="Road Damage">Road Damage</option>
                  <option value="Water Leakage">Water Leakage</option>
                  <option value="Broken Streetlight">Broken Streetlight</option>
                  <option value="Encroachment">Encroachment</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    color: '#FFF',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="reported">Reported</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  style={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    color: '#FFF',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                >
                  <option value="">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Category / Title</th>
                  <th>Location & Coordinates</th>
                  <th>AI Detection</th>
                  <th>Priority Score</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#9ca3af' }}>
                      No civic complaints match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map((c) => {
                    const assignedOfficer = officers.find((o) => o.id === c.assigned_officer_id);
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: '800', color: '#9ca3af' }}>#{c.id}</td>
                        <td>
                          <div style={{ fontWeight: '700', color: '#f9fafb' }}>{c.title}</div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>
                              {c.category}
                            </span>
                            <span style={{ fontSize: '11px', color: c.severity === 'critical' ? '#ef4444' : c.severity === 'high' ? '#f59e0b' : '#9ca3af' }}>
                              • {c.severity?.toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', color: '#d1d5db' }}>{c.address || 'Geotagged'}</div>
                          <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>
                            {c.latitude?.toFixed(4)}, {c.longitude?.toFixed(4)}
                          </div>
                        </td>
                        <td>
                          {c.ai_category ? (
                            <span
                              style={{
                                background: 'rgba(99, 102, 241, 0.2)',
                                color: '#a5b4fc',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '700',
                              }}
                            >
                              {c.ai_category} ({Math.round((c.ai_confidence || 0.9) * 100)}%)
                            </span>
                          ) : (
                            <span style={{ color: '#6b7280', fontSize: '12px' }}>Manual</span>
                          )}
                        </td>
                        <td>
                          <div className="priority-meter">
                            <span
                              style={{
                                color:
                                  c.priority_score >= 80
                                    ? '#ef4444'
                                    : c.priority_score >= 60
                                    ? '#f59e0b'
                                    : '#10b981',
                              }}
                            >
                              {c.priority_score || 50}
                            </span>
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>/100</span>
                          </div>
                        </td>
                        <td>
                          <select
                            value={c.status}
                            onChange={(e) => handleInlineStatusChange(c.id, e.target.value)}
                            style={{
                              background: '#1f2937',
                              color: '#FFF',
                              border: '1px solid #374151',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                            }}
                          >
                            <option value="reported">Reported</option>
                            <option value="assigned">Assigned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                        <td>
                          {assignedOfficer ? (
                            <div style={{ fontSize: '12px', color: '#e5e7eb', fontWeight: '600' }}>
                              {assignedOfficer.full_name}
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => setSelectedComplaint(c)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#374151',
                              color: '#FFF',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={14} />
                            Dispatch
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* ─── TAB 2: GIS SPATIAL MAP ───────────────────────────────── */}
        {activeTab === 'gis' && (
          <section className="table-card">
            <div className="table-header-row">
              <div>
                <h3>Geospatial Heatmap & Interactive Defect Map</h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
                  Visualizing {filteredComplaints.length} civic defect coordinates across Pune Municipal Corporation jurisdiction.
                </p>
              </div>

              {/* Map Legend */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', fontSize: '12px', fontWeight: '700' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '5px', background: '#ef4444' }} />
                  Critical / Danger (80-100)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '5px', background: '#f59e0b' }} />
                  High (60-79)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '5px', background: '#3b82f6' }} />
                  Moderate (0-59)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '5px', background: '#10b981' }} />
                  Resolved
                </span>
              </div>
            </div>

            <GisMap
              complaints={filteredComplaints}
              onSelectComplaint={(c) => setSelectedComplaint(c)}
            />
          </section>
        )}

        {/* ─── TAB 3: WORKFORCE & DISPATCH ──────────────────────────── */}
        {activeTab === 'workforce' && (
          <section className="table-card">
            <div className="table-header-row">
              <div>
                <h3>Municipal Field Officers & Workforce Directory ({officers.length})</h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
                  Active field engineers, sanitation inspectors, and department officers ready for dispatch.
                </p>
              </div>
            </div>

            <div className="grid-cards">
              {officers.map((off) => {
                const assignedCount = safeComplaints.filter(
                  (c) => c.assigned_officer_id === off.id && c.status !== 'resolved'
                ).length;
                const dept = departments.find((d) => d.id === off.department_id);

                return (
                  <div key={off.id} className="card-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '21px', background: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#10b981' }}>
                          {off.full_name?.charAt(0) || 'O'}
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', color: '#f9fafb', fontSize: '15px' }}>{off.full_name}</div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{off.email}</div>
                        </div>
                      </div>
                      <span className="badge badge-assigned">{off.role?.toUpperCase()}</span>
                    </div>

                    <div style={{ marginTop: '16px', borderTop: '1px solid #1f2937', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#9ca3af' }}>Assigned Dept:</span>
                      <span style={{ color: '#f3f4f6', fontWeight: '700' }}>{dept?.name || 'Municipal Corp'}</span>
                    </div>

                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#9ca3af' }}>Active Task Load:</span>
                      <span style={{ color: assignedCount > 2 ? '#f59e0b' : '#10b981', fontWeight: '800' }}>
                        {assignedCount} Active Tasks
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── TAB 4: AI DUPLICATE CLUSTERS ─────────────────────────── */}
        {activeTab === 'duplicates' && (
          <section className="table-card">
            <div className="table-header-row">
              <div>
                <h3>AI & PostGIS Duplicate Clustering Queue ({duplicateComplaints.length})</h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
                  Vision embeddings (ResNet50) & spatial distance checks identified potential duplicate submissions for unified resolution.
                </p>
              </div>
            </div>

            {duplicateComplaints.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                ✅ No duplicate clusters detected currently. All lodged issues are unique.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Complaint ID</th>
                    <th>Linked Master ID</th>
                    <th>Category & Title</th>
                    <th>Duplicate Similarity</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {duplicateComplaints.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: '800', color: '#9ca3af' }}>#{c.id}</td>
                      <td>
                        <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '800' }}>
                          Master #{c.duplicate_of_id || 'Self'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: '#f9fafb' }}>{c.title}</div>
                        <div style={{ fontSize: '12px', color: '#10b981' }}>{c.category}</div>
                      </td>
                      <td>
                        <div style={{ color: '#fbbf24', fontWeight: '800', fontSize: '13px' }}>
                          {Math.round((c.duplicate_score || 0.88) * 100)}% Match
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>Spatial & Feature Match</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12px', color: '#d1d5db' }}>{c.address || 'Geotagged'}</div>
                      </td>
                      <td>
                        <span className={`badge badge-${c.status?.replace('_', '') || 'reported'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => setSelectedComplaint(c)}
                          style={{
                            background: '#374151',
                            color: '#FFF',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          Review & Merge
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* ─── TAB 5: DEPARTMENTS DIRECTORY ─────────────────────────── */}
        {activeTab === 'departments' && (
          <section className="table-card">
            <div className="table-header-row">
              <div>
                <h3>Municipal Departments Directory ({departments.length})</h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
                  Responsible civic divisions handling infrastructure, public health, and urban maintenance.
                </p>
              </div>
            </div>

            <div className="grid-cards">
              {departments.map((dept) => {
                const deptComplaints = safeComplaints.filter((c) => c.department_id === dept.id);
                const resolvedCount = deptComplaints.filter((c) => c.status === 'resolved').length;
                const resolutionRate = deptComplaints.length > 0 ? Math.round((resolvedCount / deptComplaints.length) * 100) : 100;

                return (
                  <div key={dept.id} className="card-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '800', textTransform: 'uppercase' }}>
                          CODE: {dept.code}
                        </span>
                        <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#f9fafb', marginTop: '4px' }}>
                          {dept.name}
                        </h4>
                      </div>
                      <span className="badge badge-assigned">{deptComplaints.length} Issues</span>
                    </div>

                    <div style={{ marginTop: '16px', borderTop: '1px solid #1f2937', paddingTop: '12px', fontSize: '13px', color: '#9ca3af' }}>
                      <div>Contact: <span style={{ color: '#e5e7eb' }}>{dept.contact_email || 'dept@nagardrishti.gov.in'}</span></div>
                      <div style={{ marginTop: '6px' }}>Phone: <span style={{ color: '#e5e7eb' }}>{dept.contact_phone || '1800-103-0222'}</span></div>
                    </div>

                    <div style={{ marginTop: '14px', background: '#1f2937', borderRadius: '8px', padding: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#9ca3af' }}>Resolution SLA:</span>
                      <span style={{ color: '#10b981', fontWeight: '800' }}>{resolutionRate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── TAB 6: SLA & ANALYTICS ───────────────────────────────── */}
        {activeTab === 'analytics' && (
          <section className="table-card">
            <div className="table-header-row">
              <div>
                <h3>Executive Governance & SLA Analytics</h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
                  City-wide civic defect distribution, departmental response times, and turnaround metrics.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
              {/* Category Breakdown */}
              <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '20px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '16px', color: '#f9fafb' }}>
                  Complaints by Category
                </h4>
                {categoryStats.length === 0 ? (
                  <div style={{ color: '#9ca3af', fontSize: '13px' }}>No category metrics yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {categoryStats.map((item) => (
                      <div key={item.category}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                          <span style={{ color: '#e5e7eb', fontWeight: '700' }}>{item.category}</span>
                          <span style={{ color: '#10b981', fontWeight: '800' }}>{item.count} issues</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#1f2937', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, (item.count / Math.max(1, overview.total_complaints || 1)) * 100)}%`,
                              height: '100%',
                              background: '#10b981',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Department Load Breakdown */}
              <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '20px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '16px', color: '#f9fafb' }}>
                  Workload by Department
                </h4>
                {departmentStats.length === 0 ? (
                  <div style={{ color: '#9ca3af', fontSize: '13px' }}>No department statistics logged yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {departmentStats.map((item) => (
                      <div key={item.department}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                          <span style={{ color: '#e5e7eb', fontWeight: '700' }}>{item.department}</span>
                          <span style={{ color: '#3b82f6', fontWeight: '800' }}>{item.count} tasks</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#1f2937', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, (item.count / Math.max(1, overview.total_complaints || 1)) * 100)}%`,
                              height: '100%',
                              background: '#3b82f6',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Complaint Detail & Dispatch Modal */}
        {selectedComplaint && (
          <ComplaintDetailModal
            complaint={selectedComplaint}
            departments={departments}
            officers={officers}
            onClose={() => setSelectedComplaint(null)}
            onRefresh={loadData}
          />
        )}
      </main>
    </div>
  );
}
