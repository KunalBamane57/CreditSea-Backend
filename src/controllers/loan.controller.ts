import { Request, Response, NextFunction } from 'express';
import { Loan } from '../models/Loan';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';

// POST /api/loans/apply
export const applyForLoan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { loanAmount, tenure } = req.body;

    // Validate user eligibility
    const user = await User.findById(req.user!._id);
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    if (!user.breCleared) {
      throw new AppError('You must pass the eligibility check before applying for a loan.', 400);
    }

    if (!user.profileComplete) {
      throw new AppError('Please complete your profile (upload salary slip) before applying.', 400);
    }

    // Validate loan parameters
    const amount = Number(loanAmount);
    const days = Number(tenure);

    if (!amount || amount < 50000 || amount > 500000) {
      throw new AppError('Loan amount must be between ₹50,000 and ₹5,00,000.', 400);
    }

    if (!days || days < 30 || days > 365) {
      throw new AppError('Tenure must be between 30 and 365 days.', 400);
    }

    // Calculate Simple Interest
    const interestRate = 12;
    const simpleInterest = (amount * interestRate * days) / (365 * 100);
    const totalRepayment = amount + simpleInterest;

    const loan = await Loan.create({
      borrower: user._id,
      loanAmount: amount,
      tenure: days,
      interestRate,
      simpleInterest: Math.round(simpleInterest * 100) / 100,
      totalRepayment: Math.round(totalRepayment * 100) / 100,
      outstandingBalance: Math.round(totalRepayment * 100) / 100,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully.',
      data: { loan },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/loans/my-loans
export const getMyLoans = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const loans = await Loan.find({ borrower: req.user!._id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { loans },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/loans — get all loans (filtered by status for dashboard)
export const getAllLoans = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, page = '1', limit = '20' } = req.query;

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [loans, total] = await Promise.all([
      Loan.find(filter)
        .populate('borrower', 'fullName email pan monthlySalary employmentMode dateOfBirth')
        .populate('sanctionedBy', 'fullName email')
        .populate('disbursedBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Loan.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        loans,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/loans/:id — get single loan
export const getLoanById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('borrower', 'fullName email pan monthlySalary employmentMode dateOfBirth salarySlipUrl')
      .populate('sanctionedBy', 'fullName email')
      .populate('disbursedBy', 'fullName email')
      .lean();

    if (!loan) {
      throw new AppError('Loan not found.', 404);
    }

    // Borrowers can only see their own loans
    if (
      req.user!.role === 'borrower' &&
      loan.borrower._id.toString() !== req.user!._id.toString()
    ) {
      throw new AppError('Access denied. You can only view your own loans.', 403);
    }

    res.status(200).json({
      success: true,
      data: { loan },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/loans/:id/sanction — approve loan
export const sanctionLoan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      throw new AppError('Loan not found.', 404);
    }

    if (loan.status !== 'pending') {
      throw new AppError(
        `Cannot sanction a loan with status '${loan.status}'. Only pending loans can be sanctioned.`,
        400
      );
    }

    loan.status = 'sanctioned';
    loan.sanctionedBy = req.user!._id;
    loan.sanctionedAt = new Date();
    await loan.save();

    const populated = await Loan.findById(loan._id)
      .populate('borrower', 'fullName email')
      .populate('sanctionedBy', 'fullName email')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Loan sanctioned successfully.',
      data: { loan: populated },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/loans/:id/reject — reject loan
export const rejectLoan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      throw new AppError('Rejection reason is required.', 400);
    }

    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      throw new AppError('Loan not found.', 404);
    }

    if (loan.status !== 'pending') {
      throw new AppError(
        `Cannot reject a loan with status '${loan.status}'. Only pending loans can be rejected.`,
        400
      );
    }

    loan.status = 'rejected';
    loan.rejectionReason = reason.trim();
    loan.sanctionedBy = req.user!._id;
    loan.sanctionedAt = new Date();
    await loan.save();

    res.status(200).json({
      success: true,
      message: 'Loan rejected.',
      data: { loan },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/loans/:id/disburse — disburse loan
export const disburseLoan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      throw new AppError('Loan not found.', 404);
    }

    if (loan.status !== 'sanctioned') {
      throw new AppError(
        `Cannot disburse a loan with status '${loan.status}'. Only sanctioned loans can be disbursed.`,
        400
      );
    }

    loan.status = 'disbursed';
    loan.disbursedBy = req.user!._id;
    loan.disbursedAt = new Date();
    await loan.save();

    const populated = await Loan.findById(loan._id)
      .populate('borrower', 'fullName email')
      .populate('sanctionedBy', 'fullName email')
      .populate('disbursedBy', 'fullName email')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Loan disbursed successfully. Funds released.',
      data: { loan: populated },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/loans/:id/withdraw - withdraw loan by borrower
export const withdrawLoan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      throw new AppError('Loan not found.', 404);
    }

    // Verify it belongs to the borrower
    if (loan.borrower.toString() !== req.user!._id.toString()) {
      throw new AppError('Access denied. You can only withdraw your own loans.', 403);
    }

    if (loan.status !== 'pending') {
      throw new AppError(
        `Cannot withdraw a loan with status '${loan.status}'. Only pending loans can be withdrawn.`,
        400
      );
    }

    loan.status = 'withdrawn';
    await loan.save();

    res.status(200).json({
      success: true,
      message: 'Loan withdrawn successfully.',
      data: { loan },
    });
  } catch (error) {
    next(error);
  }
};

