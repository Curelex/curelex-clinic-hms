// hms-react/src/pages/PatientDocuments.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import API from '../utils/api';
import '../css/PatientDashboard.css';
import PatientSidebar from '../components/PatientSidebar';

const CATEGORIES = ['Lab Report', 'Scan / Imaging', 'Prescription', 'Discharge Summary', 'Insurance', 'Other'];

const CATEGORY_ICON = {
  'Lab Report': '🧪',
  'Scan / Imaging': '🩻',
  'Prescription': '💊',
  'Discharge Summary': '📄',
  'Insurance': '🛡️',
  'Other': '📁',
};

function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.toDateString() === db.toDateString();
}

export default function PatientDocuments() {
  const { user, patient, logout, isPatient } = useAuth();
  const navigate = useNavigate();

  const patientId = patient?._id || patient?.id || user?.id || user?._id;
  const patientName = patient?.name || user?.name || 'Patient';
  const patientEmail = patient?.email || user?.email || '';

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Upload form state ──
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('Lab Report');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // ── Preview modal ──
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/patient-login'); return; }
    if (!isPatient()) { navigate('/'); return; }
    loadDocuments();
  }, []); // eslint-disable-line

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/documents/patient/${patientId}`);
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
    setLoading(false);
  };

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    setUploadError('');
    if (!f) { setFile(null); return; }
    const okType = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(f.type);
    if (!okType) { setUploadError('Only PDF and image files (jpg, png, webp) are allowed'); setFile(null); return; }
    if (f.size > 15 * 1024 * 1024) { setUploadError('File must be under 15MB'); setFile(null); return; }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) { setUploadError('Please choose a file first'); return; }
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientId', patientId);
      formData.append('category', category);
      formData.append('description', description);

      await API.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFile(null);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadDocuments();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (doc) => {
    try {
      const res = await API.get(`/documents/file/${doc._id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      setPreviewUrl(url);
      setPreviewDoc(doc);
    } catch (err) {
      alert('Failed to open file');
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewDoc(null);
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.originalName}"? This cannot be undone.`)) return;
    try {
      await API.delete(`/documents/${doc._id}`);
      loadDocuments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleToggleVisibility = async (docId, visibleToDoctor) => {
    try {
      await API.patch(`/documents/${docId}/visibility`, { visibleToDoctor });
      setDocuments(prev => prev.map(d => d._id === docId ? { ...d, visibleToDoctor } : d));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update document visibility');
    }
  };

  const handleLogout = () => { logout(); navigate('/patient-login'); };
  const goTo = (path) => { setSidebarOpen(false); navigate(path); };

  const initials = patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: '#2d6be4' }}></i>
          <p style={{ marginTop: '1rem', color: '#6b7a99' }}>Loading your documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pd-layout">
      <header className="pd-topbar">
        <div className="pd-topbar__left">
          <button className="pd-hamburger" onClick={() => setSidebarOpen(true)}>
            <i className="fas fa-bars"></i>
          </button>
          <Link to="/patient-dashboard" className="pd-topbar__title">My Health</Link>
        </div>
        <div className="pd-topbar__right">
          <div className="pd-user-menu">
            <div className="pd-user-menu__trigger">
              <div className="pd-user-menu__avatar">{initials}</div>
              <span className="pd-user-menu__name">{patientName}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="pd-below-header">
        <div className={`pd-sidebar-overlay${sidebarOpen ? ' visible' : ''}`} onClick={() => setSidebarOpen(false)} />


        <PatientSidebar
          activeItem="xxxx"
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          patientName={patientName}
          patientEmail={patientEmail}
          initials={initials}
        />

        <div className="pd-main">
          <main className="pd-body">
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a2236' }}>
                📁 My Documents
              </h2>
              <p style={{ margin: '4px 0 0', color: '#6b7a99', fontSize: 14 }}>
                Upload your lab reports, scans, and other medical documents — your doctor can view them
                directly during your visit, no need to carry physical copies.
              </p>
            </div>

            {/* ── Upload card ── */}
            <div className="pd-card" style={{ marginBottom: 20 }}>
              <div className="pd-card__head">
                <div className="pd-card__head-icon"><i className="fas fa-cloud-upload-alt"></i></div>
                <h3>Upload a Document</h3>
              </div>
              <div className="pd-card__body" style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                      Category
                    </label>
                    <select
                      className="form-control"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{CATEGORY_ICON[c]} {c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                      File (PDF or Image, max 15MB)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="form-control"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. CBC report, 18 Jun 2026"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>

                {file && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
                    background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '8px 12px',
                  }}>
                    <i className="fas fa-paperclip"></i>
                    <span style={{ fontWeight: 600 }}>{file.name}</span>
                    <span style={{ color: '#64748b' }}>({formatBytes(file.size)})</span>
                  </div>
                )}

                {uploadError && (
                  <div style={{ fontSize: 13, color: '#dc2626', background: '#fee2e2', borderRadius: 8, padding: '8px 12px' }}>
                    ⚠️ {uploadError}
                  </div>
                )}

                <button
                  className="pd-btn pd-btn--primary"
                  onClick={handleUpload}
                  disabled={uploading || !file}
                  style={{ justifySelf: 'start' }}
                >
                  {uploading ? 'Uploading…' : <><i className="fas fa-upload"></i> Upload Document</>}
                </button>
              </div>
            </div>

            {/* ── Document list ── */}
            <div className="pd-card">
              <div className="pd-card__head">
                <div className="pd-card__head-icon"><i className="fas fa-folder-open"></i></div>
                <h3>All Documents ({documents.length})</h3>
              </div>
              <div className="pd-card__body" style={{ padding: documents.length ? 0 : 24 }}>
                {documents.length === 0 && (
                  <div className="pd-empty">
                    <i className="fas fa-folder-open"></i> No documents uploaded yet
                  </div>
                )}
                {documents.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Date</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Category</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>File</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Size</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Share with Doctor</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map(doc => {
                          const today = isSameDay(doc.createdAt, new Date());
                          return (
                            <tr key={doc._id} style={{
                              borderBottom: '1px solid #f1f3f6',
                              background: today ? '#f0fdf4' : 'transparent',
                            }}>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>
                                {new Date(doc.createdAt).toLocaleDateString('en-US', {
                                  day: 'numeric', month: 'short', year: 'numeric',
                                })}
                                {today && (
                                  <span style={{
                                    marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#fff',
                                    background: '#16a34a', borderRadius: 20, padding: '2px 7px',
                                  }}>
                                    Today
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>
                                {CATEGORY_ICON[doc.category] || '📁'} {doc.category}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>
                                <div style={{ fontWeight: 600 }}>{doc.originalName}</div>
                                {doc.description && (
                                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{doc.description}</div>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#64748b' }}>
                                {formatBytes(doc.fileSize)}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <button
                                    onClick={() => handleToggleVisibility(doc._id, !doc.visibleToDoctor)}
                                    style={{
                                      position: 'relative',
                                      width: 44,
                                      height: 22,
                                      borderRadius: 100,
                                      background: doc.visibleToDoctor ? '#2563eb' : '#cbd5e1',
                                      border: 'none',
                                      cursor: 'pointer',
                                      transition: 'background-color 0.2s',
                                      padding: 0,
                                    }}
                                  >
                                    <div style={{
                                      position: 'absolute',
                                      top: 2,
                                      left: doc.visibleToDoctor ? 24 : 2,
                                      width: 18,
                                      height: 18,
                                      borderRadius: '50%',
                                      background: '#fff',
                                      transition: 'left 0.2s',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                    }} />
                                  </button>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: doc.visibleToDoctor ? '#2563eb' : '#64748b' }}>
                                    {doc.visibleToDoctor ? 'ON' : 'OFF'}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button className="btn btn-sm btn-ghost" onClick={() => handleView(doc)}>View</button>
                                  <button
                                    className="btn btn-sm btn-ghost"
                                    style={{ color: '#dc2626' }}
                                    onClick={() => handleDelete(doc)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* ── Preview Modal ── */}
      {previewUrl && previewDoc && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20,
          }}
          onClick={closePreview}
        >
          <div
            style={{
              background: '#fff', borderRadius: 12, width: '100%', maxWidth: 800,
              maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 18px', borderBottom: '1px solid #e2e8f0',
            }}>
              <strong style={{ fontSize: 14 }}>{previewDoc.originalName}</strong>
              <button onClick={closePreview} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', background: '#f1f5f9' }}>
              {previewDoc.mimeType === 'application/pdf' ? (
                <iframe src={previewUrl} title="document" style={{ width: '100%', height: '75vh', border: 'none' }} />
              ) : (
                <img src={previewUrl} alt={previewDoc.originalName} style={{ width: '100%', display: 'block' }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}