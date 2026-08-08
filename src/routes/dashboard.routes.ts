import { Router } from 'express';
import { getSalesLeads, getDashboardStats } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.get('/sales', authenticate, authorize('admin', 'sales'), getSalesLeads);
router.get('/stats', authenticate, authorize('admin'), getDashboardStats);

export default router;
