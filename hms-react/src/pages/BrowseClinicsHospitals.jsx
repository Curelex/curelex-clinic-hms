// src/pages/BrowseClinicsHospitals.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../utils/api';
import { TopRatedCard } from './PatientDashboard';

export default function BrowseClinicsHospitals() {
  const { type } = useParams(); // 'clinic' or 'hospital'
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await API.get('/feedback/clinic/ratings/all');
        const all = res.data.clinics || [];
        setItems(all.filter(c => c.type === type));
      } catch (err) {
        console.error('Error loading list:', err);
      }
      setLoading(false);
    }
    load();
  }, [type]);

  const handleSelect = (item) => {
    navigate(`/clinic-detail/${item._id}`);
  };

  const filtered = items.filter(i =>
    !search || (i.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const title = type === 'hospital' ? 'All Hospitals' : 'All Clinics';
  const icon = type === 'hospital' ? '🏨' : '🏥';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none', border: 'none', color: '#2d6be4', fontSize: 14,
          fontWeight: 600, cursor: 'pointer', marginBottom: 16, padding: 0,
        }}
      >
        ← Back
      </button>

      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{icon}</span> {title}
      </h2>

      <input
        type="text"
        placeholder={`Search ${title.toLowerCase()}...`}
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 10,
          border: '1.5px solid #e5e7eb', fontSize: 14, marginBottom: 20,
          boxSizing: 'border-box',
        }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          No {title.toLowerCase()} found
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.map(item => (
            <TopRatedCard
              key={item._id}
              item={item}
              type={type}
              onSelect={() => handleSelect(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
