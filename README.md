# Teddy Car Rental Fleet Management System

A full-stack car rental management system built with **React**, **Express**, **PostgreSQL**, and **Prisma**.

## 🚀 Quick Setup

### 1. Prerequisites
Ensure you have **Node.js** and **PostgreSQL** installed and running on your system.

### 2. Backend Setup
Navigate to the `backend` directory, install dependencies, and set up your environment variables:

```bash
cd backend
npm install
```

#### 🔑 Environment Variables (.env)
Create a file named `.env` in the `backend` directory and add the following content:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/teddy_rental?schema=public"
JWT_SECRET="your_secure_random_secret_key"
PORT=5000
FRONTEND_URL="http://localhost:5173"
```
*Replace `USER` and `PASSWORD` with your PostgreSQL credentials.*

#### 🛠️ Automated Database Setup
Once `.env` is configured, run the setup script to initialize everything (migrations + seeding):

```bash
node setup.js
```

#### 🌱 Seeding Data Directly
If you have already run the migrations and just want to populate/refresh the sample data (Admins, Employees, Cars, and Packages), you can run the seed script directly:

```bash
node prisma/seed.js
```

### 3. Frontend Setup
Navigate to the `frontend` directory and install dependencies:

```bash
cd frontend
npm install
```

---

## 🏃 Running the Project

To see the project in action, start both the backend and frontend servers in separate terminals:

### Terminal 1: Backend
```bash
cd backend
npm run dev
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

The application will be available at: **[http://localhost:5173](http://localhost:5173)**

---

## 🔑 Default Login Credentials
You can use these pre-seeded accounts to explore the different user roles:

| Role     | Email                     | Password       |
|----------|---------------------------|----------------|
| **Admin**    | `admin@teddyrental.com`    | `Password123!` |
| **Employee** | `employee@teddyrental.com` | `Password123!` |
| **Customer** | `customer@test.com`       | `customer123`  |

---

## 🛠️ Technology Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Leaflet Maps, Sonner Toasts.
- **Backend**: Node.js, Express, Prisma ORM, JWT Authentication, Multer for uploads.
- **Database**: PostgreSQL.
- **Internationalization**: React-i18next (English & Amharic Support).
