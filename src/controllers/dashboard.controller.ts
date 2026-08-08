import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Loan } from '../models/Loan';
import { AppError } from '../utils/AppError';

// GET /api/dashboard/sales — registered users who haven't applied (leads)
export const getSalesLeads = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get all borrower user IDs who have at least one loan
    const borrowerIdsWithLoans = await Loan.distinct('borrower');

    // Find borrowers who have NOT applied for any loan
    const leads = await User.find({
      role: 'borrower',
      _id: { $nin: borrowerIdsWithLoans },
    })
      .select('fullName email pan monthlySalary employmentMode breCleared profileComplete createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        leads,
        totalLeads: leads.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/stats — summary stats for admin
export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalBorrowers,
      totalLoans,
      pendingLoans,
      sanctionedLoans,
      disbursedLoans,
      closedLoans,
      rejectedLoans,
      totalDisbursedAmount,
      totalCollected,
    ] = await Promise.all([
      User.countDocuments({ role: 'borrower' }),
      Loan.countDocuments(),
      Loan.countDocuments({ status: 'pending' }),
      Loan.countDocuments({ status: 'sanctioned' }),
      Loan.countDocuments({ status: 'disbursed' }),
      Loan.countDocuments({ status: 'closed' }),
      Loan.countDocuments({ status: 'rejected' }),
      Loan.aggregate([
        { $match: { status: { $in: ['disbursed', 'closed'] } } },
        { $group: { _id: null, total: { $sum: '$loanAmount' } } },
      ]),
      Loan.aggregate([
        { $match: { status: { $in: ['disbursed', 'closed'] } } },
        { $group: { _id: null, total: { $sum: '$totalPaid' } } },
      ]),
    ]);

    // Get borrowers without loans for sales leads count
    const borrowerIdsWithLoans = await Loan.distinct('borrower');
    const totalLeads = await User.countDocuments({
      role: 'borrower',
      _id: { $nin: borrowerIdsWithLoans },
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalBorrowers,
          totalLeads,
          totalLoans,
          pendingLoans,
          sanctionedLoans,
          disbursedLoans,
          closedLoans,
          rejectedLoans,
          totalDisbursedAmount: totalDisbursedAmount[0]?.total || 0,
          totalCollected: totalCollected[0]?.total || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
