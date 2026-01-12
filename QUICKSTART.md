# Quick Start Guide

Get the Smart Factory Time Entry System running in 5 minutes!

## Current Status ✅

The application is **fully functional** with:
- ✅ Complete backend API (Express + Prisma + SQLite)
- ✅ Complete frontend UI (React + TypeScript + Tailwind CSS)
- ✅ Database configured and migrated
- ✅ Employee login (simple email/name)
- ✅ Test admin login (no Azure required)
- ✅ Full feature set working (time entries, vacations, questions)

## Quick Start (Test Mode - No Azure Required)

### 1. Start the Backend Server

```powershell
cd C:\Users\dougx\time-entry-system\server
npm run dev
```

You should see:
```
🚀 Smart Factory Time Entry System server running on port 3001
⚠ Entra ID not configured - admin login will not be available
```

### 2. Start the Frontend (New Terminal)

```powershell
cd C:\Users\dougx\time-entry-system\client
npm run dev
```

You should see:
```
  ➜  Local:   http://localhost:5173/
```

### 3. Open the Application

Navigate to: **http://localhost:5173**

## Test the Application

### Option 1: Employee Login (Instant Setup)

1. Click the **Employee Login** section
2. Enter any name and email (e.g., "John Doe", "john@smartfactory.com")
3. Click **Login as Employee**
4. You're now in the employee dashboard!

**What you can do:**
- ✅ Create time entries (date, hours, description)
- ✅ Submit time entries for admin review
- ✅ Request vacation time
- ✅ Ask questions to administrators
- ✅ View status of all your submissions

### Option 2: Test Admin Login (No Azure Needed)

1. Click **Login as Test Admin** button
2. You're instantly logged in as an admin!
3. You're now in the admin dashboard!

**What you can do:**
- ✅ View dashboard statistics
- ✅ Approve/reject time entries
- ✅ Approve/reject vacation requests
- ✅ Answer employee questions

### Option 3: Real Entra ID Admin Login (Requires Azure Setup)

**Prerequisites:** You must complete the Azure AD setup first.

1. Follow the guide in `ENTRA_ID_SETUP.md` to configure Azure
2. Update the `.env` file with your Azure credentials
3. Restart the backend server
4. Click **Login as Administrator (Entra ID)**
5. Sign in with your Microsoft work account

## Complete Workflow Test

Want to test the full system? Here's a complete workflow:

### As an Employee:

1. **Login** as employee (e.g., "Jane Smith", "jane@smartfactory.com")
2. **Create a time entry**
   - Date: Today
   - Hours: 8
   - Description: "Worked on assembly line maintenance"
   - Click "Add Entry"
3. **Submit for review**
   - Click "Submit for Review" button next to the entry
4. **Request vacation**
   - Start Date: Next week
   - End Date: +7 days
   - Reason: "Family vacation"
   - Click "Submit Request"
5. **Ask a question**
   - "What is the policy for overtime pay?"
   - Click "Submit Question"
6. **Logout** (click Logout in top right)

### As an Admin:

1. **Login** as test admin (click "Login as Test Admin")
2. **View dashboard**
   - See statistics: 1 pending time entry, 1 pending vacation, 1 open question
3. **Review time entries** (click "Time Entries" tab)
   - See Jane Smith's entry
   - Click "Approve" button
4. **Review vacations** (click "Vacations" tab)
   - See Jane's vacation request
   - Click "Approve" button
5. **Answer question** (click "Questions" tab)
   - See Jane's question
   - Type answer: "Overtime is paid at 1.5x rate after 40 hours per week"
   - Click "Submit Answer"
6. **Logout**

### Verify as Employee:

1. **Login again** as Jane Smith
2. **Check status:**
   - Time entry shows "APPROVED" status ✅
   - Vacation request shows "APPROVED" status ✅
   - Question shows "ANSWERED" status with admin's response ✅

## Features Overview

### Employee Features
| Feature | Description | Status |
|---------|-------------|--------|
| Time Entry Management | Create, edit, submit time entries | ✅ Working |
| Vacation Requests | Request time off with dates and reason | ✅ Working |
| Q&A System | Ask questions to administrators | ✅ Working |
| Status Tracking | View approval status of submissions | ✅ Working |
| Simple Login | Login with just name and email | ✅ Working |

### Admin Features
| Feature | Description | Status |
|---------|-------------|--------|
| Dashboard Overview | Statistics on pending items | ✅ Working |
| Time Entry Review | Approve/reject time entries | ✅ Working |
| Vacation Management | Approve/reject vacation requests | ✅ Working |
| Question Answering | Respond to employee questions | ✅ Working |
| Test Login | Quick admin access without Azure | ✅ Working |
| Entra ID Login | Secure Microsoft authentication | ⚠️ Requires Azure setup |

## Troubleshooting

### Backend won't start
- Check if port 3001 is already in use
- Run: `Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process`

### Frontend won't start
- Check if port 5173 is already in use
- Try: `npm run dev -- --port 5174` (use different port)

### Database errors
```powershell
cd server
npm run prisma:migrate
npm run prisma:generate
```

### Login not working
- Clear browser localStorage: F12 → Application → Local Storage → Clear
- Restart both servers
- Check browser console for errors (F12)

### Can't see data after creating it
- Check browser console for API errors
- Verify backend server is running
- Check that CORS_ORIGIN in server/.env is `http://localhost:5173`

## Next Steps

### For Development
- ✅ Application is ready to use in test mode
- ✅ All features are working
- 📝 Optional: Set up Entra ID for real admin authentication (see ENTRA_ID_SETUP.md)

### For Production
1. Set up production database (PostgreSQL or SQL Server)
2. Configure Entra ID with production redirect URI
3. Update environment variables for production
4. Deploy backend to cloud service (Azure App Service, etc.)
5. Deploy frontend to static hosting (Azure Static Web Apps, Vercel, etc.)
6. Enable HTTPS
7. Set up monitoring and logging

## Support

If you encounter issues:
1. Check this guide and ENTRA_ID_SETUP.md
2. Review browser console (F12) for client-side errors
3. Review backend terminal for server-side errors
4. Verify all dependencies are installed (`npm install`)

## Summary

🎉 **The application is complete and fully functional!**

- For **immediate use**: Use test admin login (no Azure setup needed)
- For **production use**: Follow ENTRA_ID_SETUP.md to configure real authentication

All features work perfectly:
- Employee time tracking ✅
- Vacation management ✅
- Q&A system ✅
- Admin approval workflows ✅
- Multi-user support ✅
