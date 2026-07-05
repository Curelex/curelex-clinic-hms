import 'dotenv/config';
import mongoose from 'mongoose';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import imsApp from './ims/app.js';
import clinicApp from './clinic/app.js';
import env from './clinic/config/env.js';
import stripeWebhookRouter from './clinic/webhooks/stripeWebhook.js';

const mainApp = express();
const server  = http.createServer(mainApp);

// ── Socket.IO (clinic queue system) ──────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
mainApp.set('io', io);

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  socket.on('join_queue', ({ clinicId, doctorId, date }) => {
    const room = `queue_${clinicId}_${doctorId}_${date}`;
    socket.join(room);
  });
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// ── Middleware ────────────────────────────────────────────────────
mainApp.use(cors({ origin: '*', credentials: true }));

// must be above express.json()
mainApp.use('/api/clinic/webhooks/stripe', stripeWebhookRouter);

mainApp.use(express.json());

// ── Mount both apps ───────────────────────────────────────────────
// IMS:    /ims/api/v1/*
// Clinic: /api/clinic/*
mainApp.use('/ims',         imsApp);
mainApp.use('/api/clinic',  clinicApp);

mainApp.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    endpoints: { ims: '/ims/api/v1', clinic: '/api/clinic' },
    websockets: true,
  });
});

// ── Single MongoDB connection → start server ──────────────────────
const PORT = env.port || 5000;

mongoose
  .connect(env.mongoUri)
  .then(() => {
    console.log(`✅ MongoDB connected`);
console.log(`HOST: ${mongoose.connection.host}`);
console.log(`DB NAME: ${mongoose.connection.name}`);
console.log(`URI: ${env.mongoUri}`);
    server.listen(PORT, () => {
      console.log(`🚀 Server on port ${PORT}`);
      console.log(`📦 IMS:    http://localhost:${PORT}/ims/api/v1`);
      console.log(`🏥 Clinic: http://localhost:${PORT}/api/clinic`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB failed:', err.message);
    process.exit(1);
  });