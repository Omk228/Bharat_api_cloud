import { Router } from 'express';
import { VehicleRcController } from './vehicleRc.controller.js';
import verifyApiClientCredentials from '../../credentials/apiAuth.middleware.js';

const router = Router();

/**
 * Vehicle RC Verification Routes
 * Supported paths:
 * 1. POST /verify/vehicle-rc & POST /api/v1/verify/vehicle-rc
 * 2. POST /vehicle-rc & POST /api/v1/vehicle-rc
 * 3. GET /verify/vehicle-rc & GET /api/v1/verify/vehicle-rc (for console / test params)
 */
const supportedPaths = [
  '/verify/vehicle-rc',
  '/api/v1/verify/vehicle-rc',
  '/vehicle-rc',
  '/api/v1/vehicle-rc',
];

supportedPaths.forEach((path) => {
  router.post(path, verifyApiClientCredentials, VehicleRcController.verifyVehicleRc);
  router.get(path, verifyApiClientCredentials, VehicleRcController.verifyVehicleRc);
});

// Also support base mounted paths when router is mounted at /verify/vehicle-rc or /vehicle-rc
router.post('/', verifyApiClientCredentials, VehicleRcController.verifyVehicleRc);
router.get('/', verifyApiClientCredentials, VehicleRcController.verifyVehicleRc);

export default router;
