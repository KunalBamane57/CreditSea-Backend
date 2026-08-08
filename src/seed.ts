import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db';
import { User } from './models/User';
import { Loan } from './models/Loan';
import { Payment } from './models/Payment';
import { env } from './config/env';

/**
 * Seed Script — Creates one account per role for evaluator testing.
 * 
 * Run with: npm run seed
 */

const seedUsers = [
  {
    email: 'admin@creditsea.com',
    password: 'Admin@123',
    role: 'admin',
    fullName: 'Admin User',
  },
  {
    email: 'sales@creditsea.com',
    password: 'Sales@123',
    role: 'sales',
    fullName: 'Sales Executive',
  },
  {
    email: 'sanction@creditsea.com',
    password: 'Sanction@123',
    role: 'sanction',
    fullName: 'Sanction Executive',
  },
  {
    email: 'disbursement@creditsea.com',
    password: 'Disbursement@123',
    role: 'disbursement',
    fullName: 'Disbursement Executive',
  },
  {
    email: 'collection@creditsea.com',
    password: 'Collection@123',
    role: 'collection',
    fullName: 'Collection Executive',
  },
  {
    email: 'borrower@creditsea.com',
    password: 'Borrower@123',
    role: 'borrower',
    fullName: 'John Doe',
  },
];

const seed = async () => {
  try {
    await connectDB();

    console.log('🌱 Starting full database seed...\n');

    for (const userData of seedUsers) {
      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        console.log(`  ⚠️  User already exists: ${userData.email} (${userData.role})`);
        continue;
      }

      await User.create(userData);
      console.log(`  ✅ Created: ${userData.email} | Role: ${userData.role} | Password: ${userData.password}`);
    }

    // Now seed sample loans and payments for rich dashboard testing
    const borrower = await User.findOne({ email: 'borrower@creditsea.com' });
    const sanctionExec = await User.findOne({ email: 'sanction@creditsea.com' });
    const disbursementExec = await User.findOne({ email: 'disbursement@creditsea.com' });
    const collectionExec = await User.findOne({ email: 'collection@creditsea.com' });

    if (borrower) {
      borrower.fullName = 'John Doe';
      borrower.pan = 'ABCDE1234F';
      borrower.dateOfBirth = new Date('1995-06-15');
      borrower.monthlySalary = 75000;
      borrower.employmentMode = 'salaried';
      borrower.breCleared = true;
      borrower.salarySlipUrl = '/uploads/dummy-salary-slip.pdf';
      borrower.salarySlipOriginalName = 'salary_slip_july_2024.pdf';
      borrower.profileComplete = true;
      await borrower.save();

      let borrower2 = await User.findOne({ email: 'rahul@example.com' });
      if (!borrower2) {
        borrower2 = await User.create({
          email: 'rahul@example.com',
          password: 'Test@123',
          role: 'borrower',
          fullName: 'Rahul Sharma',
          pan: 'BXYPS1234K',
          dateOfBirth: new Date('1990-03-20'),
          monthlySalary: 55000,
          employmentMode: 'salaried',
          breCleared: true,
          salarySlipUrl: '/uploads/dummy-salary-slip-2.pdf',
          salarySlipOriginalName: 'salary_aug_2024.pdf',
          profileComplete: true,
        });
      }

      let borrower3 = await User.findOne({ email: 'priya@example.com' });
      if (!borrower3) {
        borrower3 = await User.create({
          email: 'priya@example.com',
          password: 'Test@123',
          role: 'borrower',
          fullName: 'Priya Patel',
        });
      }

      let borrower4 = await User.findOne({ email: 'amit@example.com' });
      if (!borrower4) {
        borrower4 = await User.create({
          email: 'amit@example.com',
          password: 'Test@123',
          role: 'borrower',
          fullName: 'Amit Kumar',
          monthlySalary: 20000,
          employmentMode: 'self-employed',
          breCleared: false,
        });
      }

      await Loan.deleteMany({ borrower: { $in: [borrower._id, borrower2._id] } });
      await Payment.deleteMany({});

      // Loan 1: PENDING
      await Loan.create({
        borrower: borrower._id,
        loanAmount: 200000,
        tenure: 180,
        interestRate: 12,
        simpleInterest: Math.round((200000 * 12 * 180) / (365 * 100) * 100) / 100,
        totalRepayment: Math.round((200000 + (200000 * 12 * 180) / (365 * 100)) * 100) / 100,
        outstandingBalance: Math.round((200000 + (200000 * 12 * 180) / (365 * 100)) * 100) / 100,
        status: 'pending',
      });

      // Loan 2: SANCTIONED
      const si2 = (150000 * 12 * 120) / (365 * 100);
      await Loan.create({
        borrower: borrower._id,
        loanAmount: 150000,
        tenure: 120,
        interestRate: 12,
        simpleInterest: Math.round(si2 * 100) / 100,
        totalRepayment: Math.round((150000 + si2) * 100) / 100,
        outstandingBalance: Math.round((150000 + si2) * 100) / 100,
        status: 'sanctioned',
        sanctionedBy: sanctionExec?._id,
        sanctionedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      });

      // Loan 3: DISBURSED (with payments)
      const si3 = (300000 * 12 * 365) / (365 * 100);
      const totalRepay3 = 300000 + si3;
      const loan3 = await Loan.create({
        borrower: borrower._id,
        loanAmount: 300000,
        tenure: 365,
        interestRate: 12,
        simpleInterest: Math.round(si3 * 100) / 100,
        totalRepayment: Math.round(totalRepay3 * 100) / 100,
        outstandingBalance: Math.round((totalRepay3 - 125000) * 100) / 100,
        totalPaid: 125000,
        status: 'disbursed',
        sanctionedBy: sanctionExec?._id,
        sanctionedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        disbursedBy: disbursementExec?._id,
        disbursedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      });

      await Payment.create([
        {
          loan: loan3._id,
          borrower: borrower._id,
          utrNumber: 'UTR2024080100001',
          amount: 50000,
          paymentDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          recordedBy: collectionExec?._id,
        },
        {
          loan: loan3._id,
          borrower: borrower._id,
          utrNumber: 'UTR2024080100002',
          amount: 75000,
          paymentDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          recordedBy: collectionExec?._id,
        },
      ]);

      // Loan 4: REJECTED
      const si4 = (500000 * 12 * 30) / (365 * 100);
      await Loan.create({
        borrower: borrower._id,
        loanAmount: 500000,
        tenure: 30,
        interestRate: 12,
        simpleInterest: Math.round(si4 * 100) / 100,
        totalRepayment: Math.round((500000 + si4) * 100) / 100,
        outstandingBalance: Math.round((500000 + si4) * 100) / 100,
        status: 'rejected',
        rejectionReason: 'Loan amount too high relative to monthly income. Please apply for a lower amount.',
        sanctionedBy: sanctionExec?._id,
        sanctionedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      });

      // Loan 5: CLOSED
      const si5 = (100000 * 12 * 90) / (365 * 100);
      const totalRepay5 = Math.round((100000 + si5) * 100) / 100;
      const loan5 = await Loan.create({
        borrower: borrower._id,
        loanAmount: 100000,
        tenure: 90,
        interestRate: 12,
        simpleInterest: Math.round(si5 * 100) / 100,
        totalRepayment: totalRepay5,
        outstandingBalance: 0,
        totalPaid: totalRepay5,
        status: 'closed',
        sanctionedBy: sanctionExec?._id,
        sanctionedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
        disbursedBy: disbursementExec?._id,
        disbursedAt: new Date(Date.now() - 98 * 24 * 60 * 60 * 1000),
        closedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      });

      await Payment.create([
        {
          loan: loan5._id,
          borrower: borrower._id,
          utrNumber: 'UTR2024070100001',
          amount: 50000,
          paymentDate: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
          recordedBy: collectionExec?._id,
        },
        {
          loan: loan5._id,
          borrower: borrower._id,
          utrNumber: 'UTR2024070100002',
          amount: totalRepay5 - 50000,
          paymentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          recordedBy: collectionExec?._id,
        },
      ]);

      // Loan 6: Borrower2 PENDING
      const si6 = (250000 * 12 * 200) / (365 * 100);
      await Loan.create({
        borrower: borrower2._id,
        loanAmount: 250000,
        tenure: 200,
        interestRate: 12,
        simpleInterest: Math.round(si6 * 100) / 100,
        totalRepayment: Math.round((250000 + si6) * 100) / 100,
        outstandingBalance: Math.round((250000 + si6) * 100) / 100,
        status: 'pending',
      });

      // Loan 7: Borrower2 DISBURSED
      const si7 = (180000 * 12 * 150) / (365 * 100);
      const totalRepay7 = 180000 + si7;
      const loan7 = await Loan.create({
        borrower: borrower2._id,
        loanAmount: 180000,
        tenure: 150,
        interestRate: 12,
        simpleInterest: Math.round(si7 * 100) / 100,
        totalRepayment: Math.round(totalRepay7 * 100) / 100,
        outstandingBalance: Math.round((totalRepay7 - 60000) * 100) / 100,
        totalPaid: 60000,
        status: 'disbursed',
        sanctionedBy: sanctionExec?._id,
        sanctionedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        disbursedBy: disbursementExec?._id,
        disbursedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      });

      await Payment.create({
        loan: loan7._id,
        borrower: borrower2._id,
        utrNumber: 'UTR2024080200001',
        amount: 60000,
        paymentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        recordedBy: collectionExec?._id,
      });

      console.log('\n  ✅ Sample loans and payments seeded for all lifecycle stages!');
    }

    console.log('\n══════════════════════════════════════════════');
    console.log('  🎉 Database seed completed successfully!');
    console.log('══════════════════════════════════════════════');
    console.log('\n  Login Credentials:');
    console.log('  ─────────────────────────────────────────');
    seedUsers.forEach((u) => {
      console.log(`  ${u.role.padEnd(15)} → ${u.email} / ${u.password}`);
    });
    console.log('  ─────────────────────────────────────────\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seed();
