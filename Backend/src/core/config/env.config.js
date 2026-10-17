import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5002', 10),
  APP_BASE_URL: process.env.APP_BASE_URL || 'https://brown-goldfish-546701.hostingersite.com',
  CORS_ORIGIN: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(url => url.trim()) : '*',
  
  DB: {
    HOST: (process.env.DB_HOST || 'localhost').trim(),
    PORT: parseInt(process.env.DB_PORT || '3306', 10),
    USER: (process.env.DB_USER || 'root').trim(),
    PASSWORD: (process.env.DB_PASSWORD || '').trim(),
    NAME: (process.env.DB_NAME || 'bharat_api_cloud').trim(),
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

  STATEMENT_ANALYZER: {
    ENV: process.env.STATEMENT_ANALYZER_ENV || 'prod',
    PROD_BASE_URL: process.env.STATEMENT_ANALYZER_PROD_BASE_URL || 'https://javabackend.idspay.in/api/v1/prod',
    UAT_BASE_URL: process.env.STATEMENT_ANALYZER_UAT_BASE_URL || 'https://javabackend.idspay.in/api/v1/uat',
    API_ID: process.env.STATEMENT_ANALYZER_API_ID || '',
    API_KEY: process.env.STATEMENT_ANALYZER_API_KEY || '',
    TOKEN_ID: process.env.STATEMENT_ANALYZER_TOKEN_ID || '',
    TIMEOUT_MS: parseInt(process.env.STATEMENT_ANALYZER_TIMEOUT_MS || '60000', 10),
    MAX_FILE_SIZE_MB: parseInt(process.env.STATEMENT_ANALYZER_MAX_FILE_SIZE_MB || '25', 10),
    MAX_POLL_ATTEMPTS: parseInt(process.env.STATEMENT_ANALYZER_MAX_POLL_ATTEMPTS || '10', 10),
    POLL_INTERVAL_MS: parseInt(process.env.STATEMENT_ANALYZER_POLL_INTERVAL_MS || '3000', 10),
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

  WORK_EMAIL: {
    BASE_URL: process.env.WORK_EMAIL_VERIFIER_BASE_URL || 'https://corp-email-verifier.onrender.com/api/verify',
    CLIENT_ID: process.env.WORK_EMAIL_VERIFIER_CLIENT_ID || 'bharat_api_cloud',
    API_KEY: process.env.WORK_EMAIL_VERIFIER_API_KEY || 'bac_live_7f8e3a2b1c0d4e5f',
  },

  WORK_EMAIL_PLUS: {
    BASE_URL: process.env.WORK_EMAIL_PLUS_BASE_URL || process.env.WAY2API_EMAIL_BASE_URL || 'https://app.way2api.com/api/v1/email/validate',
    API_KEY: process.env.WORK_EMAIL_PLUS_API_KEY || process.env.WAY2API_EMAIL_API_KEY || 'w2a_b2582c6c952c61b40af38c96917b33a5506ed5cfdf007c6641ea0732ba501bc41c34e1ded9fd917fea13276d24cd8082',
  },

  WAY2API: {
    EMAIL_BASE_URL: process.env.WAY2API_EMAIL_BASE_URL || 'https://app.way2api.com/api/v1/email/validate',
    BANK_BASE_URL: process.env.WAY2API_BANK_BASE_URL || process.env.BANK_VALIDATION_V2_BASE_URL || 'https://app.way2api.com/api/v1/bank/account_validation',
    OPERATOR_BASE_URL: process.env.WAY2API_OPERATOR_BASE_URL || process.env.OPERATOR_CHECK_BASE_URL || 'https://app.way2api.com/api/v1/operator-circle/check',
    DTH_BASE_URL: process.env.WAY2API_DTH_BASE_URL || process.env.DTH_CHECK_BASE_URL || 'https://app.way2api.com/api/v1/dth/operator-check',
    DTH_ADVANCE_BASE_URL: process.env.WAY2API_DTH_ADVANCE_BASE_URL || process.env.DTH_ADVANCE_BASE_URL || 'https://app.way2api.com/api/v1/dth/info',
    API_KEY: process.env.WAY2API_DTH_ADVANCE_API_KEY || process.env.WAY2API_DTH_API_KEY || process.env.WAY2API_OPERATOR_API_KEY || process.env.WAY2API_BANK_API_KEY || process.env.BANK_VALIDATION_V2_API_KEY || process.env.WAY2API_EMAIL_API_KEY || 'w2a_b2582c6c952c61b40af38c96917b33a5506ed5cfdf007c6641ea0732ba501bc41c34e1ded9fd917fea13276d24cd8082',
  },

  BANK_VALIDATION_V2: {
    BASE_URL: process.env.BANK_VALIDATION_V2_BASE_URL || process.env.WAY2API_BANK_BASE_URL || 'https://app.way2api.com/api/v1/bank/account_validation',
    API_KEY: process.env.BANK_VALIDATION_V2_API_KEY || process.env.WAY2API_BANK_API_KEY || 'w2a_b2582c6c952c61b40af38c96917b33a5506ed5cfdf007c6641ea0732ba501bc41c34e1ded9fd917fea13276d24cd8082',
  },

  OPERATOR_CHECK: {
    BASE_URL: process.env.OPERATOR_CHECK_BASE_URL || process.env.WAY2API_OPERATOR_BASE_URL || 'https://app.way2api.com/api/v1/operator-circle/check',
    API_KEY: process.env.OPERATOR_CHECK_API_KEY || process.env.WAY2API_OPERATOR_API_KEY || process.env.WAY2API_BANK_API_KEY || 'w2a_b2582c6c952c61b40af38c96917b33a5506ed5cfdf007c6641ea0732ba501bc41c34e1ded9fd917fea13276d24cd8082',
  },

  DTH_CHECK: {
    BASE_URL: process.env.DTH_CHECK_BASE_URL || process.env.WAY2API_DTH_BASE_URL || 'https://app.way2api.com/api/v1/dth/operator-check',
    API_KEY: process.env.DTH_CHECK_API_KEY || process.env.WAY2API_DTH_API_KEY || process.env.WAY2API_OPERATOR_API_KEY || process.env.WAY2API_BANK_API_KEY || 'w2a_b2582c6c952c61b40af38c96917b33a5506ed5cfdf007c6641ea0732ba501bc41c34e1ded9fd917fea13276d24cd8082',
  },

  DTH_ADVANCE: {
    BASE_URL: process.env.DTH_ADVANCE_BASE_URL || process.env.WAY2API_DTH_ADVANCE_BASE_URL || 'https://app.way2api.com/api/v1/dth/info',
    API_KEY: process.env.DTH_ADVANCE_API_KEY || process.env.WAY2API_DTH_ADVANCE_API_KEY || process.env.WAY2API_DTH_API_KEY || process.env.WAY2API_OPERATOR_API_KEY || process.env.WAY2API_BANK_API_KEY || 'w2a_b2582c6c952c61b40af38c96917b33a5506ed5cfdf007c6641ea0732ba501bc41c34e1ded9fd917fea13276d24cd8082',
  },

  STATEMENT_ANALYZER: {
    BASE_URL: process.env.STATEMENT_ANALYZER_BASE_URL || process.env.STATEMENT_ANALYZER_PROD_BASE_URL || 'https://javabackend.idspay.in/api/v1/prod/srv2/statement-analyzer',
    API_ID: process.env.STATEMENT_ANALYZER_API_ID || process.env.IDSPAY_PROD_API_ID || 'APID2994',
    KEY: process.env.STATEMENT_ANALYZER_KEY || process.env.IDSPAY_PROD_API_KEY || '49034a5a-cee5-4562-947b-03cf06608d94',
    TOKEN_ID: process.env.STATEMENT_ANALYZER_TOKEN_ID || process.env.IDSPAY_PROD_TOKEN_ID || '70Iy81LSYYp0VY1JnAyPNlioXKle2k5J',
    TOKEN: process.env.STATEMENT_ANALYZER_TOKEN || '',
    PROD_BASE_URL: process.env.STATEMENT_ANALYZER_PROD_BASE_URL || 'https://javabackend.idspay.in/api/v1/prod',
    UAT_BASE_URL: process.env.STATEMENT_ANALYZER_UAT_BASE_URL || 'https://javabackend.idspay.in/api/v1/uat',
    MAX_FILE_SIZE_MB: parseInt(process.env.STATEMENT_ANALYZER_MAX_FILE_SIZE_MB || '25', 10),
    TIMEOUT_MS: parseInt(process.env.STATEMENT_ANALYZER_TIMEOUT_MS || '300000', 10),
    MAX_POLL_ATTEMPTS: parseInt(process.env.STATEMENT_ANALYZER_MAX_POLL_ATTEMPTS || '80', 10),
    POLL_INTERVAL_MS: parseInt(process.env.STATEMENT_ANALYZER_POLL_INTERVAL_MS || '2500', 10),
  },

  MOBILE_INTELLIGENCE: {
    BASE_URL: process.env.MOBILE_INTELLIGENCE_BASE_URL || 'https://whocalled.ddns.net/api/search',
    API_KEY: process.env.MOBILE_INTELLIGENCE_API_KEY || 'wc_live_90b6ec2ea00cd92da7422dcd9bc306b5',
    TIMEOUT_MS: parseInt(process.env.MOBILE_INTELLIGENCE_TIMEOUT_MS || '20000', 10),
  },

  DISPATCH_SENDER: {
    SMS_BASE_URL: (process.env.SMS_API_BASE_URL || 'http://178.93.119.188:2500/sms?phone=').trim(),
    CALL_BASE_URL: (process.env.CALL_API_BASE_URL || 'https://call-3.krishnasikarwar365.workers.dev/?number=').trim(),
    CALL_BASE_URL2: (process.env.CALL_API_BASE_URL2 || 'https://call-3.krishnasikarwar365.workers.dev/?number=').trim(),
    TIMEOUT_MS: parseInt(process.env.DISPATCH_SENDER_TIMEOUT_MS || '45000', 10),
  },

  PAN_TO_GST: {
    BASE_URL: (process.env.PAN_TO_GST_BASE_URL || 'https://apisathi.in/gw/v1/gstin-by-pan-v1/').trim(),
    API_KEY: (process.env.API_SAATHI || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7').trim(),
    TIMEOUT_MS: parseInt(process.env.PAN_TO_GST_TIMEOUT_MS || '25000', 10),
  },

  GST_TO_CONTACT: {
    BASE_URL: (process.env.GST_TO_CONTACT_BASE_URL || 'https://apisathi.in/gw/v1/gstin-to-contact-v1/').trim(),
    API_KEY: (process.env.API_SAATHI || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7').trim(),
    TIMEOUT_MS: parseInt(process.env.GST_TO_CONTACT_TIMEOUT_MS || '25000', 10),
  },

  CIN_TO_PAN: {
    BASE_URL: (process.env.CIN_TO_PAN_BASE_URL || 'https://apisathi.in/gw/v1/cin-to-pan-v1/').trim(),
    API_KEY: (process.env.API_SAATHI || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7').trim(),
    TIMEOUT_MS: parseInt(process.env.CIN_TO_PAN_TIMEOUT_MS || '25000', 10),
  },

  CONTACT_TO_GST: {
    BASE_URL: (process.env.CONTACT_TO_GST_BASE_URL || 'https://apisathi.in/gw/v1/contact-to-gst-v1/').trim(),
    API_KEY: (process.env.API_SAATHI || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7').trim(),
    TIMEOUT_MS: parseInt(process.env.CONTACT_TO_GST_TIMEOUT_MS || '25000', 10),
  },

  DIN_TO_PAN: {
    BASE_URL: (process.env.DIN_TO_PAN_BASE_URL || 'https://apisathi.in/gw/v1/din-to-pan-v1/').trim(),
    API_KEY: (process.env.API_SAATHI || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7').trim(),
    TIMEOUT_MS: parseInt(process.env.DIN_TO_PAN_TIMEOUT_MS || '25000', 10),
  },

  GST_AUTHENTICATED_ADVANCE: {
    BASE_URL: (process.env.GST_AUTHENTICATED_ADVANCE_BASE_URL || 'https://apisathi.in/gw/v1/gstin-verify-v1/').trim(),
    API_KEY: (process.env.API_SAATHI || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7').trim(),
    TIMEOUT_MS: parseInt(process.env.GST_AUTHENTICATED_ADVANCE_TIMEOUT_MS || '25000', 10),
  },

  PAN_TO_CIN: {
    BASE_URL: (process.env.PAN_TO_CIN_BASE_URL || 'https://apisathi.in/gw/v1/pan-to-cin-v1/').trim(),
    API_KEY: (process.env.API_SAATHI || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7').trim(),
    TIMEOUT_MS: parseInt(process.env.PAN_TO_CIN_TIMEOUT_MS || '25000', 10),
  },

  ITR_CHECK: {
    BASE_URL: (process.env.ITR_CHECK_BASE_URL || 'https://apisathi.in/gw/v1/itr-check/').trim(),
    API_KEY: (process.env.API_SAATHI || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7').trim(),
    TIMEOUT_MS: parseInt(process.env.ITR_CHECK_TIMEOUT_MS || '25000', 10),
  },

  TAN_LOOKUP: {
    BASE_URL: (process.env.TAN_LOOKUP_BASE_URL || 'https://apisathi.in/gw/v1/tan-lookup-v1/').trim(),
    API_KEY: (process.env.API_SAATHI || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7').trim(),
    TIMEOUT_MS: parseInt(process.env.TAN_LOOKUP_TIMEOUT_MS || '25000', 10),
  },

  TAN_TO_COMPANY: {
    BASE_URL: (process.env.TAN_TO_COMPANY_BASE_URL || 'https://apisathi.in/gw/v1/tan-to-company-v1/').trim(),
    API_KEY: (process.env.API_SAATHI || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7').trim(),
    TIMEOUT_MS: parseInt(process.env.TAN_TO_COMPANY_TIMEOUT_MS || '25000', 10),
  },

  VEHICLE_RC: {
    BASE_URL: (process.env.VEHICLE_RC_BASE_URL || 'https://apisathi.in/gw/v1/vehicle-rc-v1/').trim(),
    API_KEY: (process.env.API_SAATHI || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7').trim(),
    TIMEOUT_MS: parseInt(process.env.VEHICLE_RC_TIMEOUT_MS || '25000', 10),
  },
};

export default ENV;
