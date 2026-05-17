# YallaFix

**Smart Campus Facility Management System**

-----

## Overview

YallaFix is a mobile application built for the German International University (GIU) to streamline campus facility issue reporting and resolution. The system connects three types of users: Community Members (reporters), Facility Managers, and Workers.

-----

## Technology Stack

|Layer          |Technology                             |
|---------------|---------------------------------------|
|Frontend       |React Native (Expo SDK 54)             |
|Backend        |Node.js with Express.js                |
|Database       |PostgreSQL (Supabase)                  |
|Authentication |JWT (JSON Web Tokens) + Bcrypt         |
|Storage        |Supabase Storage (Cloud Object Storage)|
|Version Control|Git & GitHub                           |

-----

## Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- Expo CLI: `npm install -g expo-cli`
- Expo Go app (download from iOS App Store or Google Play)
- Supabase account (free tier available)
- Git installed on your machine

-----

## Project Structure

```
YallaFix/
├── app/                    # Expo Router screens
│   ├── (tabs)/             # Tab navigator
│   ├── auth/               # Login, Register, Forgot Password
│   ├── community/          # Community member screens
│   ├── manager/            # Facility manager screens
│   ├── worker/             # Worker screens
│   └── _layout.tsx         # Root layout + auth routing
└── backend/                # Node.js + Express server
    ├── src/
    │   ├── routes/          # API route handlers
    │   ├── middleware/      # Auth, role validation
    │   ├── db.js            # Database connection
    │   └── index.js         # Express entry point
    └── .env                 # Environment variables
```

-----

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/nadeenkhalifa/YallaFix
cd YallaFix
```

### 2. Set Up the Backend

```bash
cd backend
npm install
```

Create a `.env` file with the following variables:

```env
DATABASE_URL=postgresql://postgres.ruzakhretrdgdoybruws:Genan%40258200@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
JWT_SECRET=yallafix_secret_key_2026
NODE_ENV=development
PORT=3000
```

### 3. Set Up the Frontend

```bash
# From project root (YallaFix/)
cd ..
npm install
npx expo install @react-native-async-storage/async-storage
```

Update the API base URL in `services/api.ts`:

```ts
const BASE_URL = 'http://YOUR_PC_IP:3000/api';
```

> **Note:** Replace `YOUR_PC_IP` with your machine’s local IP address.
> 
> - **Windows:** run `ipconfig`
> - **Mac/Linux:** run `ifconfig`
> - Ensure your phone and PC are on the same WiFi network.

```bash
npx expo start
```

Scan the QR code with the Expo Go app:

- **iOS:** Open Camera → tap the notification
- **Android:** Open Expo Go app → Scan QR

-----

## Database Setup

Run the following SQL in the Supabase SQL Editor:

```sql
-- Create tables (see DATABASE_SCHEMA documentation for full schema)
-- Or execute the provided database migration scripts
```

-----

## User Roles & Permissions

|Role            |Permissions                                                 |
|----------------|------------------------------------------------------------|
|Community Member|Submit issues, view own issues, confirm issues, comment     |
|Facility Manager|View all issues, assign workers, change status, post updates|
|Worker          |View assigned issues, update progress, upload proof         |

-----

## Running the Application

### Start Backend

```bash
cd backend && node src/index.js
```

Expected output: `Server listening on http://localhost:3000`

### Start Frontend

```bash
cd .. && npx expo start
```

Scan the QR code with Expo Go on your phone.

### Test the App

1. Create an account with role `reporter`
1. Submit a complaint with photo, location, and category
1. Log in as `manager` role to view and assign issues
1. Log in as `worker` to view assigned tasks

-----

## Troubleshooting

### ‘Cannot reach server’ or ‘404 errors’

- Verify the backend is running on port 3000
- Check the API base URL in `services/api.ts`
- Ensure phone and PC are on the same WiFi network

### Database connection fails

- Verify `DATABASE_URL` in `backend/.env`
- Check that the `@` symbol is URL-encoded as `%40`
- Test connection with: `node -e "const pool = require('pg').Pool; ..."`

### Permission errors (403)

- Verify the user role matches API requirements (e.g., `manager` for assign-worker)
- Check that the JWT token is valid and included in the `Authorization` header

-----

## Team

Built for **INCS 617 - Software Engineering for Business Informatics**  
**German International University (GIU) — Summer Semester 2026**

|Name                 |ID      |Role     |
|---------------------|--------|---------|
|Nadeen El Khalifa    |13004534|Developer|
|Mariam Ashraf        |13006964|Developer|
|Malak Gharib         |13007525|Developer|
|Nour Samir           |13006170|Developer|
|Ganna Hamza          |13003623|Developer|
|Abdelrahman El Khatib|13002667|Developer|