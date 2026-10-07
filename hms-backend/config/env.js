import dotenv from 'dotenv';
dotenv.config();

// Refuse to start without strong, non-default secrets
function required(name) {
  const v = process.env[name];
  if (!v || v.length < 32 || /replace-with|Password123|super123|clinic_secret_key_here|change[-_]?me/i.test(v)) {
    console.error('FATAL: ' + name + ' is missing, shorter than 32 characters, or a default value. Refusing to start.');
    process.exit(1);
  }
  return v;
}


const env = {
  nodeEnv:            process.env.NODE_ENV             || "production",
  port:               process.env.PORT                 || 5000,
  // clinicMongoUri: process.env.CLINIC_MONGO_URI,
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn:       process.env.JWT_EXPIRES_IN       || "30d",
  ssoSecret: required("SSO_SECRET"),
  superAdminEmail:    process.env.SUPER_ADMIN_EMAIL,
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD,
  clientUrl:          process.env.CLIENT_URL           || "https://curelex.in",
};

export default env;