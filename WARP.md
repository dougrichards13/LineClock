# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

LineClock is a professional time tracking and project management system for consulting firms. It's a full-stack application with:
- **Backend**: Express + Prisma + SQLite (server/)
- **Frontend**: React + TypeScript + Vite + Tailwind CSS (client/)
- **Authentication**: Dual-mode - simple employee login + Microsoft Entra ID for admins

## Development Commands

### Backend (server/)
```powershell
cd C:\Users\dougx\time-entry-system\server
npm run dev              # Start dev server (port 3001)
npm run build            # Compile TypeScript
npm start                # Run compiled server
npm run prisma:generate  # Generate Prisma client after schema changes
npm run prisma:migrate   # Create/apply database migrations
npm run prisma:studio    # Open Prisma Studio (database GUI)
```

### Frontend (client/)
```powershell
cd C:\Users\dougx\time-entry-system\client
npm run dev     # Start dev server (port 5173)
npm run build   # Build for production
npm run lint    # Run ESLint
npm run preview # Preview production build
```

### Typical Development Workflow
1. Start backend: `cd server && npm run dev`
2. Start frontend in new terminal: `cd client && npm run dev`
3. Open http://localhost:5173

## Architecture

### Data Flow & Authentication
- **Employee Flow**: Simple login (name + email) → JWT token → Employee dashboard
- **Admin Flow**: Test admin button OR Entra ID OAuth flow → JWT token → Admin dashboard
- JWT tokens stored in localStorage, automatically attached to API requests via axios interceptor
- Role-based routing in App.tsx uses `isAdmin` from AuthContext to determine dashboard type

### Backend Structure
- `server/src/index.ts` - Main Express app with CORS, routes, error handling
- `server/src/routes/` - API route handlers:
  - `auth.ts` - Employee/admin login, Entra ID OAuth flow
  - `timeEntries.ts` - CRUD for time entries, review endpoints
  - `vacations.ts` - CRUD for vacation requests, review endpoints
  - `questions.ts` - Q&A between employees and admins
  - `dashboard.ts` - Admin statistics
- `server/src/middleware/auth.ts` - JWT verification, `authMiddleware` for protected routes, `adminOnly` for admin-only routes
- `server/src/utils/` - Prisma client, JWT utilities

### Frontend Structure
- `client/src/App.tsx` - Routing with role-based dashboard selection
- `client/src/utils/AuthContext.tsx` - Authentication state management (token, user, isAdmin)
- `client/src/pages/` - Main UI pages:
  - `Login.tsx` - Login page with employee/admin options
  - `EmployeeDashboard.tsx` - Time entries, vacations, questions for employees
  - `AdminDashboard.tsx` - Review/approve pending items, view statistics
  - `AuthCallback.tsx` - Handles Entra ID OAuth redirect
- `client/src/services/api.ts` - Centralized axios instance with API methods for all endpoints

### Database Schema (Prisma)
- **User** - email, name, role (EMPLOYEE/ADMIN), optional entraId for OAuth users
- **TimeEntry** - date, hoursWorked, description, status (DRAFT/SUBMITTED/APPROVED/REJECTED), links to user and reviewer
- **VacationRequest** - startDate, endDate, reason, status (PENDING/APPROVED/REJECTED), links to user and reviewer
- **Question** - question text, optional answer, status (OPEN/ANSWERED), links to user and answerer

### Key Patterns
- All API responses follow `{ success: boolean, data?: any, error?: string }` structure
- Status fields use uppercase strings (e.g., 'SUBMITTED', 'APPROVED') for consistency
- Admin endpoints prefixed with `/admin/` in routes
- Middleware chain: `authMiddleware` → `adminOnly` for admin endpoints
- Frontend uses React Context for auth state instead of Redux

## Environment Configuration

### Backend (.env)
Required variables (see `server/.env.example`):
- `PORT` - Backend port (default: 3001)
- `DATABASE_URL` - SQLite: `file:./dev.db` or PostgreSQL connection string for production
- `JWT_SECRET` - Secret key for JWT signing
- `CORS_ORIGIN` - Frontend URL (default: http://localhost:5173)

Optional (for Entra ID admin login):
- `ENTRA_CLIENT_ID` - Azure app registration client ID
- `ENTRA_TENANT_ID` - Azure tenant ID
- `ENTRA_CLIENT_SECRET` - Azure app secret
- `ENTRA_REDIRECT_URI` - OAuth callback URL (default: http://localhost:3000/auth/callback)

### Frontend
- `VITE_API_URL` - Backend URL (default: http://localhost:3001)

## Database Changes

When modifying Prisma schema:
1. Edit `server/prisma/schema.prisma`
2. Run `npm run prisma:migrate` to create migration
3. Run `npm run prisma:generate` to update TypeScript types
4. Restart backend server

## Troubleshooting

### Port conflicts
```powershell
# Kill process on port 3001
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process

# Kill process on port 5173
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process
```

### Database issues
```powershell
cd server
npm run prisma:migrate
npm run prisma:generate
```

### Login/auth issues
- Clear browser localStorage (F12 → Application → Local Storage → Clear)
- Verify backend is running and `CORS_ORIGIN` matches frontend URL
- Check browser console and backend terminal for errors

### Entra ID setup
- See `ENTRA_ID_SETUP.md` for complete Azure configuration guide
- Test admin login works without Entra ID setup
- Backend will log "⚠ Entra ID not configured" if credentials are missing

## Testing

No formal test framework is currently configured. Test files in `server/` directory (test-*.js) are ad-hoc database connection tests, not part of a test suite.

To test the application:
1. Use "Test Admin" button for instant admin access
2. Create employee account with any name/email
3. Follow complete workflow in QUICKSTART.md

## Production Deployment Considerations

1. Switch to PostgreSQL or SQL Server (update `DATABASE_URL`)
2. Configure production Entra ID redirect URI in Azure Portal
3. Update environment variables for production URLs
4. Enable HTTPS
5. Never commit `.env` files
6. Use Azure Key Vault or similar for secret management
