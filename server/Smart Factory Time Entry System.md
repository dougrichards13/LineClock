# Problem Statement
Create a web application for Smart Factory employees to:
* Enter time/hours worked
* Request vacations
* Ask questions to administrators
Two administrators will authenticate using Entra ID (Azure AD).
# Technology Stack
## Frontend
* React with TypeScript for type safety
* Vite as build tool for fast development
* Tailwind CSS for styling
* React Router for navigation
## Backend
* Node.js with Express
* TypeScript for consistency
* Prisma ORM for database interactions
* SQLite for local development (easily upgradeable to PostgreSQL/SQL Server)
## Authentication
* Microsoft Authentication Library (MSAL) for Entra ID integration
* JWT tokens for session management
* Role-based access control (employee vs admin)
# Architecture
## Database Schema
**Users**
* id, email, name, role (employee/admin), entraId (optional, for admins)
**TimeEntries**
* id, userId, date, hoursWorked, description, status (draft/submitted/approved)
**VacationRequests**
* id, userId, startDate, endDate, reason, status (pending/approved/rejected), reviewedBy, reviewedAt
**Questions**
* id, userId, question, askedAt, answer, answeredBy, answeredAt, status (open/answered)
# Proposed Changes
## Project Structure
Create monorepo with:
* `/client` - React frontend
* `/server` - Express backend
* `/shared` - Shared TypeScript types
## Core Features
### Employee Portal
1. Time entry form with date picker, hours input, description
2. Time entry history with edit/delete for drafts
3. Vacation request form with date range and reason
4. Vacation request status view
5. Question submission form
6. View answers to submitted questions
### Admin Portal
1. Entra ID login flow
2. Dashboard showing pending approvals
3. Time entry review and approval
4. Vacation request approval/rejection
5. Answer employee questions
6. Reports: time summaries, vacation calendar
## Security Considerations
* Employees can only view/edit their own data
* Admins authenticated via Entra ID
* API endpoints protected with JWT middleware
* Input validation on both client and server
* CORS configuration for production
## Development Phases
1. Setup project structure and initialize both frontend/backend
2. Configure Prisma with database schema
3. Implement basic Express server with API routes
4. Setup Entra ID authentication for admins
5. Build employee time entry UI and API
6. Build vacation request UI and API
7. Build Q&A system UI and API
8. Build admin portal with approval workflows
9. Add validation, error handling, and polish
