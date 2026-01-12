# Smart Factory Time Entry System

A full-stack web application for Smart Factory employees to manage time entries, vacation requests, and communicate with administrators.

## Features

### Employee Portal
- **Time Entry Management**: Create, edit, and submit time entries for approval
- **Vacation Requests**: Submit vacation requests with date ranges and reasons
- **Q&A System**: Ask questions and receive answers from administrators
- **Status Tracking**: View approval status for all submissions

### Admin Portal
- **Dashboard**: Overview of pending approvals and system statistics
- **Time Entry Review**: Approve or reject employee time entries
- **Vacation Management**: Review and approve vacation requests
- **Question Answering**: Respond to employee questions
- **Entra ID Authentication**: Secure admin access via Microsoft Entra ID

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite (build tool)
- Tailwind CSS
- React Router v6
- Axios (HTTP client)
- MSAL for Entra ID authentication

### Backend
- Node.js with Express
- TypeScript
- Prisma ORM
- SQLite (development) / PostgreSQL or SQL Server (production)
- JWT for session management
- MSAL Node for Entra ID integration

## Project Structure

```
time-entry-system/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (Login, Dashboards)
│   │   ├── services/      # API client services
│   │   ├── utils/         # Auth context and utilities
│   │   └── App.tsx        # Root component with routing
│   ├── .env               # Environment variables
│   └── package.json
├── server/                # Express backend
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── middleware/    # Auth middleware
│   │   ├── utils/         # Prisma client, JWT utils
│   │   └── index.ts       # Server entry point
│   ├── prisma/            # Database schema and migrations
│   ├── .env               # Environment variables
│   └── package.json
├── shared/                # Shared TypeScript types
│   └── types.ts
└── README.md
```

## Prerequisites

- Node.js 18+ LTS
- npm or yarn
- Microsoft Azure account (for Entra ID admin authentication)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd time-entry-system

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Entra ID (Azure AD)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations** > **New registration**
3. Configure the app:
   - Name: "Smart Factory Time Entry System"
   - Supported account types: Single tenant
   - Redirect URI: Web - `http://localhost:3000/auth/callback`
4. After registration, note the **Application (client) ID** and **Directory (tenant) ID**
5. Create a client secret:
   - Go to **Certificates & secrets** > **New client secret**
   - Note the secret value (you won't be able to see it again)
6. Configure API permissions:
   - Go to **API permissions** > **Add a permission**
   - Select **Microsoft Graph** > **Delegated permissions**
   - Add `User.Read` permission
   - Grant admin consent

### 3. Configure Environment Variables

#### Server (.env)

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-secure-random-secret-key-here
ENTRA_CLIENT_ID=your-application-client-id
ENTRA_TENANT_ID=your-directory-tenant-id
ENTRA_CLIENT_SECRET=your-client-secret
ENTRA_REDIRECT_URI=http://localhost:3000/auth/callback
CORS_ORIGIN=http://localhost:3000
```

**Important**: Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Client (.env)

```bash
cd ../client
cp .env.example .env
```

Edit `client/.env`:

```env
VITE_API_URL=http://localhost:3001
```

### 4. Initialize Database

```bash
cd server
npm run prisma:generate
npm run prisma:migrate
```

This will:
- Generate Prisma Client
- Create the SQLite database
- Run migrations to create all tables

### 5. Run the Application

#### Start the Backend Server

```bash
cd server
npm run dev
```

Server will start at `http://localhost:3001`

#### Start the Frontend (in a new terminal)

```bash
cd client
npm run dev
```

Frontend will start at `http://localhost:5173`

## Usage

### Quick Start (No Azure Required)

The application includes a **Test Admin Login** that works immediately without Azure configuration!

**See QUICKSTART.md for detailed testing instructions.**

### Employee Login

1. Navigate to `http://localhost:5173`
2. Enter your name and email address
3. Click **Login as Employee**
4. You'll be redirected to the employee dashboard

### Test Administrator Login

1. Navigate to `http://localhost:5173`
2. Click **Login as Test Admin**
3. You'll be instantly logged in as an admin
4. Full admin features available without Azure setup

### Entra ID Administrator Login (Optional)

**Requires Azure AD setup** - See ENTRA_ID_SETUP.md for instructions.

1. Navigate to `http://localhost:5173`
2. Click **Login as Administrator (Entra ID)**
3. Sign in with your Microsoft work account configured in Azure AD
4. After authentication, you'll be redirected to the admin dashboard

### Employee Features

- **Time Entries Tab**: Add new time entries (date, hours, description), submit drafts for review
- **Vacation Requests Tab**: Request time off with start/end dates and reason
- **Questions Tab**: Ask questions to administrators and view answers

### Admin Features

- **Overview Tab**: See statistics (pending approvals, open questions, employee count)
- **Time Entries Tab**: Review and approve/reject submitted time entries
- **Vacations Tab**: Approve or reject vacation requests
- **Questions Tab**: Answer employee questions

## API Endpoints

### Authentication
- `POST /api/auth/login/employee` - Employee login
- `GET /api/auth/login/admin` - Get Entra ID auth URL
- `POST /api/auth/callback` - Handle Entra ID callback

### Time Entries
- `GET /api/time-entries` - Get user's time entries
- `POST /api/time-entries` - Create new entry
- `PUT /api/time-entries/:id` - Update entry
- `DELETE /api/time-entries/:id` - Delete draft entry
- `GET /api/time-entries/admin/pending` - Get pending entries (admin)
- `PATCH /api/time-entries/:id/review` - Approve/reject (admin)

### Vacation Requests
- `GET /api/vacations` - Get user's requests
- `POST /api/vacations` - Create new request
- `GET /api/vacations/admin/all` - Get all requests (admin)
- `GET /api/vacations/admin/pending` - Get pending requests (admin)
- `PATCH /api/vacations/:id/review` - Approve/reject (admin)

### Questions
- `GET /api/questions` - Get user's questions
- `POST /api/questions` - Create new question
- `GET /api/questions/admin/all` - Get all questions (admin)
- `GET /api/questions/admin/open` - Get open questions (admin)
- `PATCH /api/questions/:id/answer` - Answer question (admin)

### Dashboard
- `GET /api/dashboard/stats` - Get statistics (admin)

## Database Schema

### User
- id, email, name, role (EMPLOYEE/ADMIN), entraId, createdAt, updatedAt

### TimeEntry
- id, userId, date, hoursWorked, description, status (DRAFT/SUBMITTED/APPROVED/REJECTED), reviewedBy, reviewedAt, createdAt, updatedAt

### VacationRequest
- id, userId, startDate, endDate, reason, status (PENDING/APPROVED/REJECTED), reviewedBy, reviewedAt, createdAt, updatedAt

### Question
- id, userId, question, answer, answeredBy, answeredAt, status (OPEN/ANSWERED), createdAt, updatedAt

## Development

### Database Management

```bash
# View database in Prisma Studio
cd server
npm run prisma:studio

# Create a new migration after schema changes
npm run prisma:migrate

# Reset database (warning: deletes all data)
npx prisma migrate reset
```

### Building for Production

```bash
# Build frontend
cd client
npm run build

# Build backend
cd ../server
npm run build

# Start production server
npm start
```

## Security Considerations

- JWT tokens expire after 7 days
- Admin access requires valid Entra ID authentication
- All API endpoints are protected with authentication middleware
- CORS is configured to only allow requests from the frontend origin
- Passwords are not used for employees (simple email/name login for demo)
- In production, implement proper password hashing for employee accounts

## Deployment

### Production Environment Variables

Update `.env` files for production:

**Server:**
- Set `NODE_ENV=production`
- Use PostgreSQL or SQL Server instead of SQLite
- Use strong, unique JWT secret
- Configure production CORS origin
- Ensure HTTPS is enabled

**Client:**
- Set `VITE_API_URL` to production API URL

### Deployment Platforms

- **Frontend**: Vercel, Netlify, or Azure Static Web Apps
- **Backend**: Azure App Service, AWS Elastic Beanstalk, or DigitalOcean
- **Database**: Azure SQL Database, AWS RDS, or PostgreSQL on any cloud provider

## Troubleshooting

### Port Already in Use
If port 3000 or 3001 is already in use, update the PORT in `.env` files.

### Prisma Errors
If you encounter Prisma errors, try:
```bash
cd server
npx prisma generate
npx prisma migrate reset
```

### Authentication Issues
- Ensure Entra ID redirect URI matches exactly (including http/https and trailing slashes)
- Verify client ID, tenant ID, and secret are correct
- Check that API permissions are granted in Azure Portal

## Support

For issues or questions about this application, please contact the Smart Factory IT Team.

## License

Proprietary - Smart Factory

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Developed for**: Smart Factory
