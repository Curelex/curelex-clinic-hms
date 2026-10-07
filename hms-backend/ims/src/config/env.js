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
  nodeEnv:        process.env.NODE_ENV        || "production",
  port:           process.env.PORT            || 5001,
  mongoUri:       process.env.MONGO_URI       || "mongodb://localhost:27017/hms",
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn:   process.env.JWT_EXPIRES_IN  || "30d",
  ssoSecret: required("SSO_SECRET"),
  defaultGstRate: Number(process.env.DEFAULT_GST_RATE || 18),
  invoicePrefix:  process.env.INVOICE_PREFIX  || "INV",
  invoiceDigits:  Number(process.env.INVOICE_DIGITS   || 4),
  clientUrl:      process.env.CLIENT_URL      || "https://curelex.in"
};

export default env;