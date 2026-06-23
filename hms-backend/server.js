// hms-backend/server.js

import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';

// Models (USED IN CRON)
import Task from './models/Task.js';
import Notification from './models/Notification.js';

// Routes
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import billingRoutes from './routes/billing.js';
import billingRequestRoutes from './routes/billingRequests.js';
import admissionRoutes from './routes/admissions.js';
import pharmacyRoutes from './routes/pharmacy.js';
import labRoutes from './routes/lab.js';
import inventoryRoutes from './routes/inventory.js';
import vendorRoutes from './routes/vendors.js';
import equipmentRoutes from './routes/equipment.js';
import dashboardRoutes from './routes/dashboard.js';
import staffRoutes from './routes/staff.js';
import tokenRoutes from './routes/tokens.js';
import patientRecordRoutes from './routes/patientRecords.js';
import staffWorkRoutes from './routes/staffWork.js';
import roomRoutes from './routes/room.js';
import patientPortalRoutes from './routes/patientPortal.js';
import clinicRoutes from './routes/clinics.js';
import fileRoutes from './routes/files.js';
import emergencyRoutesFactory from './routes/emergency.js';
import taskRoutesFactory from './routes/tasks.js';
import prescriptionRoutes from './routes/prescriptions.js';
import medicineRoutes from './routes/medicines.js';
import documentRoutes from './routes/documents.js';
import telemedicineRoutes from './routes/telemedicine.js';

dotenv.config();

// __dirname fix (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App setup
const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Make io available globally and in routes
global.io = io;
app.set('io', io);

// Middleware to attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Debug logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// MongoDB
import { MongoMemoryServer } from 'mongodb-memory-server';

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(async err => {
    console.log('⚠️ MongoDB connection failed or URI missing. Starting in-memory database as fallback for testing...');
    try {
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log('✅ MongoDB Connected to in-memory database successfully');
    } catch (memErr) {
      console.error('❌ Failed to start in-memory database:', memErr);
    }
  });

// ---------------- SOCKET EVENTS ----------------
io.on('connection', (socket) => {
  console.log('🔌 New socket connection:', socket.id);

  // ── Existing events ──
  socket.on('doctor:join', (doctorId) => {
    if (doctorId) {
      socket.join(`doctor_${doctorId}`);
      console.log(`👨‍⚕️ Doctor ${doctorId} joined room`);
    }
  });

  socket.on('staff:join', () => {
    socket.join('emergency_staff');
    console.log('🩺 Staff joined emergency room');
  });

  // ─── TELEMEDICINE SOCKET EVENTS ───
  
  // Initialize doctor status storage
  if (!global.doctorStatus) {
    global.doctorStatus = new Map();
  }
  if (!global.socketToDoctor) {
    global.socketToDoctor = new Map();
  }

  // Doctor goes online/offline
  socket.on('doctor:status', async ({ doctorId, status, clinicId }) => {
    if (!doctorId) return;
    
    global.doctorStatus.set(doctorId, {
      status: status,
      lastSeen: new Date(),
      clinicId: clinicId,
      socketId: socket.id
    });
    
    socket.join(`doctor_${doctorId}`);
    global.socketToDoctor.set(socket.id, doctorId);
    
    if (clinicId) {
      io.to(`clinic_${clinicId}_patients`).emit('doctor:status-change', {
        doctorId,
        status,
        timestamp: new Date()
      });
    }
    
    console.log(`👨‍⚕️ Doctor ${doctorId} is now ${status}`);
  });

  socket.on('doctor:register-socket', ({ doctorId }) => {
    global.socketToDoctor.set(socket.id, doctorId);
    console.log(`📝 Registered socket ${socket.id} to doctor ${doctorId}`);
  });

  socket.on('patient:join-clinic', ({ clinicId, patientId }) => {
    if (clinicId) {
      socket.join(`clinic_${clinicId}_patients`);
      console.log(`👤 Patient ${patientId} joined clinic ${clinicId} room`);
    }
    if (patientId) {
      socket.join(`patient_${patientId}`);
    }
  });

  socket.on('doctor:get-online', ({ clinicId }, callback) => {
    const onlineDoctors = [];
    for (const [docId, data] of global.doctorStatus.entries()) {
      if (data.status === 'online' && data.clinicId === clinicId) {
        onlineDoctors.push({
          doctorId: docId,
          lastSeen: data.lastSeen,
          status: data.status
        });
      }
    }
    
    if (callback && typeof callback === 'function') {
      callback(onlineDoctors);
    } else {
      socket.emit('doctor:online-list', { clinicId, onlineDoctors });
    }
  });

  // Telemedicine specific events
  socket.on('telemedicine:request-sent', ({ doctorId, patientId, requestId, patientName, urgency }) => {
    io.to(`doctor_${doctorId}`).emit('telemedicine:new-request', {
      requestId,
      patientId,
      patientName,
      urgency,
      timestamp: new Date(),
      message: `📱 New telemedicine request from ${patientName}`
    });
  });

  socket.on('telemedicine:status-update', ({ requestId, patientId, doctorId, status, notes }) => {
    io.to(`patient_${patientId}`).emit('telemedicine:status-update', {
      requestId,
      status,
      notes,
      timestamp: new Date()
    });
    io.to(`doctor_${doctorId}`).emit('telemedicine:status-update', {
      requestId,
      status,
      notes,
      timestamp: new Date()
    });
  });

  // ── NEW: Payment related socket events ──
  socket.on('telemedicine:payment-required', ({ requestId, patientId, doctorId, consultationFee }) => {
    io.to(`patient_${patientId}`).emit('telemedicine:payment-required', {
      requestId,
      doctorId,
      consultationFee,
      timestamp: new Date(),
      message: `💳 Payment required: ₹${consultationFee}`
    });
  });

  socket.on('telemedicine:payment-success', ({ requestId, patientId, doctorId, meetingLink }) => {
    io.to(`patient_${patientId}`).emit('telemedicine:payment-success', {
      requestId,
      meetingLink,
      timestamp: new Date(),
      message: '✅ Payment successful! Consultation confirmed.'
    });
    io.to(`doctor_${doctorId}`).emit('telemedicine:payment-received', {
      requestId,
      patientId,
      timestamp: new Date(),
      message: '✅ Payment received'
    });
  });

  socket.on('telemedicine:payout-requested', ({ requestId, doctorId, amount }) => {
    io.to(`doctor_${doctorId}`).emit('telemedicine:payout-requested', {
      requestId,
      amount,
      timestamp: new Date(),
      message: `💰 Payout requested: ₹${amount}`
    });
  });

  socket.on('telemedicine:payout-approved', ({ requestId, doctorId, amount }) => {
    io.to(`doctor_${doctorId}`).emit('telemedicine:payout-approved', {
      requestId,
      amount,
      timestamp: new Date(),
      message: `✅ Payout approved: ₹${amount}`
    });
  });

  socket.on('telemedicine:meeting-started', ({ requestId, patientId, doctorId, meetingLink }) => {
    io.to(`patient_${patientId}`).emit('telemedicine:meeting-started', {
      requestId,
      meetingLink,
      doctorId,
      timestamp: new Date()
    });
  });

  socket.on('telemedicine:meeting-ended', ({ requestId, patientId, doctorId, duration }) => {
    io.to(`patient_${patientId}`).emit('telemedicine:meeting-ended', {
      requestId,
      duration,
      doctorId,
      timestamp: new Date()
    });
    io.to(`doctor_${doctorId}`).emit('telemedicine:meeting-ended', {
      requestId,
      duration,
      patientId,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected:', socket.id);
    const doctorId = global.socketToDoctor.get(socket.id);
    if (doctorId && global.doctorStatus) {
      const status = global.doctorStatus.get(doctorId);
      if (status) {
        status.status = 'offline';
        status.lastSeen = new Date();
        global.doctorStatus.set(doctorId, status);
        
        if (status.clinicId) {
          io.to(`clinic_${status.clinicId}_patients`).emit('doctor:status-change', {
            doctorId,
            status: 'offline',
            timestamp: new Date()
          });
        }
        console.log(`👨‍⚕️ Doctor ${doctorId} is now offline (disconnected)`);
      }
      global.socketToDoctor.delete(socket.id);
    }
  });
});

// Inject io into factories
const emergencyRoutes = emergencyRoutesFactory(io);
const tasksRoutes = taskRoutesFactory(io);

// ---------------- CRON JOB ----------------
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();

    const overdueTasks = await Task.find({
      deadline: { $lt: now },
      status: { $ne: 'Completed' }
    });

    for (const task of overdueTasks) {
      io.to(`doctor_${task.assignedTo}`).emit('task:overdue', task);
    }

    const slaTasks = await Task.find({
      slaHours: { $gt: 0 },
      slaBreached: { $ne: true },
      status: { $ne: 'Completed' }
    });

    for (const task of slaTasks) {
      const slaDeadline =
        new Date(task.createdAt.getTime() + task.slaHours * 60 * 60 * 1000);

      if (now >= slaDeadline) {
        task.slaBreached = true;
        task.slaBreachedAt = now;
        await task.save();

        await Notification.create({
          userId: task.assignedTo,
          message: `SLA BREACHED: ${task.title}`,
          taskId: task._id,
          clinicId: task.clinicId
        });

        io.to(`doctor_${task.assignedTo}`).emit('task:sla-breach', task);
      }
    }

    console.log('Cron executed successfully');
  } catch (err) {
    console.error('Cron error:', err);
  }
});

// ---------------- ROUTES ----------------
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/billing-requests', billingRequestRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/patient-records', patientRecordRoutes);
app.use('/api/staff-work', staffWorkRoutes);
app.use('/api/room-settings', roomRoutes);
app.use('/api/patient-portal', patientPortalRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/telemedicine', telemedicineRoutes);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'HMS API Running' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});