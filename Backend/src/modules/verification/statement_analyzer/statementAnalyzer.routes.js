import { Router } from 'express';
import multer from 'multer';
import StatementAnalyzerController from './statementAnalyzer.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';
import { ENV } from '../../../core/config/env.config.js';

const router = Router();

const maxFileSizeMb = parseInt(process.env.STATEMENT_ANALYZER_MAX_FILE_SIZE_MB || ENV.STATEMENT_ANALYZER?.MAX_FILE_SIZE_MB || '25', 10);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSizeMb * 1024 * 1024,
  },
});

// Middleware that safely handles multipart file upload or passes through standard body
const handleFileUpload = (req, res, next) => {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: {
            code: 400,
            type: 'error',
            message: `File size exceeds maximum allowed limit of ${maxFileSizeMb}MB.`,
          },
          message: `File size exceeds maximum allowed limit of ${maxFileSizeMb}MB.`,
          result_code: 102,
        });
      }
      return res.status(400).json({
        status: {
          code: 400,
          type: 'error',
          message: err.message || 'File upload error.',
        },
        message: err.message || 'File upload error.',
        result_code: 102,
      });
    } else if (err) {
      return next(err);
    }
    next();
  });
};

// Canonical Public Route (Bharat API Cloud Standard)
router.post('/statement-analyzer', handleFileUpload, verifyApiClientCredentials, StatementAnalyzerController.handleRequest);

// Retained Legacy Aliases (Preserved for existing database catalog & backward compatibility)
router.post('/srv2/statement-upload', handleFileUpload, verifyApiClientCredentials, StatementAnalyzerController.handleRequest);
router.post('/srv2/statement-analyzer', handleFileUpload, verifyApiClientCredentials, StatementAnalyzerController.handleRequest);
router.post('/statement-upload', handleFileUpload, verifyApiClientCredentials, StatementAnalyzerController.handleRequest);

export default router;
