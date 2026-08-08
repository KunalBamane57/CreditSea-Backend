import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db';
import { User } from './models/User';
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

    console.log('🌱 Starting seed...\n');

    for (const userData of seedUsers) {
      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        console.log(`  ⚠️  User already exists: ${userData.email} (${userData.role})`);
        continue;
      }

      await User.create(userData);
      console.log(`  ✅ Created: ${userData.email} | Role: ${userData.role} | Password: ${userData.password}`);
    }

    console.log('\n══════════════════════════════════════════════');
    console.log('  🎉 Seed completed successfully!');
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
