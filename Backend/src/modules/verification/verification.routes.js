import { Router } from 'express';
import panRoutes from './pan/pan.routes.js';
import aadhaarRoutes from './aadhaar/aadhaar.routes.js';
import bankRoutes from './bank/bank.routes.js';
import prefillRoutes from './prefill/prefill.routes.js';
import nameFinderRoutes from './name_finder/nameFinder.routes.js';
import mobileUpiRoutes from './mobile_upi/mobileUpi.routes.js';
import digilockerRoutes from './digilocker/digilocker.routes.js';
import mobileToBankRoutes from './mobile_to_bank/mobileToBank.routes.js';
import workEmailRoutes from './work_email/workEmail.routes.js';
import operatorRoutes from './operator/operator.routes.js';
import dthRoutes from './dth/dth.routes.js';
import panToGstRoutes from './pan_to_gst/panToGst.routes.js';
import gstToContactRoutes from './gst_to_contact/gstToContact.routes.js';
import cinToPanRoutes from './cin_to_pan/cinToPan.routes.js';
import contactToGstRoutes from './contact_to_gst/contactToGst.routes.js';
import panToCinRoutes from './pan_to_cin/panToCin.routes.js';
import itrCheckRoutes from './itr_check/itrCheck.routes.js';
import tanLookupRoutes from './tan_lookup/tanLookup.routes.js';
import tanToCompanyRoutes from './tan_to_company/tanToCompany.routes.js';
import vehicleRcRoutes from './vehicle_rc/vehicleRc.routes.js';
import voterIdRoutes from './voter_id/voterId.routes.js';

const router = Router();

// Mount Verification Sub-Domains
router.use('/', panRoutes);
router.use('/', aadhaarRoutes);
router.use('/', bankRoutes);
router.use('/', prefillRoutes);
router.use('/', nameFinderRoutes);
router.use('/', mobileUpiRoutes);
router.use('/', digilockerRoutes);
router.use('/', mobileToBankRoutes);
router.use('/', workEmailRoutes);
router.use('/', operatorRoutes);
router.use('/', dthRoutes);
router.use('/', panToGstRoutes);
router.use('/', gstToContactRoutes);
router.use('/', cinToPanRoutes);
router.use('/', contactToGstRoutes);
router.use('/', panToCinRoutes);
router.use('/', itrCheckRoutes);
router.use('/', tanLookupRoutes);
router.use('/', tanToCompanyRoutes);
router.use('/', vehicleRcRoutes);
router.use('/', voterIdRoutes);

export default router;
