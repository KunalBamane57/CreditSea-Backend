import { Router } from 'express';
import {
  applyForLoan,
  getMyLoans,
  getAllLoans,
  getLoanById,
  sanctionLoan,
  rejectLoan,
  disburseLoan,
  withdrawLoan,
} from '../controllers/loan.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

// Borrower routes
router.post('/apply', authenticate, authorize('borrower'), applyForLoan);
router.get('/my-loans', authenticate, authorize('borrower'), getMyLoans);
router.put('/:id/withdraw', authenticate, authorize('borrower'), withdrawLoan);

// Dashboard routes (executives + admin)
router.get(
  '/',
  authenticate,
  authorize('admin', 'sales', 'sanction', 'disbursement', 'collection'),
  getAllLoans
);

router.get(
  '/:id',
  authenticate,
  authorize('admin', 'borrower', 'sales', 'sanction', 'disbursement', 'collection'),
  getLoanById
);

// Sanction actions
router.put('/:id/sanction', authenticate, authorize('admin', 'sanction'), sanctionLoan);
router.put('/:id/reject', authenticate, authorize('admin', 'sanction'), rejectLoan);

// Disbursement action
router.put('/:id/disburse', authenticate, authorize('admin', 'disbursement'), disburseLoan);

export default router;

