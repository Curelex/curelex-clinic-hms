import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import imsApp from './ims/app.js';
import clinicModule from './clinic/app.js';

const mainApp = express();

// Basic middleware for main app
mainApp.use(cors({ origin: "*", credentials: true }));
mainApp.use(express.json());

// ========== MOUNT IMS SYSTEM ==========
// IMS routes are already prefixed with /api/v1 internally
mainApp.use("/ims", imsApp); 
// This makes IMS accessible at /ims/api/v1/*

// ========== MOUNT CLINIC SYSTEM ==========
// Clinic will be mounted at /clinic
// We'll create clinic app that exports without listening

// Health check for merged system
mainApp.get("/health", (req, res) => {
  res.json({
    status: "OK",
    systems: ["ims", "clinic"],
    endpoints: {
      ims: "/ims/api/v1",
      clinic: "/clinic/api"
    }
  });
});

export default mainApp;