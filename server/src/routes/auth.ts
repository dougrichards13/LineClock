import { Router, Request, Response } from 'express';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import prisma from '../utils/prisma';
import { generateToken } from '../utils/jwt';

const router = Router();

// Initialize MSAL and Graph clients
let msalClient: ConfidentialClientApplication | null = null;
let graphClient: Client | null = null;

if (process.env.ENTRA_CLIENT_ID && process.env.ENTRA_TENANT_ID && process.env.ENTRA_CLIENT_SECRET) {
  const msalConfig = {
    auth: {
      clientId: process.env.ENTRA_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}`,
      clientSecret: process.env.ENTRA_CLIENT_SECRET,
    },
  };
  msalClient = new ConfidentialClientApplication(msalConfig);
  
  // Initialize Microsoft Graph client for fetching users
  const credential = new ClientSecretCredential(
    process.env.ENTRA_TENANT_ID,
    process.env.ENTRA_CLIENT_ID,
    process.env.ENTRA_CLIENT_SECRET
  );
  
  graphClient = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const tokenResponse = await credential.getToken(['https://graph.microsoft.com/.default']);
        return tokenResponse?.token || '';
      },
    },
  });
  
  console.log('✓ Entra ID authentication configured');
  console.log('✓ Microsoft Graph API client initialized');
} else {
  console.log('⚠ Entra ID not configured - authentication will not be available');
}

// Entra ID login - Get authorization URL (for all users)
router.get('/login', (req: Request, res: Response) => {
  try {
    if (!msalClient) {
      res.status(503).json({
        success: false,
        error: 'Entra ID authentication is not configured. Please contact your administrator.',
      });
      return;
    }

    const redirectUri = process.env.ENTRA_REDIRECT_URI || 'http://localhost:5173/auth/callback';
    
    const authCodeUrlParameters = {
      scopes: ['user.read'],
      redirectUri,
    };

    msalClient.getAuthCodeUrl(authCodeUrlParameters).then((authUrl) => {
      res.json({
        success: true,
        data: { authUrl },
      });
    }).catch((error) => {
      console.error('Auth URL error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate auth URL',
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate login',
    });
  }
});


// Handle Entra ID callback
router.post('/callback', async (req: Request, res: Response) => {
  try {
    if (!msalClient) {
      res.status(503).json({
        success: false,
        error: 'Entra ID authentication is not configured',
      });
      return;
    }

    const { code } = req.body;

    if (!code) {
      res.status(400).json({
        success: false,
        error: 'Authorization code is required',
      });
      return;
    }

    const redirectUri = process.env.ENTRA_REDIRECT_URI || 'http://localhost:3000/auth/callback';

    const tokenRequest = {
      code,
      scopes: ['user.read'],
      redirectUri,
    };

    const response = await msalClient.acquireTokenByCode(tokenRequest);

    if (!response || !response.account) {
      res.status(401).json({
        success: false,
        error: 'Failed to authenticate with Entra ID',
      });
      return;
    }

    const email = response.account.username;
    const name = response.account.name || email;
    const entraId = response.account.homeAccountId;

    // Check if this email should be auto-promoted to ADMIN
    const firstAdminEmails = (process.env.FIRST_ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);
    const shouldBeAdmin = firstAdminEmails.includes(email.toLowerCase());

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          role: shouldBeAdmin ? 'ADMIN' : 'EMPLOYEE',
          entraId,
        },
      });
      if (shouldBeAdmin) {
        console.log(`✓ Auto-promoted ${email} to ADMIN (first admin)`);
      }
    } else {
      // Update entraId if not set, and promote to ADMIN if needed
      const updateData: any = {};
      if (!user.entraId) updateData.entraId = entraId;
      if (shouldBeAdmin && user.role !== 'ADMIN') {
        updateData.role = 'ADMIN';
        console.log(`✓ Auto-promoted ${email} to ADMIN (first admin)`);
      }
      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process authentication callback',
    });
  }
});

// Admin: Fetch users from Entra ID
router.get('/entra/users', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const { verifyToken } = require('../utils/jwt');
    const payload = verifyToken(token);

    // Check if user is admin
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    if (!graphClient) {
      res.status(503).json({ success: false, error: 'Microsoft Graph not configured' });
      return;
    }

    // Fetch users from Entra ID (filter out distribution lists, groups, etc.)
    console.log('Fetching users from Entra ID...');
    const result = await graphClient
      .api('/users')
      .select('id,displayName,mail,userPrincipalName,userType')
      .filter("userType eq 'Member' and accountEnabled eq true")
      .get();
    console.log(`✓ Found ${result.value?.length || 0} users in Entra ID`);
    
    const entraUsers = result.value.map((u: any) => ({
      entraId: u.id,
      name: u.displayName,
      email: u.mail || u.userPrincipalName,
    }));

    // Get existing users from database
    const dbUsers = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, entraId: true, isHidden: true },
    });

    // Merge Entra ID users with DB users
    const mergedUsers = entraUsers.map((entraUser: any) => {
      const dbUser = dbUsers.find(u => u.email === entraUser.email || u.entraId === entraUser.entraId);
      return {
        ...entraUser,
        existsInDb: !!dbUser,
        userId: dbUser?.id,
        role: dbUser?.role || 'EMPLOYEE', // Default if not in DB
        isHidden: dbUser?.isHidden || false,
      };
    });

    res.json({ success: true, data: { users: mergedUsers } });
  } catch (error: any) {
    console.error('❌ Entra users fetch error:', error);
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
      body: error.body,
    });
    res.status(500).json({ 
      success: false, 
      error: `Failed to fetch Entra ID users: ${error.message || 'Unknown error'}` 
    });
  }
});

// Admin: Pre-hide user by Entra ID (before they login)
router.post('/users/pre-hide', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const { verifyToken } = require('../utils/jwt');
    const payload = verifyToken(token);

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!adminUser || adminUser.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const { entraId, email, name, role, isHidden } = req.body;

    if (!entraId || !email || !name) {
      res.status(400).json({ success: false, error: 'entraId, email, and name are required' });
      return;
    }

    const userRole = role && ['ADMIN', 'EMPLOYEE'].includes(role) ? role : 'EMPLOYEE';
    const hidden = typeof isHidden === 'boolean' ? isHidden : true;

    // Create or update user
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name,
        role: userRole,
        entraId,
        isHidden: hidden,
      },
      update: {
        isHidden: hidden,
        ...(role && { role: userRole }),
      },
    });

    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Pre-hide error:', error);
    res.status(500).json({ success: false, error: 'Failed to pre-hide user' });
  }
});

// Admin: Delete user
router.delete('/users/:userId', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const { verifyToken } = require('../utils/jwt');
    const payload = verifyToken(token);

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!adminUser || adminUser.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const { userId } = req.params;

    console.log('Delete request for userId:', userId);
    console.log('Requesting admin userId:', payload.userId);

    // Prevent deleting yourself
    if (userId === payload.userId) {
      res.status(400).json({ success: false, error: 'You cannot delete your own account' });
      return;
    }

    // Check if user exists first
    const userToDelete = await prisma.user.findUnique({ where: { id: userId } });
    if (!userToDelete) {
      console.log('User not found:', userId);
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    console.log('Deleting user:', userToDelete.name, userToDelete.email);

    // Delete user (CASCADE will handle related records)
    await prisma.user.delete({
      where: { id: userId },
    });

    console.log('✓ User deleted successfully');
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('User delete error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'User not found' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
  }
});

// Admin: Toggle user hidden status
router.patch('/users/:userId/hidden', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const { verifyToken } = require('../utils/jwt');
    const payload = verifyToken(token);

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!adminUser || adminUser.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const { userId } = req.params;
    const { isHidden } = req.body;

    if (typeof isHidden !== 'boolean') {
      res.status(400).json({ success: false, error: 'Invalid isHidden value' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isHidden },
      select: { id: true, email: true, name: true, role: true, isHidden: true },
    });

    res.json({ success: true, data: { user: updatedUser } });
  } catch (error) {
    console.error('Hidden status update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user visibility' });
  }
});

// Admin: Update user role
router.patch('/users/:userId/role', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const { verifyToken } = require('../utils/jwt');
    const payload = verifyToken(token);

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!adminUser || adminUser.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['ADMIN', 'EMPLOYEE'].includes(role)) {
      res.status(400).json({ success: false, error: 'Invalid role' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    res.json({ success: true, data: { user: updatedUser } });
  } catch (error) {
    console.error('Role update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user role' });
  }
});

// Get current user profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7);
    const { verifyToken } = require('../utils/jwt');
    const payload = verifyToken(token);

    // Fetch fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        hireDate: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
});

// Update user profile
router.patch('/profile', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7);
    const { verifyToken } = require('../utils/jwt');
    const payload = verifyToken(token);

    const { name, avatarUrl, hireDate } = req.body;

    if (!name || name.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Name is required',
      });
      return;
    }

    const updateData: any = { name: name.trim() };
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (hireDate !== undefined) updateData.hireDate = hireDate ? new Date(hireDate) : null;

    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        hireDate: true,
      },
    });

    res.json({
      success: true,
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
});

export default router;
