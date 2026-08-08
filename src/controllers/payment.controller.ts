import { Request, Response, NextFunction } from 'express';
import { Payment } from '../models/Payment';
import { Loan } from '../models/Loan';
import { AppError } from '../utils/AppError';

// POST /api/payments/:loanId — record a payment
export const recordPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { loanId } = req.params;
    const { utrNumber, amount, paymentDate } = req.body;

    // Validate required fields
    if (!utrNumber || !amount || !paymentDate) {
      throw new AppError('UTR number, amount, and payment date are required.', 400);
    }

    const paymentAmount = Number(amount);
    if (paymentAmount <= 0) {
      throw new AppError('Payment amount must be greater than 0.', 400);
    }

    // Find the loan
    const loan = await Loan.findById(loanId);
    if (!loan) {
      throw new AppError('Loan not found.', 404);
    }

    if (loan.status !== 'disbursed') {
      throw new AppError(
        `Payments can only be recorded for disbursed loans. Current status: '${loan.status}'.`,
        400
      );
    }

    // Check if UTR number is unique across ALL payments
    const existingPayment = await Payment.findOne({ utrNumber: utrNumber.trim() });
    if (existingPayment) {
      throw new AppError(
        `UTR number '${utrNumber}' has already been used for a previous payment. UTR numbers must be unique.`,
        409
      );
    }

    // Validate payment amount against outstanding balance
    const currentOutstanding = loan.totalRepayment - loan.totalPaid;
    if (paymentAmount > currentOutstanding) {
      throw new AppError(
        `Payment amount (₹${paymentAmount.toLocaleString('en-IN')}) exceeds outstanding balance (₹${currentOutstanding.toLocaleString('en-IN')}). Maximum allowed: ₹${currentOutstanding.toLocaleString('en-IN')}.`,
        400
      );
    }

    // Create payment record
    const payment = await Payment.create({
      loan: loan._id,
      borrower: loan.borrower,
      utrNumber: utrNumber.trim(),
      amount: paymentAmount,
      paymentDate: new Date(paymentDate),
      recordedBy: req.user!._id,
    });

    // Update loan totals
    loan.totalPaid = Math.round((loan.totalPaid + paymentAmount) * 100) / 100;
    loan.outstandingBalance = Math.round((loan.totalRepayment - loan.totalPaid) * 100) / 100;

    // Auto-close if fully paid
    if (loan.totalPaid >= loan.totalRepayment) {
      loan.status = 'closed';
      loan.closedAt = new Date();
      loan.outstandingBalance = 0;
    }

    await loan.save();

    res.status(201).json({
      success: true,
      message:
        loan.status === 'closed'
          ? 'Payment recorded. Loan is now fully paid and closed!'
          : 'Payment recorded successfully.',
      data: {
        payment,
        loan: {
          id: loan._id,
          totalPaid: loan.totalPaid,
          outstandingBalance: loan.outstandingBalance,
          totalRepayment: loan.totalRepayment,
          status: loan.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/payments/:loanId — get payments for a loan
export const getPaymentsByLoan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { loanId } = req.params;

    const loan = await Loan.findById(loanId);
    if (!loan) {
      throw new AppError('Loan not found.', 404);
    }

    // Borrowers can only see payments for their own loans
    if (
      req.user!.role === 'borrower' &&
      loan.borrower.toString() !== req.user!._id.toString()
    ) {
      throw new AppError('Access denied. You can only view payments for your own loans.', 403);
    }

    const payments = await Payment.find({ loan: loanId })
      .populate('recordedBy', 'fullName email')
      .sort({ paymentDate: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        payments,
        summary: {
          totalPayments: payments.length,
          totalPaid: loan.totalPaid,
          outstandingBalance: loan.outstandingBalance,
          totalRepayment: loan.totalRepayment,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
