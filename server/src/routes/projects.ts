import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, adminOnly } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();

// Get all projects for a client (filtered by user assignments for employees)
router.get('/client/:clientId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';

    let projects;
    if (isAdmin) {
      // Admins see all projects
      projects = await prisma.project.findMany({
        where: { clientId, isActive: true },
        orderBy: { name: 'asc' },
        include: {
          client: {
            select: { id: true, name: true },
          },
        },
      });
    } else {
      // Employees only see assigned projects
      const assignments = await prisma.userProject.findMany({
        where: { userId },
        include: {
          project: {
            include: {
              client: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });
      projects = assignments.map(a => a.project).filter(p => p !== null && p.clientId === clientId && p.isActive);
    }

    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

// Get all projects (for admin)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      where: { isActive: true },
      orderBy: [{ client: { name: 'asc' } }, { name: 'asc' }],
      include: {
        client: {
          select: { id: true, name: true },
        },
        _count: {
          select: { timeEntries: true },
        },
      },
    });

    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Get all projects error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

// Create project (admin only)
router.post('/', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { name, clientId, billingRate } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'Project name is required' });
      return;
    }

    if (!clientId) {
      res.status(400).json({ success: false, error: 'Client is required' });
      return;
    }

    // Verify client exists
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      res.status(404).json({ success: false, error: 'Client not found' });
      return;
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        clientId,
        billingRate: billingRate ? parseFloat(billingRate) : null,
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json({ success: true, data: project });
  } catch (error: any) {
    console.error('Create project error:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ success: false, error: 'Project name already exists for this client' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create project' });
    }
  }
});

// Update project (admin only)
router.put('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isActive, billingRate } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (billingRate !== undefined) updateData.billingRate = billingRate ? parseFloat(billingRate) : null;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });

    res.json({ success: true, data: project });
  } catch (error: any) {
    console.error('Update project error:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ success: false, error: 'Project name already exists for this client' });
    } else if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Project not found' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update project' });
    }
  }
});

// Delete (deactivate) project (admin only)
router.delete('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Soft delete by setting isActive to false
    const project = await prisma.project.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Project deactivated', data: project });
  } catch (error: any) {
    console.error('Delete project error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Project not found' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to deactivate project' });
    }
  }
});

export default router;
