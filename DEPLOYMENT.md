# LineClock Production Deployment Guide

## Overview
This guide walks you through deploying LineClock to production at `lineclock.smartfactory.io`.

## Pre-Deployment Security Checklist
✅ Security headers added (helmet)
✅ Rate limiting configured
✅ Request size limits set
✅ HTTPS enforcement in production
✅ Error details hidden in production
✅ Database upgraded to PostgreSQL
✅ Environment variables templated

## Recommended Hosting Setup

### Option 1: Railway (Recommended - Easiest)
**Cost**: ~$5-10/month
**Features**: Managed PostgreSQL, automatic deployments, free SSL, easy setup

#### Step 1: Set up Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create a new project

#### Step 2: Deploy Backend to Railway
1. Click "New Project" → "Deploy from GitHub repo"
2. Select your `time-entry-system` repository
3. Railway will detect it's a Node.js project
4. Add PostgreSQL database:
   - Click "+ New" → "Database" → "PostgreSQL"
   - Railway will create a database and provide `DATABASE_URL`

#### Step 3: Configure Environment Variables in Railway
In your Railway project settings, add these variables:
```
NODE_ENV=production
DATABASE_URL=[Auto-provided by Railway PostgreSQL]
JWT_SECRET=[Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"]
ENTRA_CLIENT_ID=[Your Azure App ID]
ENTRA_TENANT_ID=[Your Azure Tenant ID]
ENTRA_CLIENT_SECRET=[Your Azure App Secret]
ENTRA_REDIRECT_URI=https://lineclock.smartfactory.io/auth/callback
CORS_ORIGIN=https://lineclock.smartfactory.io
```

#### Step 4: Deploy Frontend to GoDaddy
1. Build the frontend:
   ```bash
   cd client
   npm run build
   ```
2. This creates a `dist` folder with static files
3. Upload contents of `dist` folder to GoDaddy cPanel File Manager:
   - Log into GoDaddy cPanel
   - Go to File Manager
   - Navigate to `public_html` or your domain folder
   - Upload all files from `client/dist`

#### Step 5: Configure DNS
In GoDaddy DNS settings:
1. **A Record or CNAME**: `lineclock.smartfactory.io` → GoDaddy server IP (for frontend)
2. **CNAME**: `api.lineclock.smartfactory.io` → Railway backend URL

#### Step 6: Configure SSL
- GoDaddy: Enable free SSL certificate in cPanel
- Railway: SSL is automatic

#### Step 7: Update Azure Entra ID
1. Go to Azure Portal → App Registrations
2. Add redirect URI: `https://lineclock.smartfactory.io/auth/callback`
3. Add to allowed origins for CORS

#### Step 8: Test Deployment
1. Visit: `https://lineclock.smartfactory.io`
2. Test login with Microsoft account
3. Verify time entry creation
4. Check Bill.com integration

---

### Option 2: Full GoDaddy (If you prefer one provider)
**Cost**: ~$20-50/month
**Requirements**: VPS or Dedicated Server with Node.js support

#### Setup:
1. Order GoDaddy VPS with Node.js
2. Set up PostgreSQL (or use GoDaddy MySQL with Prisma adapter)
3. Configure nginx as reverse proxy
4. Set up SSL with Let's Encrypt
5. Deploy both frontend and backend to VPS

**Note**: This requires more server management knowledge.

---

## Post-Deployment Tasks

### 1. Run Database Migrations
```bash
# On Railway (in deployment settings):
npm run prisma:migrate:deploy
```

### 2. Create First Admin User
1. Visit: `https://lineclock.smartfactory.io`
2. Log in with your Microsoft account
3. First user becomes admin automatically

### 3. Configure Bill.com (Optional)
1. Log in as admin
2. Go to Invoicing → Bill.com Configuration
3. Enter Bill.com credentials
4. Test connection

### 4. Test All Features
- [ ] Login/Logout
- [ ] Time entry creation
- [ ] Time entry approval
- [ ] Vacation requests
- [ ] Client & project management
- [ ] User management
- [ ] FIP assignments
- [ ] Financial reports
- [ ] Bill.com invoice generation

### 5. Set Up Monitoring
1. **Uptime Monitoring**: Use [UptimeRobot](https://uptimerobot.com/) (free)
   - Monitor: `https://api.lineclock.smartfactory.io/health`
2. **Error Tracking**: Consider Sentry (optional)
3. **Database Backups**: Railway has automatic backups

---

## Environment Variables Reference

### Backend (.env.production)
```bash
NODE_ENV=production
DATABASE_URL=postgresql://...  # From Railway
JWT_SECRET=...  # Generate strong secret
ENTRA_CLIENT_ID=...
ENTRA_TENANT_ID=...
ENTRA_CLIENT_SECRET=...
ENTRA_REDIRECT_URI=https://lineclock.smartfactory.io/auth/callback
CORS_ORIGIN=https://lineclock.smartfactory.io
```

### Frontend (.env.production)
```bash
VITE_API_URL=https://api.lineclock.smartfactory.io/api
```

---

## Troubleshooting

### Issue: Cannot connect to database
**Solution**: Check DATABASE_URL format:
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

### Issue: CORS errors
**Solution**: Ensure CORS_ORIGIN matches frontend URL exactly (with https://)

### Issue: Login fails
**Solution**: 
1. Verify ENTRA_REDIRECT_URI matches Azure App Registration
2. Check Azure App has correct redirect URIs
3. Verify ENTRA_CLIENT_SECRET is correct

### Issue: Health check fails
**Solution**: 
1. Check database connection
2. Verify all environment variables are set
3. Check Railway logs for errors

---

## Rollback Procedure

If deployment fails:
1. **Railway**: Click "Rollback" in deployments tab
2. **Frontend**: Replace files on GoDaddy with previous version
3. **Database**: Railway keeps automatic backups

---

## Security Reminders

✅ **NEVER** commit `.env.production` to GitHub
✅ Use strong JWT_SECRET (64+ characters)
✅ Keep Entra ID credentials secure
✅ Regularly update dependencies: `npm audit fix`
✅ Monitor Railway logs for suspicious activity
✅ Enable 2FA on all accounts (Azure, Railway, GoDaddy)

---

## Support & Maintenance

### Updating the App
1. Make changes locally
2. Test thoroughly
3. Commit to GitHub
4. Railway auto-deploys backend
5. Build and upload frontend to GoDaddy

### Database Backups
- Railway: Automatic daily backups (retained 7 days)
- Manual backup: Export from Railway dashboard

### Cost Monitoring
- Railway: Check usage dashboard monthly
- GoDaddy: Monitor hosting renewal dates

---

## Next Steps After Deployment

1. ✅ Test all features thoroughly
2. ✅ Train team on LineClock usage
3. ✅ Set up monitoring alerts
4. ✅ Schedule weekly backups verification
5. ✅ Document any custom configurations
6. ✅ Create user guide for employees

---

## Questions?
- Railway Support: support@railway.app
- Azure Support: Azure Portal support chat
- GoDaddy Support: GoDaddy customer service
