import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, adminOnly } from '../middleware/auth';
import prisma from '../utils/prisma';
import billComService from '../services/billcom';

const router = Router();

// Save or update Bill.com credentials
router.post('/credentials', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    console.log('📥 Received credentials save request');
    console.log('Request body keys:', Object.keys(req.body));
    
    const { devKey, username, password, organizationId, environment } = req.body;

    if (!devKey || !username || !password || !organizationId) {
      console.error('❌ Missing required fields:', { devKey: !!devKey, username: !!username, password: !!password, organizationId: !!organizationId });
      return res.status(400).json({ error: 'All credentials are required' });
    }

    if (!['SANDBOX', 'PRODUCTION'].includes(environment)) {
      console.error('❌ Invalid environment:', environment);
      return res.status(400).json({ error: 'Environment must be SANDBOX or PRODUCTION' });
    }

    console.log('✅ Credentials validated, attempting to save...');
    await billComService.saveCredentials({
      devKey,
      username,
      password,
      organizationId,
      environment,
    });

    console.log('✅ Credentials saved successfully');
    res.json({ success: true, message: 'Bill.com credentials saved successfully' });
  } catch (error: any) {
    console.error('❌ Save credentials error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'Failed to save credentials' });
  }
});

// Test Bill.com connection
router.post('/test-connection', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const result = await billComService.testConnection();
    res.json(result);
  } catch (error: any) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to test connection',
    });
  }
});

// Get Bill.com configuration status (without exposing sensitive data)
router.get('/status', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const config = await prisma.billComConfig.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        environment: true,
        isActive: true,
        sessionExpiry: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!config) {
      return res.json({
        success: true,
        data: {
          configured: false,
          message: 'Bill.com not configured',
        },
      });
    }

    const isSessionValid = config.sessionExpiry && new Date(config.sessionExpiry) > new Date();

    res.json({
      success: true,
      data: {
        configured: true,
        environment: config.environment,
        sessionValid: isSessionValid,
        lastUpdated: config.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Get config status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get configuration status' });
  }
});

// Sync customers from Bill.com
router.post('/sync-customers', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    console.log('🔄 Sync customers request received');
    console.log('Fetching customers from Bill.com...');
    const customers = await billComService.getCustomers();
    console.log(`✅ Retrieved ${customers.length} customers from Bill.com`);

    res.json({
      success: true,
      data: customers,
      message: `Retrieved ${customers.length} customers from Bill.com`,
    });
  } catch (error: any) {
    console.error('❌ Sync customers error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'Failed to sync customers' });
  }
});

// Get all customer mappings
router.get('/customer-mappings', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const mappings = await prisma.billComCustomerMapping.findMany({
      include: {
        client: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ success: true, data: mappings });
  } catch (error: any) {
    console.error('Get customer mappings error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch customer mappings' });
  }
});

// Create or update customer mapping
router.post('/customer-mappings', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, billComCustomerId, billComCustomerName } = req.body;

    if (!clientId || !billComCustomerId) {
      return res.status(400).json({ error: 'Client ID and Bill.com Customer ID are required' });
    }

    // Check if mapping already exists
    const existing = await prisma.billComCustomerMapping.findUnique({
      where: { clientId },
    });

    let mapping;
    if (existing) {
      // Update existing mapping
      mapping = await prisma.billComCustomerMapping.update({
        where: { clientId },
        data: {
          billComCustomerId,
          billComCustomerName,
        },
        include: {
          client: true,
        },
      });
    } else {
      // Create new mapping
      mapping = await prisma.billComCustomerMapping.create({
        data: {
          clientId,
          billComCustomerId,
          billComCustomerName,
        },
        include: {
          client: true,
        },
      });
    }

    res.json({ success: true, data: mapping });
  } catch (error: any) {
    console.error('Save customer mapping error:', error);
    res.status(500).json({ error: error.message || 'Failed to save customer mapping' });
  }
});

// Delete customer mapping
router.delete('/customer-mappings/:clientId', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;

    await prisma.billComCustomerMapping.delete({
      where: { clientId },
    });

    res.json({ success: true, message: 'Customer mapping deleted' });
  } catch (error: any) {
    console.error('Delete customer mapping error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete customer mapping' });
  }
});

// Get unmapped clients (clients without Bill.com customer mapping)
router.get('/unmapped-clients', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      where: {
        isActive: true,
        billComMapping: null,
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({ success: true, data: clients });
  } catch (error: any) {
    console.error('Get unmapped clients error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch unmapped clients' });
  }
});

export default router;
