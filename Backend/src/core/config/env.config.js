import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(url => url.trim()) : '*',
  
  DB: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: parseInt(process.env.DB_PORT || '3306', 10),
    USER: process.env.DB_USER || 'root',
    PASSWORD: process.env.DB_PASSWORD || '',
    NAME: process.env.DB_NAME || 'bharat_api_cloud',
    CONNECTION_LIMIT: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  },

  JWT: {
    SECRET: process.env.JWT_SECRET || 'default_jwt_secret_dev_only',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  },

  IDSPAY: {
    PROD_BASE_URL: process.env.IDSPAY_PROD_BASE_URL || 'https://javabackend.idspay.in/api/v1/prod',
    PROD_API_ID: process.env.IDSPAY_PROD_API_ID || '',
    PROD_API_KEY: process.env.IDSPAY_PROD_API_KEY || '',
    PROD_TOKEN_ID: process.env.IDSPAY_PROD_TOKEN_ID || '',
  },

  REDIS: {
    HOST: process.env.REDIS_HOST || '127.0.0.1',
    PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
    PASSWORD: process.env.REDIS_PASSWORD || undefined,
    URL: process.env.REDIS_URL || undefined,
    ENABLED: process.env.REDIS_ENABLED !== 'false',
  },

  APILAYER: {
    BASE_URL: process.env.APILAYER_BASE_URL || 'http://api.ipstack.com',
    API_KEY: process.env.APILAYER_API_KEY || 'bf84d54dbdaaec1f0de7b4fe72700f64',
    API_KEY_2: process.env.APILAYER_API_KEY_2 || '9ead07fd7a2835ddaa0a86777d3ee6bf',
    KEYS: [
      process.env.APILAYER_API_KEY || 'bf84d54dbdaaec1f0de7b4fe72700f64',
      process.env.APILAYER_API_KEY_2 || '9ead07fd7a2835ddaa0a86777d3ee6bf',
    ].filter(Boolean),
    ROTATION_THRESHOLD: parseInt(process.env.APILAYER_KEY_ROTATION_THRESHOLD || '99', 10),
  },

  NOMINATIM: {
    BASE_URL: process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org',
  },

  IDFY: {
    BASE_URL: process.env.IDFY_BASE_URL || 'https://eve.idfy.com/v3',
    ACCOUNT_ID: process.env.IDFY_ACCOUNT_ID || '',
    API_KEY: process.env.IDFY_API_KEY || '',
  },

  APYHUB: {
    BASE_URL: process.env.APYHUB_BASE_URL || 'https://api.eu.apyhub.com',
    API_TOKEN: process.env.APYHUB_API_TOKEN || 'c9a47496f3070e07e1d4370329bf9b93e876eeb05f4cc492101a1cd4512e24e0',
  },

  RAZORPAY_IFSC: {
    BASE_URL: process.env.RAZORPAY_IFSC_BASE_URL || 'https://ifsc.razorpay.com',
  },
};

export default ENV;
