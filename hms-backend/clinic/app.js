import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

import clinicModule from './clinic/app.js';
import mongoose from 'mongoose';

const mainApp = express();
// ========== MOUNT IMS SYSTEM ==========
// IMS routes are already prefixed with /api/v1 internally

// This makes IMS accessible at /ims/api/v1/*

// ========== MOUNT CLINIC SYSTEM ==========
// Clinic will be mounted at /clinic
// We'll create clinic app that exports without listening

// Health check for merged system


mainApp.get("/health", (req, res) => {
  res.json({
    status: "OK",
    systems: ["clinic"],
    endpoints: {
      
      clinic: "/clinic/api"
    }
  });
});

export default mainApp;