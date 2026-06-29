import jwt from "jsonwebtoken";
import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import env from "../config/env.js";
import { STAFF_PERMISSIONS, ROLES } from "../utils/permissions.js";
import User from "../../../models/User.js";
import SsoToken from "../models/SsoToken.js";

const signToken = (userId, clinicId = null) =>
  jwt.sign({ id: userId, clinicId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409);
    throw new Error("Email already exists");
  }
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: role,
    permissions: STAFF_PERMISSIONS.SALES_BILLING,
  });

  const token = signToken(user._id, user.clinicId);
  res.status(201).json({
    token,
    user: {
      id:       user._id,
      name: user.name,
      email:    user.email,
      role:     user.role,
      clinicId: user.clinicId,
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid credentials");
  }
  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken(user._id, user.clinicId);
  res.json({
    token,
    user: {
      id:          user._id,
      name:    user.name,
      email:       user.email,
      role:        user.role,
      permissions: user.permissions,
      clinicId:    user.clinicId,
    },
  });
});

export const ssoExchange = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400);
    throw new Error("SSO token required");
  }

  // Atomic: only deletes if token exists AND is not expired.
  // If StrictMode fires this twice, second call finds nothing → clean 401.
  const record = await SsoToken.findOneAndDelete({
    token,
    expiresAt: { $gt: new Date() }, // must not be expired
  });

  if (!record) {
    res.status(401);
    throw new Error("Invalid or expired SSO token");
  }

  let user = await User.findOne({ email: record.email });

  if (!user) {
    const role = (record.role === 'admin' || record.role === 'super_admin') ? ROLES.ADMIN : ROLES.RECEPTIONIST;
    user = await User.create({
      name:    record.email.split("@")[0],
      email:       record.email,
      password:    crypto.randomBytes(16).toString("hex"),
      role,
      permissions: role === ROLES.ADMIN ? [] : STAFF_PERMISSIONS.SALES_BILLING,
      clinicId:    record.clinicId || null,
      isActive:    true,
    });
  } else if (user.role !== ROLES.ADMIN) {
    await User.updateOne(
      { _id: user._id },
      { $set: { permissions: STAFF_PERMISSIONS.SALES_BILLING } }
    );
    user.permissions = STAFF_PERMISSIONS.SALES_BILLING;
  }

  if (record.clinicId && !user.clinicId) {
    await User.updateOne(
      { _id: user._id },
      { $set: { clinicId: String(record.clinicId) } }
    );
    user.clinicId = String(record.clinicId);
  }

  const imsToken = signToken(user._id, user.clinicId);
  res.json({
    token: imsToken,
    user: {
      id:          user._id,
      name:    user.name,
      email:       user.email,
      role:        user.role,
      permissions: user.permissions,
      clinicId:    user.clinicId,
    },
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});