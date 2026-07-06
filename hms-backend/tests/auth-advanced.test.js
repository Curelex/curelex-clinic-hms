// hms-backend/tests/auth-advanced.test.js
import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Clinic from '../models/Clinic.js';
import Patient from '../models/Patient.js';
import authRoutes from '../routes/auth.js';
import bcrypt from 'bcryptjs';

let mongoServer;
let app;
let clinic;
let testUser;

const JWT_SECRET = 'super_secret_for_hms';
process.env.JWT_SECRET = JWT_SECRET;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);

  clinic = await Clinic.create({
    name: 'Auth Test Clinic',
    email: 'authclinic@test.com',
    phone: '1234567890'
  });

  // Create a regular user for password reset and google login matching
  testUser = await User.create({
    name: 'Existing Staff',
    email: 'existingstaff@test.com',
    password: 'oldpassword123',
    role: 'receptionist',
    clinicId: clinic._id
  });
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Google Authentication & Forgot/Reset Password Tests', () => {
  describe('Google Login Integration', () => {
    it('should successfully log in an existing user with Google email', async () => {
      const res = await request(app)
        .post('/api/auth/google-login')
        .send({
          email: 'existingstaff@test.com',
          name: 'Existing Staff'
        });

      expect(res.status).to.equal(200);
      expect(res.body.token).to.be.a('string');
      expect(res.body.user.email).to.equal('existingstaff@test.com');
    });

    it('should automatically sign up and log in a new user as a patient', async () => {
      const res = await request(app)
        .post('/api/auth/google-login')
        .send({
          email: 'newpatient@gmail.com',
          name: 'New Patient',
          isPatient: true
        });

      expect(res.status).to.equal(200);
      expect(res.body.token).to.be.a('string');
      expect(res.body.user.role).to.equal('patient');
      expect(res.body.patient).to.be.an('object');
      expect(res.body.patient.name).to.equal('New Patient');

      // Verify they are registered in the DB
      const dbUser = await User.findOne({ email: 'newpatient@gmail.com' });
      expect(dbUser).to.not.be.null;
      expect(dbUser.role).to.equal('patient');

      const dbPatient = await Patient.findOne({ email: 'newpatient@gmail.com' });
      expect(dbPatient).to.not.be.null;
      expect(dbPatient.userId.toString()).to.equal(dbUser._id.toString());
    });

    it('should reject Google login for a new email that is not registered as staff', async () => {
      const res = await request(app)
        .post('/api/auth/google-login')
        .send({
          email: 'unregisteredstaff@test.com',
          name: 'Fake Doc',
          isPatient: false
        });

      expect(res.status).to.equal(404);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.contain('No staff account found');
    });
  });

  describe('Forgot & Reset Password Flow', () => {
    let resetToken = '';

    it('should fail if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(res.status).to.equal(400);
    });

    it('should fail for an unregistered email address', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      expect(res.status).to.equal(404);
    });

    it('should generate reset token and return reset link for a registered email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'existingstaff@test.com' });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.resetLink).to.be.a('string');

      // Check DB values
      const dbUser = await User.findOne({ email: 'existingstaff@test.com' });
      expect(dbUser.resetPasswordToken).to.be.a('string');
      expect(dbUser.resetPasswordExpires).to.be.a('Date');

      // Save token for the next test
      resetToken = dbUser.resetPasswordToken;
    });

    it('should reject password reset if token is invalid or expired', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: 'existingstaff@test.com',
          token: 'invalidtoken123',
          newPassword: 'newsecurepassword123'
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
    });

    it('should reset password successfully with valid token and email', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: 'existingstaff@test.com',
          token: resetToken,
          newPassword: 'newsecurepassword123'
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;

      // Verify password change in database
      const dbUser = await User.findOne({ email: 'existingstaff@test.com' });
      expect(dbUser.resetPasswordToken).to.be.null;
      expect(dbUser.resetPasswordExpires).to.be.null;

      // Verify the new password can be verified
      const isMatch = await bcrypt.compare('newsecurepassword123', dbUser.password);
      expect(isMatch).to.be.true;
    });
  });
});
