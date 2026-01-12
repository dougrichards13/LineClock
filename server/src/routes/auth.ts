import { Router, Request, Response } from 'express';
import { ConfidentialClientApplication } from '@azure/msal-node';
import prisma from '../utils/prisma';
import { generateToken } from '../utils/jwt';

const router = Router();

// Only initialize MSAL if Entra ID credentials are provided
let msalClient: ConfidentialClientApplication | null = null;

if (process.env.ENTRA_CLIENT_ID && process.env.ENTRA_TENANT_ID && process.env.ENTRA_CLIENT_SECRET) {
  const msalConfig = {
    auth: {
      clientId: process.env.ENTRA_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}`,
      clientSecret: process.env.ENTRA_CLIENT_SECRET,
    },
  };
  msalClient = new ConfidentialClientApplication(msalConfig);
  console.log('✓ Entra ID authentication configured');
} else {
  console.log('⚠ Entra ID not configured - admin login will not be available');
}

// Simple employee login (no password for demo purposes)
router.post('/login/employee', async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      res.status(400).json({
        success: false,
        error: 'Email and name are required',
      });
      return;
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          role: 'EMPLOYEE',
        },
      });
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
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login',
    });
  }
});

// Test admin login (for development when Entra ID is not configured)
router.post('/login/admin-test', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
      });
      return;
    }

    // Find or create admin user
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: 'Test Admin',
          role: 'ADMIN',
        },
      });
    } else if (user.role !== 'ADMIN') {
      // Update existing user to admin
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      });
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
    console.error('Test admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login as test admin',
    });
  }
});

// Admin login via Entra ID - Get authorization URL
router.get('/login/admin', (req: Request, res: Response) => {
  try {
    if (!msalClient) {
      res.status(503).json({
        success: false,
        error: 'Entra ID authentication is not configured. Please set ENTRA_CLIENT_ID, ENTRA_TENANT_ID, and ENTRA_CLIENT_SECRET in .env',
      });
      return;
    }

    const redirectUri = process.env.ENTRA_REDIRECT_URI || 'http://localhost:3000/auth/callback';
    
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
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate admin login',
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

    // Find or create admin user
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          role: 'ADMIN',
          entraId,
        },
      });
    } else if (user.role !== 'ADMIN') {
      // Update existing user to admin
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN', entraId },
      });
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

export default router;
