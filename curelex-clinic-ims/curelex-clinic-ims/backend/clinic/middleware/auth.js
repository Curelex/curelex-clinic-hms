import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export default function (req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      message: 'No token provided'
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      message: 'Malformed token'
    });
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);

    req.user = decoded;

    next();

  } catch (err) {

    console.log('JWT ERROR:', err.message);

    return res.status(401).json({
      message: 'Invalid or expired token'
    });
  }
}