import { Router } from 'express';
import { updatePersonalDetails, uploadSalarySlip } from '../controllers/user.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { upload } from '../middleware/upload';

const router = Router();

router.put(
  '/personal-details',
  authenticate,
  authorize('borrower'),
  updatePersonalDetails
);

router.post(
  '/upload-salary-slip',
  authenticate,
  authorize('borrower'),
  upload.single('salarySlip'),
  uploadSalarySlip
);

export default router;
