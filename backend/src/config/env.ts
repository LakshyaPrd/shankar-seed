import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'mongodb+srv://pradhan2k4_db_user:dZUCc3T3G70CDxlv@shankar-seed.xgxrgak.mongodb.net/shankar_seeds_erp?retryWrites=true&w=majority',
  JWT_SECRET: process.env.JWT_SECRET || 'shankar_seeds_erp_super_secret_jwt_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'shankar_seeds_erp_refresh_secret_key_2026',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};
