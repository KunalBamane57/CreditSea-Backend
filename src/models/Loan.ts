import mongoose, { Document, Schema } from 'mongoose';

export type LoanStatus = 'pending' | 'sanctioned' | 'rejected' | 'disbursed' | 'closed' | 'withdrawn';

export interface ILoan extends Document {
  borrower: mongoose.Types.ObjectId;
  loanAmount: number;
  tenure: number;
  interestRate: number;
  simpleInterest: number;
  totalRepayment: number;
  totalPaid: number;
  outstandingBalance: number;
  status: LoanStatus;
  rejectionReason?: string;
  sanctionedBy?: mongoose.Types.ObjectId;
  sanctionedAt?: Date;
  disbursedBy?: mongoose.Types.ObjectId;
  disbursedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const loanSchema = new Schema<ILoan>(
  {
    borrower: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    loanAmount: {
      type: Number,
      required: [true, 'Loan amount is required'],
      min: [50000, 'Minimum loan amount is ₹50,000'],
      max: [500000, 'Maximum loan amount is ₹5,00,000'],
    },
    tenure: {
      type: Number,
      required: [true, 'Tenure is required'],
      min: [30, 'Minimum tenure is 30 days'],
      max: [365, 'Maximum tenure is 365 days'],
    },
    interestRate: {
      type: Number,
      default: 12,
    },
    simpleInterest: {
      type: Number,
      required: true,
    },
    totalRepayment: {
      type: Number,
      required: true,
    },
    totalPaid: {
      type: Number,
      default: 0,
    },
    outstandingBalance: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sanctioned', 'rejected', 'disbursed', 'closed', 'withdrawn'],
      default: 'pending',
      index: true,
    },
    rejectionReason: {
      type: String,
    },
    sanctionedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    sanctionedAt: {
      type: Date,
    },
    disbursedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    disbursedAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save: calculate SI and totals
loanSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('loanAmount') || this.isModified('tenure')) {
    // SI = (P × R × T) / (365 × 100) where T = tenure in days
    this.simpleInterest = (this.loanAmount * this.interestRate * this.tenure) / (365 * 100);
    this.simpleInterest = Math.round(this.simpleInterest * 100) / 100;
    this.totalRepayment = Math.round((this.loanAmount + this.simpleInterest) * 100) / 100;
    this.outstandingBalance = Math.round((this.totalRepayment - this.totalPaid) * 100) / 100;
  }
  next();
});

export const Loan = mongoose.model<ILoan>('Loan', loanSchema);
