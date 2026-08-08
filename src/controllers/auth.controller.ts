import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { generateToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

// POST /api/auth/register
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required.', 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('An account with this email already exists.', 409);
    }

    // Create user (always as borrower for public registration)
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      fullName: fullName || undefined,
      role: 'borrower',
    });

    const token = generateToken({ id: user._id.toString(), role: user.role });

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          breCleared: user.breCleared,
          profileComplete: user.profileComplete,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required.', 400);
    }

    // Find user with password field (select: false by default)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    const token = generateToken({ id: user._id.toString(), role: user.role });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          breCleared: user.breCleared,
          profileComplete: user.profileComplete,
          salarySlipUrl: user.salarySlipUrl,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          pan: user.pan,
          dateOfBirth: user.dateOfBirth,
          monthlySalary: user.monthlySalary,
          employmentMode: user.employmentMode,
          breCleared: user.breCleared,
          salarySlipUrl: user.salarySlipUrl,
          salarySlipOriginalName: user.salarySlipOriginalName,
          profileComplete: user.profileComplete,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
