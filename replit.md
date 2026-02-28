# Mobile School Kits - Travelling Education Platform

## Overview

This is a full-stack web application for managing mobile school kits - a travelling education initiative that delivers educational materials to underserved regions. The platform connects a central warehouse with NGO partners, enabling inventory management, kit assembly, order processing, and school request tracking.

**Core Features:**
- Warehouse inventory management for educational products and pre-assembled kits
- NGO catalog browsing with shopping cart functionality
- Order workflow with status tracking (draft → submitted → approved → delivered)
- School/kit request submission system for NGOs
- Role-based access (Admin warehouse managers and NGO users)
- Regional categorization for targeted kit distribution

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, React Context for cart state
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **Animations**: Framer Motion for page transitions and micro-interactions

The frontend follows a feature-based organization with separate page directories for admin and NGO user flows. Shared components live in `client/src/components/` with UI primitives in `client/src/components/ui/`.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints under `/api/` prefix
- **Authentication**: Replit Auth integration using OpenID Connect with Passport.js
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple

The server uses a layered architecture:
- `server/routes.ts` - API endpoint definitions with role-based middleware
- `server/storage.ts` - Data access layer abstracting database operations
- `server/db.ts` - Database connection pool configuration

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` - shared between client and server for type safety
- **Migrations**: Drizzle Kit with `db:push` for schema synchronization

**Key Entities:**
- `userProfiles` - Extends auth users with role (ADMIN/NGO) and organization info
- `categories` - Regional groupings for products and kits
- `products` - Individual inventory items with stock tracking and low-stock thresholds
- `kits` - Pre-assembled bundles with `kitItems` junction table for contents
- `orders` and `orderItems` - Order management with status workflow
- `schoolRequests` - NGO requests for new schools/kits

### Authentication Pattern
The application uses Replit's OIDC authentication flow:
1. Users authenticate via Replit's identity provider
2. Session stored in PostgreSQL `sessions` table
3. User profiles auto-created on first login with default NGO role
4. Role-based middleware protects admin endpoints

**Admin Bootstrap:**
- Users with emails containing "admin" or in the ADMIN_EMAILS env var automatically get ADMIN role
- For production, replace the "email contains admin" check with an explicit allowlist

### Stock Validation
- The system validates product and kit stock availability before order creation
- Kit stock is calculated based on the minimum available quantity of all component products
- Orders are rejected if insufficient stock is available
- Stock is automatically restored when orders are rejected or cancelled

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with PostgreSQL dialect

### Authentication
- **Replit Auth**: OpenID Connect provider for user authentication
- **express-session**: Session middleware with PostgreSQL store
- **Passport.js**: Authentication middleware with OpenID Connect strategy

### UI Framework
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, forms, etc.)
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Animation library

### Build Tools
- **Vite**: Frontend development server and bundler
- **esbuild**: Server-side bundling for production
- **TypeScript**: Type checking across the full stack

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for session encryption
- `ISSUER_URL` - Replit OIDC issuer (defaults to https://replit.com/oidc)
- `REPL_ID` - Replit environment identifier