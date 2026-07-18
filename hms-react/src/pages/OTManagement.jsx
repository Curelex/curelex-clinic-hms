import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { Card, Btn, Modal, Input, Select, Badge, SectionHeader, Empty, Alert } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export default function OTManagement() {
  const { hasPerm, user } = useAuth();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  
  const [activeTab, setActiveTab] = useState('calendar'); // calendar, requests, rooms
  const [pendingRequestId, setPendingRequestId] = useState(null);

  const tabs = ['calendar', 'requests'];
  if (user?.role === 'super_admin' || user?.role === 'admin') tabs.push('rooms');

  return (
    <div>
      <SectionHeader 
        title="Operation Theatre Management" 
        subtitle="Manage OT schedules, surgery requests, and OT rooms."
      />

      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 20 }}>
        {tabs.map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: activeTab === tab ? 'var(--primary)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--text)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 600,
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'calendar' && <CalendarTab pendingRequestId={pendingRequestId} setPendingRequestId={setPendingRequestId} />}
      {activeTab === 'requests' && <RequestsTab setActiveTab={setActiveTab} setPendingRequestId={setPendingRequestId} />}
      {activeTab === 'rooms' && <RoomsTab />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CALENDAR TAB (Phase 2 core)
// ─────────────────────────────────────────────────────────────────────────────
function CalendarTab({ pendingRequestId, setPendingRequestId }) {
  const { user } = useAuth();
  const canSchedule = ['super_admin', 'admin', 'doctor'].includes(user?.role);

  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('week');

  const fetchRooms = async () => {
    try {
      const res = await API.get('/ot/rooms');
      setRooms(res.data);
      if (res.data.length > 0) setSelectedRoom(res.data[0]._id);
    } catch (err) { toast.error('Failed to load rooms'); }
  };

  const fetchBookings = async () => {
    if (!selectedRoom) return;
    try {
      const res = await API.get('/ot/bookings', { params: { otRoomId: selectedRoom } });
      setBookings(res.data);
    } catch (err) { toast.error('Failed to load bookings'); }
  };

  useEffect(() => { fetchRooms(); }, []);
  useEffect(() => { fetchBookings(); }, [selectedRoom]);

  const events = bookings.map(b => ({
    id: b._id,
    title: `${b.requestId?.patientId?.name || 'Unknown'} - ${b.status}`,
    start: new Date(b.scheduledStart),
    end: new Date(b.scheduledEnd),
    booking: b,
    priority: b.requestId?.priority || 'elective'
  }));

  const handleSelectSlot = (slotInfo) => {
    if (!canSchedule) {
      return toast('Only administrators or doctors can schedule new surgeries.', { icon: '🔒' });
    }
    if (!selectedRoom) {
      return toast.error('Please select an OT Room first.');
    }
    setSelectedSlot({
      start: slotInfo.start,
      end: slotInfo.end,
      otRoomId: selectedRoom
    });
    setShowBookingModal(true);
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event.booking);
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = 'var(--primary)'; // default elective
    if (event.priority === 'urgent') backgroundColor = 'var(--warning)';
    if (event.priority === 'emergency') backgroundColor = 'var(--danger)';
    
    if (event.booking.status === 'completed') backgroundColor = 'var(--success)';
    if (event.booking.status === 'cancelled') backgroundColor = 'var(--surface2)';

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: event.booking.status === 'cancelled' ? 0.6 : 1,
        color: event.booking.status === 'cancelled' ? 'var(--text)' : 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  return (
    <div>
      <div style={{ marginBottom: 15, display: 'flex', gap: 15, alignItems: 'center' }}>
        <Select label="Filter by OT Room" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} style={{ width: 250 }}>
          {rooms.map(r => <option key={r._id} value={r._id}>{r.name} ({r.location})</option>)}
        </Select>
        <div style={{ display: 'flex', gap: 10, fontSize: 13, marginTop: 15 }}>
          <Badge color="blue">Elective</Badge>
          <Badge color="yellow">Urgent</Badge>
          <Badge color="red">Emergency</Badge>
          <Badge color="green">Completed</Badge>
        </div>
      </div>

      {rooms.length === 0 ? (
        <Empty icon="🏥" title="No OT Rooms Found" description="An administrator must add at least one OT Room from the Rooms tab before surgeries can be scheduled." />
      ) : (
        <div style={{ height: 650, background: 'var(--surface)', padding: 15, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            date={currentDate}
            onNavigate={(date) => setCurrentDate(date)}
            view={currentView}
            onView={(view) => setCurrentView(view)}
            views={['day', 'week', 'month']}
            selectable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            step={30}
            timeslots={2}
          />
        </div>
      )}

      {showBookingModal && (
        <BookingModal 
          slot={selectedSlot}
          preselectedRequestId={pendingRequestId}
          onClose={() => {
            setShowBookingModal(false);
            setPendingRequestId(null);
          }}
          onSuccess={() => { 
            setShowBookingModal(false); 
            setPendingRequestId(null);
            fetchBookings(); 
          }}
        />
      )}

      {selectedEvent && (
        <BookingDetailsModal
          booking={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdate={(updated) => {
            setSelectedEvent(updated);
            fetchBookings();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SURGERY REQUESTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function RequestsTab({ setActiveTab, setPendingRequestId }) {
  const [requests, setRequests] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');

  const fetchRequests = async () => {
    try {
      const res = await API.get('/ot/requests', { params: { status: statusFilter } });
      setRequests(res.data);
    } catch (err) { toast.error('Failed to load requests'); }
  };

  useEffect(() => { fetchRequests(); }, [statusFilter]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await API.put(`/ot/requests/${id}/status`, { status: newStatus });
      toast.success('Status updated');
      fetchRequests();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 200 }}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="scheduled">Scheduled</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </Select>
        <Btn onClick={() => setShowRequestModal(true)}>+ Raise Request</Btn>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        {requests.map(req => (
          <Card key={req._id}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: '0 0 5px 0' }}>{req.proposedProcedure}</h4>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                  Patient: {req.patientId?.name} | Priority: <PriorityBadge priority={req.priority} /> | Status: {req.status}
                </p>
                <p style={{ margin: '5px 0 0 0', fontSize: 13 }}>Diagnosis: {req.diagnosis}</p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {req.status === 'pending' && (
                  <>
                    <Btn variant="success" size="sm" onClick={() => handleStatusChange(req._id, 'approved')}>Approve</Btn>
                    <Btn variant="danger" size="sm" onClick={() => handleStatusChange(req._id, 'rejected')}>Reject</Btn>
                  </>
                )}
                {req.status === 'approved' && (
                  <Btn size="sm" onClick={() => { 
                    setPendingRequestId(req._id);
                    setActiveTab('calendar'); 
                    toast('Click a slot on the calendar to schedule this request', { icon: 'ℹ️' }); 
                  }}>Schedule Now</Btn>
                )}
              </div>
            </div>
          </Card>
        ))}
        {requests.length === 0 && <Empty icon="📋" title="No Requests Found" />}
      </div>

      {showRequestModal && (
        <RaiseRequestModal onClose={() => setShowRequestModal(false)} onSuccess={() => { setShowRequestModal(false); fetchRequests(); }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ROOMS TAB
// ─────────────────────────────────────────────────────────────────────────────
function RoomsTab() {
  const [rooms, setRooms] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ name: '', location: '', equipmentTags: '' });

  const fetchRooms = async () => {
    try {
      const res = await API.get('/ot/rooms');
      setRooms(res.data);
    } catch (err) { toast.error('Failed to load rooms'); }
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        equipmentTags: formData.equipmentTags.split(',').map(s => s.trim()).filter(Boolean)
      };
      await API.post('/ot/rooms', payload);
      toast.success('Room added');
      setShowAdd(false);
      fetchRooms();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add room');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 15 }}>
        <Btn onClick={() => setShowAdd(true)}>+ Add OT Room</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 15 }}>
        {rooms.map(room => (
          <Card key={room._id}>
            <h3 style={{ margin: '0 0 5px 0' }}>{room.name} {room.active ? <Badge color="green">Active</Badge> : <Badge color="red">Inactive</Badge>}</h3>
            <p style={{ margin: '0 0 10px 0', fontSize: 13, color: 'var(--text-muted)' }}>Location: {room.location}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {room.equipmentTags.map((t, idx) => <span key={idx} style={{ background: 'var(--surface2)', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{t}</span>)}
            </div>
          </Card>
        ))}
      </div>

      {showAdd && (
        <Modal title="Add OT Room" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <Input label="Room Name (e.g. OT-1)" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <Input label="Location" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
            <Input label="Equipment Tags (comma separated)" placeholder="Ventilator, C-Arm" value={formData.equipmentTags} onChange={e => setFormData({...formData, equipmentTags: e.target.value})} />
            <Btn type="submit">Save Room</Btn>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODALS
// ─────────────────────────────────────────────────────────────────────────────

function RaiseRequestModal({ onClose, onSuccess }) {
  const [patients, setPatients] = useState([]);
  const [formData, setFormData] = useState({
    patientId: '', diagnosis: '', proposedProcedure: '', priority: 'elective', notes: ''
  });

  useEffect(() => {
    API.get('/patients').then(res => setPatients(res.data.patients || res.data)).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/ot/requests', formData);
      toast.success('Surgery request raised');
      onSuccess();
    } catch (err) {
      toast.error('Failed to raise request');
    }
  };

  return (
    <Modal title="Raise Surgery Request" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <Select label="Patient" required value={formData.patientId} onChange={e => setFormData({...formData, patientId: e.target.value})}>
          <option value="">Select Patient</option>
          {patients.map(p => <option key={p._id} value={p._id}>{p.name} ({p.patientId})</option>)}
        </Select>
        <Input label="Proposed Procedure" required value={formData.proposedProcedure} onChange={e => setFormData({...formData, proposedProcedure: e.target.value})} />
        <Input label="Diagnosis" required value={formData.diagnosis} onChange={e => setFormData({...formData, diagnosis: e.target.value})} />
        <Select label="Priority" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
          <option value="elective">Elective</option>
          <option value="urgent">Urgent</option>
          <option value="emergency">Emergency</option>
        </Select>
        <Input label="Notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
        <Btn type="submit">Submit Request</Btn>
      </form>
    </Modal>
  );
}

function BookingModal({ slot, preselectedRequestId, onClose, onSuccess }) {
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [staff, setStaff] = useState([]);
  const [formData, setFormData] = useState({
    requestId: preselectedRequestId || '',
    otRoomId: slot.otRoomId,
    scheduledStart: format(slot.start, "yyyy-MM-dd'T'HH:mm"),
    scheduledEnd: format(slot.end, "yyyy-MM-dd'T'HH:mm"),
    surgeonId: '',
    anesthetistId: '',
    nurseId: '',
    notes: ''
  });

  useEffect(() => {
    API.get('/ot/requests', { params: { status: 'approved' } }).then(res => setApprovedRequests(res.data));
    API.get('/staff').then(res => setStaff(res.data.staff || res.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const staffAssignments = [];
      if (formData.surgeonId) staffAssignments.push({ staffId: formData.surgeonId, role: 'surgeon' });
      if (formData.anesthetistId) staffAssignments.push({ staffId: formData.anesthetistId, role: 'anesthetist' });
      if (formData.nurseId) staffAssignments.push({ staffId: formData.nurseId, role: 'nurse' });

      await API.post('/ot/bookings', {
        ...formData,
        staffAssignments
      });
      toast.success('Surgery Scheduled Successfully');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conflict detected or creation failed');
    }
  };

  const doctors = staff.filter(s => s.role === 'doctor' || s.role === 'separate_doctor');
  const nurses = staff.filter(s => s.role === 'nurse');

  return (
    <Modal title="Schedule Booking" onClose={onClose} width={600}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <Select label="Approved Surgery Request" required value={formData.requestId} onChange={e => setFormData({...formData, requestId: e.target.value})}>
          <option value="">Select Request</option>
          {approvedRequests.map(r => <option key={r._id} value={r._id}>{r.patientId?.name} - {r.proposedProcedure} ({r.priority})</option>)}
        </Select>

        <div style={{ display: 'flex', gap: 10 }}>
          <Input type="datetime-local" label="Start Time" required value={formData.scheduledStart} onChange={e => setFormData({...formData, scheduledStart: e.target.value})} style={{ flex: 1 }}/>
          <Input type="datetime-local" label="End Time" required value={formData.scheduledEnd} onChange={e => setFormData({...formData, scheduledEnd: e.target.value})} style={{ flex: 1 }}/>
        </div>

        <Select label="Surgeon (Optional for now, Phase 3 focus)" value={formData.surgeonId} onChange={e => setFormData({...formData, surgeonId: e.target.value})}>
          <option value="">Select Surgeon</option>
          {doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </Select>
        
        <Select label="Anesthetist" value={formData.anesthetistId} onChange={e => setFormData({...formData, anesthetistId: e.target.value})}>
          <option value="">Select Anesthetist</option>
          {doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </Select>

        <Select label="OT Nurse" value={formData.nurseId} onChange={e => setFormData({...formData, nurseId: e.target.value})}>
          <option value="">Select Nurse</option>
          {nurses.map(n => <option key={n._id} value={n._id}>{n.name}</option>)}
        </Select>

        <Input label="Notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
        
        <Btn type="submit">Confirm Schedule</Btn>
      </form>
    </Modal>
  );
}

function BookingDetailsModal({ booking, onClose, onUpdate }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('details');
  const [assignments, setAssignments] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [savingAssignments, setSavingAssignments] = useState(false);

  useEffect(() => {
    API.get(`/ot/bookings/${booking._id}/assignments`).then(res => setAssignments(res.data));
    API.get('/staff').then(res => setAllStaff(res.data.staff || res.data));
  }, [booking._id]);

  const handleStatus = async (newStatus, override = false) => {
    try {
      const res = await API.put(`/ot/bookings/${booking._id}/status`, { status: newStatus, override });
      toast.success('Status updated');
      onUpdate(res.data);
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.requiresOverride) {
        if (!isAdmin) {
          return toast.error('Mandatory safety steps missing. Only admins can override this.');
        }
        if (window.confirm(err.response.data.message + '\n\nDo you want to override and proceed?')) {
          handleStatus(newStatus, true);
        }
      } else {
        toast.error(err.response?.data?.message || 'Failed to update status');
      }
    }
  };

  const handleAssignmentChange = (idx, field, value) => {
    const newAssig = [...assignments];
    newAssig[idx][field] = value;
    setAssignments(newAssig);
  };

  const addAssignmentRow = () => {
    setAssignments([...assignments, { staffId: '', role: 'surgeon' }]);
  };

  const saveAssignments = async () => {
    setSavingAssignments(true);
    try {
      // Map to expected format
      const payload = assignments.filter(a => a.staffId).map(a => ({
        staffId: typeof a.staffId === 'object' ? a.staffId._id : a.staffId,
        role: a.role
      }));
      await API.put(`/ot/bookings/${booking._id}/assignments`, { assignments: payload });
      toast.success('Assignments updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update assignments (Conflict?)');
    } finally {
      setSavingAssignments(false);
    }
  };

  return (
    <Modal title="Booking Details" onClose={onClose} width={700}>
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 15, flexWrap: 'wrap' }}>
        {['details', 'assignments', 'preop', 'consent', 'safety', 'postop'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ padding: '6px 12px', border: 'none', background: activeTab === tab ? 'var(--primary)' : 'transparent', color: activeTab === tab ? '#fff' : 'var(--text)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textTransform: 'capitalize' }}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <div>
          <p><strong>Patient:</strong> {booking.requestId?.patientId?.name}</p>
          <p><strong>Status:</strong> {booking.status}</p>
          <p><strong>Time:</strong> {new Date(booking.scheduledStart).toLocaleString()} - {new Date(booking.scheduledEnd).toLocaleTimeString()}</p>

          <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 15 }}>
            <h4>Update Status</h4>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Btn variant="primary" onClick={() => handleStatus('confirmed')} disabled={booking.status !== 'scheduled'}>Confirm</Btn>
              <Btn variant="warning" onClick={() => handleStatus('in_progress')} disabled={booking.status !== 'confirmed'}>In Progress</Btn>
              <Btn variant="success" onClick={() => handleStatus('completed')} disabled={booking.status !== 'in_progress'}>Complete</Btn>
              <Btn variant="danger" onClick={() => handleStatus('cancelled')} disabled={!isAdmin}>Cancel</Btn>
              <Btn variant="ghost" onClick={() => handleStatus('postponed')} disabled={!isAdmin}>Postpone</Btn>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'assignments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {assignments.map((assig, idx) => {
            const currentStaffId = typeof assig.staffId === 'object' ? assig.staffId?._id : assig.staffId;
            return (
              <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <Select label="Role" value={assig.role} onChange={e => handleAssignmentChange(idx, 'role', e.target.value)} style={{ flex: 1 }}>
                  <option value="surgeon">Surgeon</option>
                  <option value="assistant_surgeon">Assistant Surgeon</option>
                  <option value="anesthetist">Anesthetist</option>
                  <option value="nurse">Nurse</option>
                </Select>
                <Select label="Staff Member" value={currentStaffId || ''} onChange={e => handleAssignmentChange(idx, 'staffId', e.target.value)} style={{ flex: 2 }}>
                  <option value="">Select Staff</option>
                  {allStaff.filter(s => {
                    if (assig.role === 'nurse') return s.role === 'nurse';
                    return s.role === 'doctor' || s.role === 'separate_doctor';
                  }).map(s => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
                </Select>
                <Btn variant="danger" onClick={() => setAssignments(assignments.filter((_, i) => i !== idx))} type="button">Remove</Btn>
              </div>
            );
          })}
          
          {isAdmin && (
            <>
              <div>
                <Btn variant="ghost" onClick={addAssignmentRow}>+ Add Staff</Btn>
              </div>

              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 15 }}>
                <Btn onClick={saveAssignments} disabled={savingAssignments}>{savingAssignments ? 'Saving...' : 'Save Assignments'}</Btn>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'preop' && <PreOpTab bookingId={booking._id} />}
      {activeTab === 'consent' && <ConsentTab bookingId={booking._id} />}
      {activeTab === 'safety' && <SafetyTab bookingId={booking._id} />}
      {activeTab === 'postop' && <PostOpTab bookingId={booking._id} />}
    </Modal>
  );
}

// ── Phase 5 Tab Components ──

function PostOpTab({ bookingId }) {
  const [data, setData] = useState({ vitals: [], status: 'in_recovery', notes: '' });
  const [vitalForm, setVitalForm] = useState({ bp: '', pulse: '', spo2: '', consciousness: 'Alert' });

  const fetchData = async () => {
    try {
      const res = await API.get(`/ot/bookings/${bookingId}/postop`);
      if (res.data) setData(res.data);
    } catch(err){}
  };

  useEffect(() => { fetchData(); }, [bookingId]);

  const addVital = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/ot/bookings/${bookingId}/postop/vitals`, vitalForm);
      toast.success('Vitals added');
      setVitalForm({ bp: '', pulse: '', spo2: '', consciousness: 'Alert' });
      fetchData();
    } catch(err) { toast.error('Failed to add vitals'); }
  };

  const updateStatus = async (newStatus) => {
    try {
      await API.put(`/ot/bookings/${bookingId}/postop/status`, { status: newStatus, notes: data.notes });
      toast.success('Recovery status updated');
      fetchData();
    } catch(err) { toast.error('Failed to update status'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', padding: 10, borderRadius: 8 }}>
        <div>
          <strong>Current Recovery Status: </strong>
          <Badge color={data.status === 'transferred' ? 'green' : 'yellow'}>{data.status.replace('_', ' ').toUpperCase()}</Badge>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn size="sm" onClick={() => updateStatus('stable')} disabled={data.status !== 'in_recovery'}>Mark Stable</Btn>
          <Btn size="sm" onClick={() => updateStatus('ready_for_transfer')} disabled={data.status !== 'stable'}>Ready for Transfer</Btn>
          <Btn size="sm" variant="success" onClick={() => updateStatus('transferred')} disabled={data.status !== 'ready_for_transfer'}>Transfer to Ward</Btn>
        </div>
      </div>

      <div>
        <Input label="PACU/Recovery Notes" value={data.notes} onChange={e => setData({...data, notes: e.target.value})} placeholder="Notes to attach upon transfer..." />
        <Btn size="sm" variant="ghost" onClick={() => updateStatus(data.status)} style={{ marginTop: 5 }}>Save Notes</Btn>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 15 }}>
        <h4>Vitals Flowsheet</h4>
        {data.vitals.length > 0 ? (
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', marginBottom: 15 }}>
            <thead>
              <tr style={{ textAlign: 'left', background: 'var(--surface2)' }}>
                <th style={{ padding: 8 }}>Time</th>
                <th>BP</th>
                <th>Pulse</th>
                <th>SpO2</th>
                <th>Consciousness</th>
              </tr>
            </thead>
            <tbody>
              {data.vitals.map((v, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 8 }}>{new Date(v.timestamp).toLocaleTimeString()}</td>
                  <td>{v.bp}</td>
                  <td>{v.pulse}</td>
                  <td>{v.spo2}%</td>
                  <td>{v.consciousness}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No vitals recorded yet.</p>}

        <form onSubmit={addVital} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'var(--surface)', padding: 10, borderRadius: 8, boxShadow: 'var(--shadow-sm)' }}>
          <Input label="BP" placeholder="120/80" value={vitalForm.bp} onChange={e => setVitalForm({...vitalForm, bp: e.target.value})} style={{ flex: 1 }} required />
          <Input label="Pulse" type="number" value={vitalForm.pulse} onChange={e => setVitalForm({...vitalForm, pulse: e.target.value})} style={{ flex: 1 }} required />
          <Input label="SpO2" type="number" value={vitalForm.spo2} onChange={e => setVitalForm({...vitalForm, spo2: e.target.value})} style={{ flex: 1 }} required />
          <Select label="Consciousness" value={vitalForm.consciousness} onChange={e => setVitalForm({...vitalForm, consciousness: e.target.value})} style={{ flex: 1 }}>
            <option value="Alert">Alert</option>
            <option value="Drowsy">Drowsy</option>
            <option value="Stuporous">Stuporous</option>
            <option value="Unconscious">Unconscious</option>
          </Select>
          <Btn type="submit" size="sm">Add Vital</Btn>
        </form>
      </div>
    </div>
  );
}

// ── Phase 4 Tab Components ──

function PreOpTab({ bookingId }) {
  const [data, setData] = useState({ asaScore: '', pacNotes: '', investigationsReviewed: '', fitForSurgery: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get(`/ot/bookings/${bookingId}/preop`).then(res => {
      if (res.data) {
        setData({
          ...res.data,
          investigationsReviewed: res.data.investigationsReviewed?.join(', ') || ''
        });
      }
    });
  }, [bookingId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...data,
        investigationsReviewed: data.investigationsReviewed.split(',').map(s => s.trim()).filter(Boolean)
      };
      await API.put(`/ot/bookings/${bookingId}/preop`, payload);
      toast.success('Pre-Op Assessment saved');
    } catch (err) { toast.error('Failed to save'); }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
      <Select label="ASA Score" value={data.asaScore} onChange={e => setData({...data, asaScore: e.target.value})}>
        <option value="">Select Score</option>
        {['I','II','III','IV','V','VI'].map(s => <option key={s} value={s}>{s}</option>)}
      </Select>
      <Input label="PAC Notes" value={data.pacNotes} onChange={e => setData({...data, pacNotes: e.target.value})} />
      <Input label="Investigations Reviewed (comma separated)" value={data.investigationsReviewed} onChange={e => setData({...data, investigationsReviewed: e.target.value})} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={data.fitForSurgery} onChange={e => setData({...data, fitForSurgery: e.target.checked})} style={{ width: 18, height: 18 }} />
        <strong>Patient is Fit for Surgery</strong>
      </label>
      <Btn type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Assessment'}</Btn>
    </form>
  );
}

function ConsentTab({ bookingId }) {
  const [consents, setConsents] = useState([]);
  const [file, setFile] = useState(null);
  const [templateId, setTemplateId] = useState('General Surgery Consent');

  const fetchConsents = async () => {
    try {
      const res = await API.get(`/ot/bookings/${bookingId}/consent`);
      setConsents(res.data);
    } catch(err){}
  };
  
  useEffect(() => { fetchConsents(); }, [bookingId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Select a file');
    const formData = new FormData();
    formData.append('patientSignature', file);
    formData.append('templateId', templateId);
    
    try {
      await API.post(`/ot/bookings/${bookingId}/consent`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      toast.success('Consent uploaded');
      setFile(null);
      fetchConsents();
    } catch(err) { toast.error('Upload failed'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {consents.length > 0 && (
        <div>
          <h4>Uploaded Consents</h4>
          <ul style={{ paddingLeft: 20 }}>
            {consents.map(c => (
              <li key={c._id}>
                {c.templateId} - <a href={`http://localhost:5000${c.patientSignatureUrl}`} target="_blank" rel="noreferrer">View Document</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--surface2)', padding: 15, borderRadius: 8 }}>
        <h4>Upload New Consent</h4>
        <Input label="Template/Document Type" value={templateId} onChange={e => setTemplateId(e.target.value)} required />
        <input type="file" accept=".pdf,image/*" onChange={e => setFile(e.target.files[0])} required />
        <Btn type="submit">Upload</Btn>
      </form>
    </div>
  );
}

function SafetyTab({ bookingId }) {
  const [stage, setStage] = useState('sign_in');
  const [items, setItems] = useState({});

  useEffect(() => {
    API.get(`/ot/bookings/${bookingId}/safety`).then(res => {
      const currentStageData = res.data.find(c => c.stage === stage);
      setItems(currentStageData ? currentStageData.items : {});
    });
  }, [bookingId, stage]);

  const checklistTemplates = {
    sign_in: ['Patient identity confirmed', 'Site marked', 'Anesthesia safety check complete', 'Allergies known'],
    time_out: ['Introduce team', 'Confirm procedure & site', 'Antibiotic prophylaxis given', 'Imaging displayed'],
    sign_out: ['Procedure recorded', 'Instrument & sponge count correct', 'Specimen labeled']
  };

  const toggleItem = (key) => {
    const newItems = { ...items, [key]: !items[key] };
    setItems(newItems);
    API.put(`/ot/bookings/${bookingId}/safety/${stage}`, { items: newItems })
       .catch(err => toast.error('Failed to auto-save checklist'));
  };

  const saveChecklist = async () => {
    try {
      await API.put(`/ot/bookings/${bookingId}/safety/${stage}`, { items });
      toast.success(`${stage.replace('_', ' ')} checklist saved manually`);
    } catch (err) { toast.error('Failed to save'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
        {['sign_in', 'time_out', 'sign_out'].map(s => (
          <Btn key={s} variant={stage === s ? 'primary' : 'ghost'} size="sm" onClick={() => setStage(s)}>{s.replace('_', ' ')}</Btn>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {checklistTemplates[stage].map(item => (
          <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={items[item] || false} onChange={() => toggleItem(item)} style={{ width: 18, height: 18 }} />
            {item}
          </label>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        <Btn onClick={saveChecklist}>Save Checklist</Btn>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }) {
  if (priority === 'emergency') return <Badge color="red">Emergency</Badge>;
  if (priority === 'urgent') return <Badge color="yellow">Urgent</Badge>;
  return <Badge color="blue">Elective</Badge>;
}
