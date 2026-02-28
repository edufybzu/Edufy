# Dufy Asset Manager

A comprehensive kit management system for NGOs to deliver education materials to underserved regions.

## Features

- **Admin Dashboard**: Manage products, categories, kits, and orders
- **NGO Portal**: Browse kits, request custom kits, and place orders with payment
- **Kit Management**: Create kits with multiple products and set prices
- **Order System**: Track orders with status updates

## Prerequisites

Before running this project, make sure you have:

1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

## How to Run

### Step 1: Open Terminal/Command Prompt

Navigate to the project folder:
```bash
cd path/to/Asset-Manager
```

### Step 2: Install Dependencies

Run this command to install all required packages:
```bash
npm install
```

### Step 3: Setup Database

Push the database schema:
```bash
npx drizzle-kit push
```

### Step 4: Start the Server

**On Windows (PowerShell):**
```powershell
$env:NODE_ENV="development"; npx tsx server/index.ts
```

**On Windows (Command Prompt):**
```cmd
set NODE_ENV=development && npx tsx server/index.ts
```

**On Mac/Linux:**
```bash
NODE_ENV=development npx tsx server/index.ts
```

### Step 5: Open in Browser

Once you see `serving on port 5000` in the terminal, open your browser and go to:

**http://localhost:5000**

## Login Instructions

This is a development version with mock authentication:

### Login as Admin
- **Email**: any email (e.g., `admin@test.com`)
- **Password**: any password
- **Role**: Select "Admin"

### Login as NGO
- **Email**: any email (e.g., `ngo@test.com`)
- **Password**: any password
- **Role**: Select "NGO"

## Project Structure

```
Asset-Manager/
├── client/           # Frontend React app
│   ├── src/
│   │   ├── pages/    # Page components
│   │   ├── components/
│   │   └── hooks/
├── server/           # Backend Express server
├── shared/           # Shared types and schema
├── dev.db           # SQLite database (created after setup)
└── package.json
```

## Troubleshooting

### Port already in use
If you get an error that port 5000 is in use:

**Windows:**
```powershell
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
```

**Mac/Linux:**
```bash
pkill node
```

Then try starting the server again.

### Database errors
If you encounter database issues, delete the database and recreate:
```bash
rm dev.db
npx drizzle-kit push
```

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Database**: SQLite with Drizzle ORM
- **Build Tool**: Vite

## Support

If you have any questions, contact the developer.
