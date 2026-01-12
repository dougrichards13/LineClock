# Entra ID (Azure AD) Setup Guide

This guide walks you through setting up Microsoft Entra ID authentication for the Smart Factory Time Entry System.

## Prerequisites
- Azure subscription with admin access
- Access to Azure Active Directory
- Project already running locally (backend on port 3001, frontend on port 5173)

## Step 1: Create App Registration in Azure Portal

1. **Log into Azure Portal**
   - Go to https://portal.azure.com
   - Sign in with your admin account

2. **Navigate to App Registrations**
   - In the search bar, type "Azure Active Directory" or "Entra ID"
   - Click on Azure Active Directory
   - In the left sidebar, click "App registrations"
   - Click "+ New registration"

3. **Register the Application**
   - **Name**: `Smart Factory Time Entry System`
   - **Supported account types**: Select "Accounts in this organizational directory only (Single tenant)"
   - **Redirect URI**: 
     - Platform: Select **Web**
     - URI: Enter `http://localhost:5173/auth/callback`
   - Click **Register**

4. **Copy Important Values**
   - On the Overview page, you'll see:
     - **Application (client) ID**: Copy this (looks like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
     - **Directory (tenant) ID**: Copy this (looks like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

## Step 2: Create Client Secret

1. **Navigate to Certificates & Secrets**
   - In your app registration, click "Certificates & secrets" in the left sidebar
   - Click the "Client secrets" tab
   - Click "+ New client secret"

2. **Create Secret**
   - **Description**: `Time Entry System Secret`
   - **Expires**: Select "24 months" (recommended) or your organization's policy
   - Click **Add**

3. **Copy the Secret Value**
   - ⚠️ **IMPORTANT**: Copy the **Value** immediately! You won't be able to see it again.
   - The value looks like: `abc~xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Do NOT copy the "Secret ID", copy the "Value"

## Step 3: Configure API Permissions

1. **Add Microsoft Graph Permissions**
   - Click "API permissions" in the left sidebar
   - Click "+ Add a permission"
   - Select **Microsoft Graph**
   - Select **Delegated permissions**
   - Search for and select: `User.Read`
   - Click "Add permissions"

2. **Grant Admin Consent**
   - Click the "✓ Grant admin consent for [Your Organization]" button
   - Click "Yes" to confirm
   - You should see a green checkmark appear next to the permission

## Step 4: Update Environment Variables

1. **Open server/.env file**
   - Located at: `C:\Users\dougx\time-entry-system\server\.env`

2. **Update the following values:**
   ```env
   ENTRA_CLIENT_ID=<paste your Application (client) ID here>
   ENTRA_TENANT_ID=<paste your Directory (tenant) ID here>
   ENTRA_CLIENT_SECRET=<paste your client secret Value here>
   ```

3. **Save the file**

## Step 5: Restart the Backend Server

The backend needs to reload the environment variables:

```powershell
# In your backend terminal, press Ctrl+C to stop the server
# Then restart it:
npm run dev
```

You should see the console message:
```
✓ Entra ID authentication configured
```

## Step 6: Test Entra ID Login

1. **Open the application**
   - Navigate to http://localhost:5173

2. **Click "Login as Administrator (Entra ID)"**
   - You'll be redirected to Microsoft's login page
   - Sign in with your Microsoft work/school account
   - You may be asked to consent to the app accessing your profile
   - After successful login, you'll be redirected back to the admin dashboard

## For Production Deployment

When deploying to production, you'll need to:

1. **Add Production Redirect URI**
   - Go back to Azure Portal > App registrations > Your app
   - Click "Authentication" in the left sidebar
   - Under "Redirect URIs", add your production URL:
     - Example: `https://timeentry.yourdomain.com/auth/callback`
   - Click "Save"

2. **Update Environment Variables**
   - Update `ENTRA_REDIRECT_URI` in server/.env to match production URL
   - Update `CORS_ORIGIN` to match production frontend URL

## Troubleshooting

### Error: "AADSTS50011: The redirect URI specified in the request does not match"
- **Solution**: Verify the redirect URI in Azure Portal exactly matches `http://localhost:5173/auth/callback`
- Ensure there are no trailing slashes or typos

### Error: "Entra ID authentication is not configured"
- **Solution**: Check that all three environment variables are set in server/.env
- Restart the backend server after updating .env

### Error: "AADSTS65001: User or administrator has not consented"
- **Solution**: Go to API permissions in Azure Portal and click "Grant admin consent"

### No error but login doesn't work
- **Solution**: Check browser console (F12) for errors
- Verify backend is running and receiving requests
- Check backend terminal for error messages

## Security Notes

- **Never commit** the `.env` file to version control
- Store production secrets in a secure secrets manager (Azure Key Vault, etc.)
- Rotate client secrets regularly (recommended: every 6-12 months)
- Review app permissions periodically
- Use HTTPS in production
