import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, adminOnly } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();

// Get all clients (filtered by user assignments for employees, all for admins)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';

    let clients;
    if (isAdmin) {
      // Admins see all clients
      clients = await prisma.client.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { projects: true, timeEntries: true },
          },
        },
      });
    } else {
      // Employees only see assigned clients
      const assignments = await prisma.userClient.findMany({
        where: { userId },
        include: {
          client: {
            include: {
              _count: {
                select: { projects: true, timeEntries: true },
              },
            },
          },
        },
      });
      clients = assignments.map(a => a.client).filter(c => c !== null && c.isActive);
    }

    res.json({ success: true, data: clients });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch clients' });
  }
});

// Get single client with projects
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!client) {
      res.status(404).json({ success: false, error: 'Client not found' });
      return;
    }

    res.json({ success: true, data: client });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch client' });
  }
});

// Create client (admin only)
router.post('/', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'Client name is required' });
      return;
    }

    const client = await prisma.client.create({
      data: {
        name: name.trim(),
      },
    });

    res.status(201).json({ success: true, data: client });
  } catch (error: any) {
    console.error('Create client error:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ success: false, error: 'Client name already exists' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create client' });
    }
  }
});

// Update client (admin only)
router.put('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: client });
  } catch (error: any) {
    console.error('Update client error:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ success: false, error: 'Client name already exists' });
    } else if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Client not found' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update client' });
    }
  }
});

// Delete (deactivate) client (admin only)
router.delete('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if client has active projects
    const activeProjects = await prisma.project.count({
      where: { clientId: id, isActive: true },
    });

    if (activeProjects > 0) {
      res.status(400).json({
        success: false,
        error: 'Cannot deactivate client with active projects. Deactivate projects first.',
      });
      return;
    }

    // Soft delete by setting isActive to false
    const client = await prisma.client.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Client deactivated', data: client });
  } catch (error: any) {
    console.error('Delete client error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Client not found' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to deactivate client' });
    }
  }
});

export default router;
