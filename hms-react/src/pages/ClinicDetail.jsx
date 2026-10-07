// src/pages/ClinicDetail.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../utils/api';

function StarRating({ rating, count }) {
  const stars = Math.round(rating || 0);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
      <span style={{ color: '#f59e0b' }}>
        {'★'.repeat(stars)}
        {'☆'.repeat(5 - stars)}
      </span>
      <span style={{ color: '#94a3b8' }}>
        {rating ? rating.toFixed(1) : 'New'}{count ? ` (${count})` : ''}
      </span>
    </div>
  );
}

function DoctorCard({ doctor, onBook }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: 16, border: '1.5px solid #e5e7eb',
      display: 'flex', gap: 14, alignItems: 'flex-start',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
        background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
      }}>
        {doctor.photoUrl
          ? <img src={doctor.photoUrl} alt={doctor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : '👨‍⚕️'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
          Dr. {doctor.name}
        </div>
        <div style={{ fontSize: 13, color: '#2d6be4', fontWeight: 600, marginTop: 2 }}>
          {doctor.specialization || doctor.department || 'General Medicine'}
        </div>
        {doctor.qualification && (
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {doctor.qualification}{doctor.experience ? ` · ${doctor.experience} yrs experience` : ''}
          </div>
        )}
        <div style={{ marginTop: 6 }}>
          <StarRating rating={doctor.averageRating} count={doctor.totalRatings} />
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
          ₹{doctor.consultationFee || 0}
        </div>
        <button
          onClick={() => onBook(doctor)}
          style={{
            background: '#2d6be4', color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Book
        </button>
      </div>
    </div>
  );
}

export default function ClinicDetail() {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [ratingsRes, doctorsRes] = await Promise.all([
          API.get('/feedback/clinic/ratings/all'),
          API.get(`/patient-portal/doctors/${clinicId}`, { params: { limit: 100 } }),
        ]);

        const allClinics = ratingsRes.data.clinics || [];
        const found = allClinics.find(c => c._id === clinicId);
        setClinic(found || null);

        setDoctors(doctorsRes.data.doctors || []);
      } catch (err) {
        console.error('Error loading clinic detail:', err);
      }
      setLoading(false);
    }
    load();
  }, [clinicId]);

  const handleBook = (doctor) => {
    navigate('/patient-appointments', {
      state: { preSelectClinic: clinicId, preSelectDoctor: doctor._id },
    });
  };

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

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div>
      ) : (
        <>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 20, marginBottom: 20,
            border: '1.5px solid #e5e7eb',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
              {clinic?.name || 'Clinic'}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              📍 {clinic?.address || 'Location not specified'}
            </div>
            <div style={{ marginTop: 8 }}>
              <StarRating rating={clinic?.rating} count={clinic?.reviews} />
            </div>
          </div>

          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>
            Doctors ({doctors.length})
          </h3>

          {doctors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              No doctors available at this clinic yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {doctors.map(doc => (
                <DoctorCard key={doc._id} doctor={doc} onBook={handleBook} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
