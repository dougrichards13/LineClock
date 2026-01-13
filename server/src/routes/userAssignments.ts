import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, adminOnly } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();

// Get all users with their assignments (admin only)
router.get('/users', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    console.log('Fetching users for assignments...');
    const users = await prisma.user.findMany({
      where: { 
        role: 'EMPLOYEE',
        isHidden: false,  // Exclude hidden users
      },
      orderBy: { name: 'asc' },
      include: {
        assignedClients: {
          include: {
            client: { select: { id: true, name: true } },
          },
        },
        assignedProjects: {
          include: {
            project: {
              include: {
                client: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    console.log(`Found ${users.length} employees for assignments`);
    users.forEach(u => console.log(`  - ${u.name} (${u.email}) - role: ${u.role}, hidden: ${u.isHidden}`));

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// Get assignments for a specific user
router.get('/user/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';

    // Only admin or the user themselves can see assignments
    if (!isAdmin && userId !== requestingUserId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const assignments = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        assignedClients: {
          include: {
            client: { select: { id: true, name: true } },
          },
        },
        assignedProjects: {
          include: {
            project: {
              include: {
                client: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!assignments) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: assignments });
  } catch (error) {
    console.error('Get user assignments error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assignments' });
  }
});

// Assign user to client (admin only)
router.post('/assign-client', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, clientId } = req.body;

    if (!userId || !clientId) {
      res.status(400).json({ success: false, error: 'User ID and Client ID are required' });
      return;
    }

    const assignment = await prisma.userClient.create({
      data: { userId, clientId },
      include: {
        client: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (error: any) {
    console.error('Assign client error:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ success: false, error: 'User is already assigned to this client' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to assign client' });
    }
  }
});

// Remove user from client (admin only)
router.delete('/assign-client/:userId/:clientId', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, clientId } = req.params;

    await prisma.userClient.delete({
      where: {
        userId_clientId: { userId, clientId },
      },
    });

    res.json({ success: true, message: 'User removed from client' });
  } catch (error: any) {
    console.error('Remove client assignment error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Assignment not found' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to remove assignment' });
    }
  }
});

// Assign user to project (admin only)
router.post('/assign-project', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, projectId } = req.body;

    if (!userId || !projectId) {
      res.status(400).json({ success: false, error: 'User ID and Project ID are required' });
      return;
    }

    const assignment = await prisma.userProject.create({
      data: { userId, projectId },
      include: {
        project: {
          include: {
            client: { select: { id: true, name: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (error: any) {
    console.error('Assign project error:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ success: false, error: 'User is already assigned to this project' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to assign project' });
    }
  }
});

// Remove user from project (admin only)
router.delete('/assign-project/:userId/:projectId', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, projectId } = req.params;

    await prisma.userProject.delete({
      where: {
        userId_projectId: { userId, projectId },
      },
    });

    res.json({ success: true, message: 'User removed from project' });
  } catch (error: any) {
    console.error('Remove project assignment error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Assignment not found' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to remove assignment' });
    }
  }
});

export default router;
