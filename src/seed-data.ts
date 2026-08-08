import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { User } from './models/User';
import { Loan } from './models/Loan';
import { Payment } from './models/Payment';
import { env } from './config/env';

/**
 * Dummy Data Seed — Creates sample loans and payments for testing.
 * 
 * Run AFTER the main seed (npm run seed) to add test data.
 * Usage: npx ts-node src/seed-data.ts
 */

const seedDummyData = async () => {
  try {
    await connectDB();
    console.log('\n🧪 Seeding dummy data...\n');

    // Get the borrower user
    const borrower = await User.findOne({ email: 'borrower@creditsea.com' });
    if (!borrower) {
      console.error('❌ Borrower not found. Run "npm run seed" first.');
      process.exit(1);
    }

    // Get executives
    const sanctionExec = await User.findOne({ email: 'sanction@creditsea.com' });
    const disbursementExec = await User.findOne({ email: 'disbursement@creditsea.com' });
    const collectionExec = await User.findOne({ email: 'collection@creditsea.com' });

    // Update borrower with complete profile
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
    console.log('  ✅ Updated borrower profile (John Doe, BRE cleared)');

    // Create a second borrower for more leads  
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
      console.log('  ✅ Created second borrower: rahul@example.com / Test@123');
    }

    // Create a third borrower (incomplete profile - stays as lead)
    let borrower3 = await User.findOne({ email: 'priya@example.com' });
    if (!borrower3) {
      borrower3 = await User.create({
        email: 'priya@example.com',
        password: 'Test@123',
        role: 'borrower',
        fullName: 'Priya Patel',
      });
      console.log('  ✅ Created lead (no loan): priya@example.com / Test@123');
    }

    // Create a fourth borrower (BRE failed - stays as lead)
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
      console.log('  ✅ Created lead (BRE failed): amit@example.com / Test@123');
    }

    // Clear existing test loans (to make re-run idempotent)
    await Loan.deleteMany({ borrower: { $in: [borrower._id, borrower2._id] } });
    await Payment.deleteMany({});
    console.log('  🗑️  Cleared existing test loans & payments');

    // ─── Loan 1: PENDING (waiting for sanction review) ───
    const loan1 = await Loan.create({
      borrower: borrower._id,
      loanAmount: 200000,
      tenure: 180,
      interestRate: 12,
      simpleInterest: Math.round((200000 * 12 * 180) / (365 * 100) * 100) / 100,
      totalRepayment: Math.round((200000 + (200000 * 12 * 180) / (365 * 100)) * 100) / 100,
      outstandingBalance: Math.round((200000 + (200000 * 12 * 180) / (365 * 100)) * 100) / 100,
      status: 'pending',
    });
    console.log(`  ✅ Loan 1: PENDING — ₹2,00,000 / 180 days (ID: ${loan1._id})`);

    // ─── Loan 2: SANCTIONED (approved, waiting for disbursement) ───
    const si2 = (150000 * 12 * 120) / (365 * 100);
    const loan2 = await Loan.create({
      borrower: borrower._id,
      loanAmount: 150000,
      tenure: 120,
      interestRate: 12,
      simpleInterest: Math.round(si2 * 100) / 100,
      totalRepayment: Math.round((150000 + si2) * 100) / 100,
      outstandingBalance: Math.round((150000 + si2) * 100) / 100,
      status: 'sanctioned',
      sanctionedBy: sanctionExec?._id,
      sanctionedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    });
    console.log(`  ✅ Loan 2: SANCTIONED — ₹1,50,000 / 120 days (ID: ${loan2._id})`);

    // ─── Loan 3: DISBURSED (active, partial payments made) ───
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

    // Add payments for Loan 3
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
    console.log(`  ✅ Loan 3: DISBURSED — ₹3,00,000 / 365 days, ₹1,25,000 paid (ID: ${loan3._id})`);

    // ─── Loan 4: REJECTED (with reason) ───
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
    console.log('  ✅ Loan 4: REJECTED — ₹5,00,000 / 30 days');

    // ─── Loan 5: CLOSED (fully paid) ───
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
    console.log('  ✅ Loan 5: CLOSED — ₹1,00,000 / 90 days (fully paid)');

    // ─── Loan 6: Borrower2's PENDING loan ───
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
    console.log('  ✅ Loan 6: PENDING (Rahul) — ₹2,50,000 / 200 days');

    // ─── Loan 7: Borrower2's DISBURSED loan ───
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
    console.log('  ✅ Loan 7: DISBURSED (Rahul) — ₹1,80,000 / 150 days, ₹60,000 paid');

    console.log('\n══════════════════════════════════════════════');
    console.log('  🎉 Dummy data seeded successfully!');
    console.log('══════════════════════════════════════════════');
    console.log('\n  Summary:');
    console.log('  ─────────────────────────────────────────');
    console.log('  Borrowers with loans: 2 (John Doe, Rahul Sharma)');
    console.log('  Leads (no loans):     2 (Priya Patel, Amit Kumar)');
    console.log('  Pending loans:        2 (for Sanction review)');
    console.log('  Sanctioned loans:     1 (for Disbursement)');
    console.log('  Disbursed loans:      2 (for Collection payments)');
    console.log('  Rejected loans:       1');
    console.log('  Closed loans:         1 (fully paid)');
    console.log('  Total payments:       5');
    console.log('  ─────────────────────────────────────────\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Dummy data seed failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedDummyData();
