import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { runBRE } from '../services/bre.service';
import { AppError } from '../utils/AppError';

// PUT /api/users/personal-details
export const updatePersonalDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fullName, pan, dateOfBirth, monthlySalary, employmentMode } = req.body;

    // Validate required fields
    if (!fullName || !pan || !dateOfBirth || monthlySalary === undefined || !employmentMode) {
      throw new AppError(
        'All fields are required: fullName, pan, dateOfBirth, monthlySalary, employmentMode.',
        400
      );
    }

    // Validate employment mode
    const validModes = ['salaried', 'self-employed', 'unemployed'];
    if (!validModes.includes(employmentMode)) {
      throw new AppError(
        `Invalid employment mode. Must be one of: ${validModes.join(', ')}.`,
        400
      );
    }

    // Run BRE (Business Rule Engine) — server-side authoritative check
    const breResult = runBRE({
      fullName,
      pan,
      dateOfBirth,
      monthlySalary: Number(monthlySalary),
      employmentMode,
    });

    if (!breResult.passed) {
      // BRE failed — return 422 with error details
      // Still save the personal details so user can see them, but don't mark BRE as cleared
      await User.findByIdAndUpdate(req.user!._id, {
        fullName,
        pan: pan.toUpperCase().trim(),
        dateOfBirth: new Date(dateOfBirth),
        monthlySalary: Number(monthlySalary),
        employmentMode,
        breCleared: false,
      });

      res.status(422).json({
        success: false,
        message: 'Eligibility check failed. You do not meet the minimum requirements.',
        errors: breResult.errors,
      });
      return;
    }

    // BRE passed — update user with personal details
    const user = await User.findByIdAndUpdate(
      req.user!._id,
      {
        fullName,
        pan: pan.toUpperCase().trim(),
        dateOfBirth: new Date(dateOfBirth),
        monthlySalary: Number(monthlySalary),
        employmentMode,
        breCleared: true,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Personal details updated. Eligibility check passed!',
      data: {
        user: {
          id: user!._id,
          email: user!.email,
          fullName: user!.fullName,
          pan: user!.pan,
          dateOfBirth: user!.dateOfBirth,
          monthlySalary: user!.monthlySalary,
          employmentMode: user!.employmentMode,
          breCleared: user!.breCleared,
          profileComplete: user!.profileComplete,
        },
        breResult,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/users/upload-salary-slip
export const uploadSalarySlip = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      throw new AppError('Please upload a salary slip file (PDF, JPG, or PNG, max 5MB).', 400);
    }

    // Check BRE status
    const currentUser = await User.findById(req.user!._id);
    if (!currentUser?.breCleared) {
      throw new AppError(
        'You must complete the eligibility check (personal details) before uploading a salary slip.',
        400
      );
    }

    // Update user with salary slip info
    const user = await User.findByIdAndUpdate(
      req.user!._id,
      {
        salarySlipUrl: `/uploads/${req.file.filename}`,
        salarySlipOriginalName: req.file.originalname,
        profileComplete: true,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Salary slip uploaded successfully.',
      data: {
        user: {
          id: user!._id,
          salarySlipUrl: user!.salarySlipUrl,
          salarySlipOriginalName: user!.salarySlipOriginalName,
          profileComplete: user!.profileComplete,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
