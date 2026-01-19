# LineClock™

**Professional Time Tracking & Financial Management Platform**

LineClock is an enterprise-grade time tracking and financial management system built for professional services firms. Designed specifically for management consulting organizations, LineClock streamlines time entry, project management, financial reporting, and billing operations.

## Overview

LineClock provides a complete solution for managing billable time, consultant rates, client billing, and performance-based compensation programs. With integrated Microsoft Entra ID authentication and Bill.com invoicing, LineClock eliminates manual processes and provides real-time visibility into project profitability.

**Key Capabilities:**
- Billable time tracking with multi-level approval workflows
- Client and project management with rate tracking
- Fractional Incentive Program (FIP) for performance-based compensation
- Financial reporting including 1099 generation and margin analysis
- Bill.com integration for automated invoice creation
- Microsoft Entra ID single sign-on
- Role-based access control (Admin/Employee)

## Technology Stack

### Backend
- **Runtime:** Node.js with Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Microsoft Entra ID (OAuth 2.0)
- **API Integration:** Bill.com API, Microsoft Graph API
- **Security:** Helmet, Express Rate Limit, CORS, JWT

### Frontend
- **Framework:** React with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios
- **State Management:** React Context API

## Features

### Time Management
- Employee time entry with date, hours, client, project, and task notes
- Draft, submitted, approved, and rejected status workflow
- Manager approval interface with bulk actions
- Historical time entry viewing and reporting
- Overtime request management

### Financial Tracking
- Consultant billable rates (for 1099 reporting)
- Client billing rates (for invoicing)
- Automatic calculation of consultant amounts, client amounts, and margins
- Smart Factory margin tracking after FIP deductions
- Financial year-over-year reporting

### Fractional Incentive Program (FIP)
- Performance-based incentive assignments
- Leader earns per-hour incentive on team members' billable time
- Project-specific or global FIP assignments
- Automatic FIP calculation on time entry approval
- FIP earnings dashboard for leaders
- 1099-ready reporting for incentive income

### Client & Project Management
- Client creation and management
- Project assignment to clients with billing rates
- User-to-client and user-to-project assignments
- Active/inactive status management
- Project profitability analysis

### Invoicing
- Bill.com integration for automated invoice generation
- Customer mapping between LineClock clients and Bill.com customers
- Invoice line items from approved time entries
- Configurable billing periods
- Invoice status tracking

### Reporting
- My FIP Dashboard: View personal incentive earnings and assignments
- 1099 Reports: Annual income reporting for contractors and FIP earners
- Project Profitability: Margin analysis per project
- Company Summary: Organization-wide financial metrics

### User Management
- Microsoft Entra ID user synchronization
- Role-based permissions (Admin/Employee)
- User hiding for distribution lists and non-employees
- Profile management with hire dates and billable rates
- Pre-hiding users before first login

### Security
- Enterprise single sign-on via Microsoft Entra ID
- JWT-based session management
- HTTPS enforcement in production
- Rate limiting on authentication endpoints
- Helmet security headers
- Input sanitization and validation
- CORS protection

## System Requirements

### Development
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn
- Microsoft Azure account with Entra ID

### Production
- PostgreSQL database (managed service recommended)
- Node.js hosting environment
- SSL/TLS certificate
- Domain with DNS management

## Installation

### Prerequisites
1. Clone the repository
2. Set up Microsoft Entra ID application
3. Configure Bill.com API access (optional)
4. Provision PostgreSQL database

### Backend Setup

```bash
cd server
npm install

# Copy environment template
cp .env.example .env

# Configure .env with your credentials:
# - DATABASE_URL (PostgreSQL connection string)
# - JWT_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
# - ENTRA_CLIENT_ID, ENTRA_TENANT_ID, ENTRA_CLIENT_SECRET
# - ENTRA_REDIRECT_URI
# - CORS_ORIGIN

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd client
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:3001/api" > .env

# Start development server
npm run dev
```

## Configuration

### Microsoft Entra ID Setup

1. **Create App Registration** in Azure Portal
2. **Set Redirect URIs:**
   - Development: `http://localhost:5173/auth/callback`
   - Production: `https://lineclock.smartfactory.io/auth/callback`
3. **Enable ID tokens** in Authentication settings
4. **Create Client Secret** and save securely
5. **API Permissions:** Microsoft Graph - User.Read

### Bill.com Configuration

1. Obtain Bill.com developer credentials
2. Configure in LineClock admin dashboard under Invoicing
3. Map LineClock clients to Bill.com customers
4. Test connection before generating invoices

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive production deployment guide.

### Quick Production Deployment (Railway + GoDaddy)

**Backend (Railway):**
1. Create Railway account and link GitHub repository
2. Add PostgreSQL database service
3. Configure environment variables (see `.env.production.example`)
4. Deploy automatically via GitHub integration

**Frontend (GoDaddy):**
1. Build production bundle: `npm run build`
2. Upload `dist` folder contents to cPanel
3. Configure DNS and SSL certificate

**Post-Deployment:**
1. Run migrations: `npx prisma migrate deploy`
2. Update Entra ID redirect URIs
3. Test authentication flow
4. Create first admin user

## Project Structure

```
time-entry-system/
├── server/                 # Backend API
│   ├── src/
│   │   ├── index.ts       # Express app entry
│   │   ├── routes/        # API endpoints
│   │   ├── middleware/    # Auth, validation
│   │   └── utils/         # Helpers, JWT, Prisma
│   ├── prisma/
│   │   ├── schema.prisma  # Database schema
│   │   └── migrations/    # DB migrations
│   └── package.json
│
├── client/                # Frontend React app
│   ├── src/
│   │   ├── pages/         # Route components
│   │   ├── components/    # Reusable UI
│   │   ├── services/      # API client
│   │   └── utils/         # Auth context, helpers
│   └── package.json
│
├── DEPLOYMENT.md          # Production deployment guide
└── README.md              # This file
```

## API Documentation

### Authentication
- `GET /api/auth/login` - Get Microsoft authentication URL
- `POST /api/auth/callback` - Handle OAuth callback
- `GET /api/auth/profile` - Get current user profile
- `PATCH /api/auth/profile` - Update user profile

### Time Entries
- `GET /api/time-entries` - Get user's time entries
- `POST /api/time-entries` - Create time entry
- `PUT /api/time-entries/:id` - Update time entry
- `DELETE /api/time-entries/:id` - Delete time entry
- `GET /api/time-entries/admin/pending` - Get pending approvals (admin)
- `PATCH /api/time-entries/:id/review` - Approve/reject entry (admin)

### Clients & Projects
- `GET /api/clients` - List all clients
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project

### Fractional Incentive Program
- `GET /api/fractional-incentives` - List FIP assignments (admin)
- `POST /api/fractional-incentives` - Create FIP assignment (admin)
- `PUT /api/fractional-incentives/:id` - Update FIP assignment (admin)
- `DELETE /api/fractional-incentives/:id` - Delete FIP assignment (admin)
- `GET /api/fractional-incentives/my-incentives` - Get user's FIP data

### Financial Reports
- `GET /api/financial-reports/1099/:userId/:year` - Generate 1099 report
- `GET /api/financial-reports/project-profitability/:projectId` - Project margins
- `GET /api/financial-reports/company-summary` - Organization metrics

### Health Check
- `GET /health` - System health and database connectivity

## Security Considerations

### Production Checklist
- Use strong JWT_SECRET (64+ characters)
- Enable HTTPS/TLS on all endpoints
- Configure CORS for specific frontend domain only
- Store sensitive credentials in environment variables
- Enable database encryption at rest
- Implement database connection pooling
- Set up automated backups
- Monitor logs for suspicious activity
- Keep dependencies updated
- Enable 2FA on all admin accounts

### Rate Limiting
- General API: 100 requests per 15 minutes per IP
- Authentication endpoints: 20 requests per 15 minutes per IP
- Adjustable in production based on usage patterns

## Troubleshooting

**Database Connection Errors:**
- Verify DATABASE_URL format: `postgresql://user:password@host:port/database`
- Check database is running and accessible
- Confirm Prisma migrations are up to date

**Authentication Failures:**
- Verify ENTRA_REDIRECT_URI matches Azure App Registration exactly
- Check ENTRA_CLIENT_SECRET is current and correct
- Ensure callback URL is added to Azure allowed redirect URIs

**CORS Errors:**
- Confirm CORS_ORIGIN matches frontend URL exactly (including protocol)
- Check frontend is using correct API URL in requests

**Build Errors:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Verify Node.js version compatibility (18+)
- Check TypeScript compilation: `npm run build`

## Support

For deployment assistance, technical questions, or feature requests, please refer to:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment instructions
- GitHub Issues - Bug reports and feature requests
- Azure Support - Entra ID and Microsoft services
- Railway Support - Hosting and database questions

## License

Proprietary software developed by Smart Factory for internal use.

## Acknowledgments

**Built by Smart Factory**
- Professional consulting services
- Custom enterprise software development
- Technology strategy and implementation

---

**Version:** 1.0.0  
**Last Updated:** January 2026  
**Status:** Production Ready

