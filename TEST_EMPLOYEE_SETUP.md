# Test Employee Setup Guide

This guide explains how to use the test employee feature to preview the employee experience in LineClock.

## Overview

The test employee feature allows you to:
- Login as a test employee without Azure AD/Entra ID setup
- Preview the employee dashboard and features
- Test time entry, vacation requests, and questions
- Validate the employee workflow before going live

## Test Employee Details

**Email:** `test.employee@smartfactory.com`  
**Name:** Test Employee  
**Role:** EMPLOYEE  
**Billable Rate:** $75/hour

### Pre-configured Test Data

The seed script creates:
- **Client:** Acme Corporation
- **Project:** Digital Transformation (billing rate: $150/hour)
- **Time Entries:**
  - 1 draft entry (6.5 hours - "Requirements gathering and stakeholder meetings")
  - 1 submitted entry (8 hours - "Developed initial proof of concept for API integration")

## How to Setup

### Step 1: Run the Seed Script

```powershell
cd C:\Users\dougx\time-entry-system\server
npm run prisma:seed
```

This creates the test employee user and sample data in the database.

### Step 2: Start the Application

**Backend:**
```powershell
cd C:\Users\dougx\time-entry-system\server
npm run dev
```

**Frontend (in a new terminal):**
```powershell
cd C:\Users\dougx\time-entry-system\client
npm run dev
```

### Step 3: Login as Test Employee

1. Open http://localhost:5173
2. Scroll down to the **"Test Employee Login"** section (yellow DEV ONLY badge)
3. The email `test.employee@smartfactory.com` should already be pre-filled
4. Click **"Login as Test Employee"**
5. You'll be redirected to the Employee Dashboard

## What You'll See

### Employee Dashboard Features

**Time Entries Tab:**
- View existing time entries (draft and submitted)
- Create new time entries
- Edit draft entries
- Submit entries for approval
- Delete draft entries

**Profile Tab:**
- View employee profile information
- See billable rate
- View hire date
- Update avatar and other profile details

### Testing Workflow

1. **Create a New Time Entry:**
   - Click "Add Entry"
   - Select client: Acme Corporation
   - Select project: Digital Transformation
   - Enter hours (e.g., 7.5)
   - Add description
   - Save as draft or submit for review

2. **Submit Existing Draft:**
   - Find the draft entry
   - Click "Submit for Review"
   - Entry status changes to SUBMITTED

3. **Admin Review (Optional):**
   - Logout from test employee
   - Login through Microsoft Entra ID as admin
   - Go to Admin Dashboard
   - Review and approve/reject submitted time entries

## Security Notes

⚠️ **Important:** The test employee login endpoint is **disabled in production** automatically.

- Only works when `NODE_ENV !== 'production'`
- Bypasses Entra ID authentication
- Should only be used for development and testing
- The frontend shows a "DEV ONLY" badge to indicate this

## Production Deployment

Before going live:

1. **Option 1: Keep test employee but require Entra ID login**
   - Add `test.employee@smartfactory.com` to your Azure AD tenant
   - User will login through normal Entra ID flow
   - Test employee login button will be hidden in production

2. **Option 2: Remove test employee**
   - Delete the test employee from the database
   - All employees will use Entra ID authentication

## Troubleshooting

### "User not found" error
- Ensure you ran the seed script: `npm run prisma:seed`
- Check the database for the test employee user
- Verify the email matches exactly: `test.employee@smartfactory.com`

### Test login button not visible
- Check that `NODE_ENV` is not set to `production`
- Clear browser cache and reload
- Check browser console for errors

### Backend error on test login
- Restart the backend server after adding the endpoint
- Check backend logs for error messages
- Verify database connection is working

### Cannot see test data
- Ensure seed script completed successfully
- Check that client and project were created
- Use Prisma Studio to inspect database: `npm run prisma:studio`

## Re-running the Seed Script

The seed script uses `upsert`, so it's safe to run multiple times:
- Won't create duplicates
- Updates existing records if they exist
- Creates new records if they don't exist

To refresh test data:
```powershell
cd C:\Users\dougx\time-entry-system\server
npm run prisma:seed
```

## Next Steps

Once you've tested the employee experience:

1. ✅ Verify all employee features work as expected
2. ✅ Test the full workflow (create → submit → admin approve)
3. ✅ Check that financial calculations are correct
4. ✅ Ensure the UI is intuitive and user-friendly
5. 🚀 **Ready to go live!**

### Going Live Checklist

- [ ] Add all real employees to Azure AD/Entra ID
- [ ] Configure production Entra ID redirect URIs
- [ ] Test at least one real employee login
- [ ] Review admin approval workflow
- [ ] Set up client and project data
- [ ] Assign employees to clients/projects
- [ ] Configure billing rates
- [ ] Test Bill.com integration (if using)
- [ ] Set up automated backups
- [ ] Configure monitoring and alerts

## Support

For questions or issues:
- Check WARP.md for development guidelines
- Review QUICKSTART.md for general setup
- Check DEPLOYMENT.md for production deployment

---

**Created:** January 2026  
**Last Updated:** January 2026
