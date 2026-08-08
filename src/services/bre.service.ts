/**
 * Business Rule Engine (BRE) for Loan Eligibility
 * 
 * Runs on the SERVER (authoritative). Client-side pre-validation
 * exists only for UX — the server is the source of truth.
 * 
 * Rules:
 * 1. Age must be between 23 and 50 (inclusive)
 * 2. Monthly salary must be ≥ ₹25,000
 * 3. PAN must match valid format: ABCDE1234F
 * 4. Applicant must NOT be unemployed
 */

export interface BREResult {
  passed: boolean;
  errors: BREError[];
}

export interface BREError {
  rule: string;
  message: string;
}

// Valid PAN format: 5 uppercase letters + 4 digits + 1 uppercase letter
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const calculateAge = (dateOfBirth: Date): number => {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const runBRE = (data: {
  fullName: string;
  pan: string;
  dateOfBirth: Date | string;
  monthlySalary: number;
  employmentMode: string;
}): BREResult => {
  const errors: BREError[] = [];

  // Rule 1: Age check (23–50 inclusive)
  const dob = new Date(data.dateOfBirth);
  const age = calculateAge(dob);
  if (age < 23 || age > 50) {
    errors.push({
      rule: 'Age',
      message: `Age must be between 23 and 50 years. Your age: ${age} years.`,
    });
  }

  // Rule 2: Salary check (≥ ₹25,000)
  if (data.monthlySalary < 25000) {
    errors.push({
      rule: 'Salary',
      message: `Monthly salary must be at least ₹25,000. Your salary: ₹${data.monthlySalary.toLocaleString('en-IN')}.`,
    });
  }

  // Rule 3: PAN validation
  const panUpper = data.pan.toUpperCase().trim();
  if (!PAN_REGEX.test(panUpper)) {
    errors.push({
      rule: 'PAN',
      message: `Invalid PAN format. Expected format: ABCDE1234F (5 letters + 4 digits + 1 letter). Provided: ${data.pan}.`,
    });
  }

  // Rule 4: Employment check (not unemployed)
  if (data.employmentMode === 'unemployed') {
    errors.push({
      rule: 'Employment',
      message: 'Applicants who are currently unemployed are not eligible for a loan.',
    });
  }

  return {
    passed: errors.length === 0,
    errors,
  };
};
