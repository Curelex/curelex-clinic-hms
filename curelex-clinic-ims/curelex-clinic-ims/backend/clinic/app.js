import express from 'express';
import cors from 'cors';

import authRoutes         from './routes/auth.js';
import clinicRoutes       from './routes/clinics.js';
import userRoutes         from './routes/users.js';
import patientRoutes      from './routes/patients.js';
import superadminRoutes   from './routes/superadmin.js';
import queueRoutes        from './routes/queue.js';
import fileRoutes         from './routes/files.js';
import contactRoutes      from './routes/query.js';
import pincodeRoutes      from './routes/pincode.js';
import prescriptionRoutes from './routes/prescriptions.js'; // ✅ NEW
import paymentRoutes       from './routes/paymentRoutes.js';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/auth',          authRoutes);
app.use('/clinics',       clinicRoutes);
app.use('/users',         userRoutes);
app.use('/patients',      patientRoutes);
app.use('/patients',      fileRoutes);
app.use('/superadmin',    superadminRoutes);
app.use('/queue',         queueRoutes);
app.use('/contact',       contactRoutes);
app.use('/pincode',       pincodeRoutes);
app.use('/prescriptions', prescriptionRoutes); // ✅ NEW
app.use('/payments', paymentRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Clinic system OK' });
});

export default app;