// hms-react/src/components/PatientDocumentsModal.jsx
import React, { useState, useEffect } from 'react';
import API from '../utils/api';

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

// ── props ──────────────────────────────────────────────────────
// patientId   - required, the Patient _id to fetch documents for
// patientName - display name in the header
// visitDate   - Date (or date string) of the current token/visit;
//               documents uploaded on the same calendar day are
//               highlighted as "This visit"
// onClose     - close handler
export default function PatientDocumentsModal({ patientId, patientName, visitDate, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    if (!patientId) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await API.get(`/documents/patient/${patientId}`);
        setDocuments(data.documents || []);
      } catch (err) {
        console.error('Failed to load patient documents:', err);
      }
      setLoading(false);
    })();
  }, [patientId]);

  const handleView = async (doc) => {
    try {
      const res = await API.get(`/documents/file/${doc._id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      setPreviewUrl(url);
      setPreviewDoc(doc);
    } catch {
      alert('Failed to open file');
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewDoc(null);
  };

  const thisVisitDocs = visitDate ? documents.filter(d => isSameDay(d.createdAt, visitDate)) : [];
  const otherDocs      = visitDate ? documents.filter(d => !isSameDay(d.createdAt, visitDate)) : documents;

  const renderRow = (doc, highlighted) => (
    <div key={doc._id} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 14px', borderRadius: 8, marginBottom: 8,
      background: highlighted ? '#f0fdf4' : '#f8fafc',
      border: `1px solid ${highlighted ? '#bbf7d0' : '#e2e8f0'}`,
    }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>
          {CATEGORY_ICON[doc.category] || '📁'} {doc.originalName}
          {highlighted && (
            <span style={{
              marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#fff',
              background: '#16a34a', borderRadius: 20, padding: '2px 7px',
            }}>
              This visit
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
          {doc.category} · {formatBytes(doc.fileSize)} ·{' '}
          {new Date(doc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
        {doc.description && (
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{doc.description}</div>
        )}
      </div>
      <button className="btn btn-sm btn-primary" onClick={() => handleView(doc)}>View</button>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">📁 Documents — {patientName}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="spinner" />
          ) : documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
              No documents uploaded by this patient yet
            </div>
          ) : (
            <>
              {visitDate && thisVisitDocs.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>
                    🟢 Uploaded for this visit ({thisVisitDocs.length})
                  </div>
                  {thisVisitDocs.map(d => renderRow(d, true))}
                </div>
              )}
              <div>
                {visitDate && thisVisitDocs.length > 0 && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>
                    📜 Full History ({otherDocs.length})
                  </div>
                )}
                {otherDocs.length === 0 && thisVisitDocs.length > 0 ? (
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>No other documents on file.</div>
                ) : (
                  otherDocs.map(d => renderRow(d, false))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── File preview ── */}
      {previewUrl && previewDoc && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 20,
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