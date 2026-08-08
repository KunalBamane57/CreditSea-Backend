# CreditSea — Loan Management System

A full-stack lending platform built with the **MERN stack** + **Next.js** + **TypeScript**.

Borrowers apply for loans through a multi-step process. Operations teams manage loan lifecycles through role-based dashboard modules.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router) + TypeScript + Tailwind CSS |
| **Backend** | Node.js + Express.js + TypeScript |
| **Database** | MongoDB + Mongoose |
| **Auth** | JWT + bcrypt |

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** (local or [Atlas](https://www.mongodb.com/atlas))

### 1. Clone the repositories

```bash
# Clone Backend
git clone https://github.com/KunalBamane57/CreditSea-Backend.git

# Clone Frontend
git clone https://github.com/KunalBamane57/CreditSea-Frontend.git
```

### 2. Setup Backend

```bash
cd CreditSea-Backend
cp .env.example .env      # Edit MONGODB_URI if needed
npm install
npm run seed              # Creates accounts for all 6 roles & populates initial demo data
npm run dev               # Starts API server on http://localhost:5000
```

### 3. Setup Frontend

```bash
cd CreditSea-Frontend
cp .env.example .env.local
npm install
npm run dev               # Starts Next.js app on http://localhost:3000
```

### 4. Open the app

Visit **http://localhost:3000** and login with any credentials below.

---

## Environment Variables

### Server (`server/.env`)

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/creditsea-lms
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
UPLOAD_DIR=uploads
CLIENT_URL=http://localhost:3000
```

### Client (`client/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## Login Credentials

The seed script (`npm run seed`) creates these accounts:

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@creditsea.com | Admin@123 |
| **Sales** | sales@creditsea.com | Sales@123 |
| **Sanction** | sanction@creditsea.com | Sanction@123 |
| **Disbursement** | disbursement@creditsea.com | Disbursement@123 |
| **Collection** | collection@creditsea.com | Collection@123 |
| **Borrower** | borrower@creditsea.com | Borrower@123 |

---

## Architecture

```
creditsea/
├── server/                     # Express.js Backend
│   └── src/
│       ├── config/             # DB connection, env config
│       ├── controllers/        # Route handlers
│       ├── middleware/         # Auth, RBAC, upload, error handling
│       ├── models/            # Mongoose schemas (User, Loan, Payment)
│       ├── routes/            # Express route definitions
│       ├── services/          # BRE (Business Rule Engine)
│       ├── utils/             # JWT helpers, AppError
│       ├── seed.ts            # Database seeder
│       ├── app.ts             # Express app setup
│       └── server.ts          # Entry point
├── client/                     # Next.js Frontend
│   └── src/
│       ├── app/               # App Router pages
│       │   ├── login/
│       │   ├── register/
│       │   ├── personal-details/
│       │   ├── upload-salary-slip/
│       │   ├── apply/
│       │   ├── my-loans/
│       │   └── dashboard/
│       │       ├── sales/
│       │       ├── sanction/
│       │       ├── disbursement/
│       │       └── collection/
│       ├── contexts/          # React contexts (Auth)
│       ├── lib/               # API client, utilities
│       └── types/             # TypeScript interfaces
└── README.md
```

---

## Features

### Borrower Portal
1. **Sign Up / Login** — JWT-based authentication with hashed passwords
2. **Personal Details + BRE** — Server-side Business Rule Engine validates age (23-50), salary (≥₹25K), PAN format, and employment status
3. **Salary Slip Upload** — Drag-and-drop upload (PDF/JPG/PNG, max 5MB)
4. **Loan Configuration** — Interactive sliders for amount (₹50K–₹5L) and tenure (30–365 days) with live Simple Interest calculation
5. **My Loans** — Track all applications with status, payment progress, and history

### Operations Dashboard
1. **Sales** — Lead tracking (registered users without loans)
2. **Sanction** — Review and approve/reject pending loans (with rejection reason)
3. **Disbursement** — Release funds for sanctioned loans
4. **Collection** — Record payments with unique UTR numbers. Auto-closes loans when fully paid

### Security
- **JWT Authentication** on all protected routes
- **RBAC Middleware** — API returns 403 for unauthorized roles
- **bcrypt** password hashing with salt rounds
- **Helmet** security headers
- **CORS** configured for frontend origin

### Loan Status Flow
```
PENDING → SANCTIONED → DISBURSED → CLOSED
    └──→ REJECTED
```

---

## API Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/auth/register` | Register borrower | Public |
| POST | `/api/auth/login` | Login | Public |
| GET | `/api/auth/me` | Get profile | Auth |
| PUT | `/api/users/personal-details` | Submit details + BRE | Borrower |
| POST | `/api/users/upload-salary-slip` | Upload salary slip | Borrower |
| POST | `/api/loans/apply` | Apply for loan | Borrower |
| GET | `/api/loans/my-loans` | Get own loans | Borrower |
| GET | `/api/loans` | Get all loans | Executive/Admin |
| GET | `/api/loans/:id` | Get loan details | Auth |
| PUT | `/api/loans/:id/sanction` | Approve loan | Sanction/Admin |
| PUT | `/api/loans/:id/reject` | Reject loan | Sanction/Admin |
| PUT | `/api/loans/:id/disburse` | Disburse loan | Disbursement/Admin |
| GET | `/api/dashboard/sales` | Get leads | Sales/Admin |
| GET | `/api/dashboard/stats` | Get stats | Admin |
| POST | `/api/payments/:loanId` | Record payment | Collection/Admin |
| GET | `/api/payments/:loanId` | Get payments | Collection/Admin/Borrower |
