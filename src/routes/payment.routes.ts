import { Router } from 'express';
import { recordPayment, getPaymentsByLoan } from '../controllers/payment.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.post(
  '/:loanId',
  authenticate,
  authorize('admin', 'collection'),
  recordPayment
);

router.get(
  '/:loanId',
  authenticate,
  authorize('admin', 'collection', 'borrower'),
  getPaymentsByLoan
);

export default router;
