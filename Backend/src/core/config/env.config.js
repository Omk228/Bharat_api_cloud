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
};

export default ENV;
