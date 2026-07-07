import React, { useRef, useState, useMemo } from 'react';

// ── Image compressor ──────────────────────────────────────────────
// Compresses any image to under maxSizeKB at given quality steps
async function compressImage(file, maxSizeKB = 500, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');

        // Scale down if image is very large
        let { width, height } = img;
        const MAX_DIM = 1920;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width  = MAX_DIM;
          } else {
            width  = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Try compressing at decreasing quality until under maxSizeKB
        const tryCompress = (q) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) { reject(new Error('Compression failed')); return; }
              if (blob.size / 1024 <= maxSizeKB || q <= 0.1) {
                // Done — return as a File
                const compressed = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve({ file: compressed, originalSize: file.size, compressedSize: blob.size });
              } else {
                tryCompress(Math.max(q - 0.1, 0.1));
              }
            },
            'image/jpeg',
            q
          );
        };

        tryCompress(quality);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}

// ── Format bytes ──────────────────────────────────────────────────
const formatSize = (bytes) => {
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// ── Main Component ────────────────────────────────────────────────
export function FileUploadSection({ patientId, files = [], onUpload, onDelete, onDownload, disabled = false }) {
  const fileInputRef   = useRef(null);
  const cameraInputRef = useRef(null);
  const [uploading,     setUploading]     = useState(false);
  const [uploadError,   setUploadError]   = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null); // { originalSize, compressedSize, name }

  const filesArray = useMemo(() => {
    if (Array.isArray(files)) return files;
    if (files?.files && Array.isArray(files.files)) return files.files;
    return [];
  }, [files]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(null);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Only images (JPG, PNG, GIF, WebP) and PDFs are allowed.');
      return;
    }

    setUploading(true);

    try {
      let fileToUpload = file;
      let originalSize = file.size;
      let compressedSize = file.size;

      // Compress images (not PDFs)
      if (file.type.startsWith('image/')) {
        const result = await compressImage(file, 500, 0.85);
        fileToUpload   = result.file;
        originalSize   = result.originalSize;
        compressedSize = result.compressedSize;
      }

      await onUpload(patientId, fileToUpload);

      // Show success with compression info
      setUploadSuccess({
        name:           file.name,
        originalSize,
        compressedSize,
        wasCompressed:  compressedSize < originalSize,
      });

      // Clear inputs
      if (fileInputRef.current)   fileInputRef.current.value   = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';

      // Auto-dismiss success after 4s
      setTimeout(() => setUploadSuccess(null), 4000);

    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileId, filename) => {
    try {
      const response = await onDownload(patientId, fileId);
      if (!response?.ok) throw new Error('Download failed');
      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Downloaded file is empty');
      const url = window.URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download file: ' + err.message);
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf')  return '📄';
    return '📎';
  };

  const btnStyle = (color = '#1565a8') => ({
    display:    'inline-flex',
    alignItems: 'center',
    gap:        6,
    padding:    '6px 14px',
    borderRadius: 8,
    border:     `1.5px solid ${color}`,
    background: 'transparent',
    color,
    fontSize:   12,
    fontWeight: 700,
    cursor:     uploading || disabled ? 'not-allowed' : 'pointer',
    opacity:    uploading || disabled ? 0.6 : 1,
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ fontSize: 13 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
          📎 Patient Files ({filesArray.length})
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Upload from device */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
            onChange={handleFileSelect}
            disabled={uploading || disabled}
            style={{ display: 'none' }}
            id={`file-upload-${patientId}`}
          />
          <label htmlFor={`file-upload-${patientId}`} style={{ cursor: uploading || disabled ? 'not-allowed' : 'pointer' }}>
            <span style={btnStyle('#1565a8')}>
              {uploading ? '⏳ Uploading…' : '📁 Upload File'}
            </span>
          </label>

          {/* Camera — rear camera on mobile */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            disabled={uploading || disabled}
            style={{ display: 'none' }}
            id={`camera-upload-${patientId}`}
          />
          <label htmlFor={`camera-upload-${patientId}`} style={{ cursor: uploading || disabled ? 'not-allowed' : 'pointer' }}>
            <span style={btnStyle('#00a878')}>
              📷 Use Camera
            </span>
          </label>
        </div>
      </div>

      {/* ── Uploading progress indicator ── */}
      {uploading && (
        <div style={{ background: 'rgba(21,101,168,0.08)', border: '1px solid rgba(21,101,168,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#1565a8', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
          Compressing &amp; uploading file…
        </div>
      )}

      {/* ── Success message with compression info ── */}
      {uploadSuccess && (
        <div style={{ background: 'rgba(0,168,120,0.1)', border: '1px solid rgba(0,168,120,0.35)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#00856e', fontSize: 12 }}>
          ✅ <strong>{uploadSuccess.name}</strong> uploaded successfully!
          {uploadSuccess.wasCompressed && (
            <span style={{ marginLeft: 6, opacity: 0.85 }}>
              · Compressed from <strong>{formatSize(uploadSuccess.originalSize)}</strong> → <strong>{formatSize(uploadSuccess.compressedSize)}</strong>
              {' '}(<strong>{Math.round((1 - uploadSuccess.compressedSize / uploadSuccess.originalSize) * 100)}% smaller</strong>)
            </span>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {uploadError && (
        <div style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, color: '#c0392b', fontSize: 12 }}>
          ❌ {uploadError}
        </div>
      )}

      {/* ── File list ── */}
      {filesArray.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: 12, background: 'rgba(0,0,0,0.02)', borderRadius: 8 }}>
          No files uploaded yet
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {filesArray.map((file) => {
            const fileId = file._id;
            return (
              <div key={String(fileId)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 18 }}>{getFileIcon(file.mimeType)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.filename || file.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {formatSize(file.size)} · {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'Just now'} · by {file.uploadedBy || 'staff'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleDownload(fileId, file.filename || file.name)}
                    style={{ background: 'none', border: '1px solid #c5d5e8', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, color: '#3498db' }}
                    title="Download"
                  >📥</button>
                  <button
                    onClick={() => onDelete(patientId, fileId)}
                    style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, color: '#e74c3c' }}
                    title="Delete"
                  >🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}