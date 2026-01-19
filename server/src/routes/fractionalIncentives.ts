import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, adminOnly } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();

// Get all FIP assignments (admin only)
router.get('/', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { isActive } = req.query;
    
    const assignments = await prisma.fractionalIncentive.findMany({
      where: {
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        consultant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            client: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ success: true, data: assignments });
  } catch (error: any) {
    console.error('Get FIP assignments error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch FIP assignments' });
  }
});

// Get user's FIP info (earnings and assignments)
router.get('/my-incentives', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Get assignments where user is the leader
    const asLeader = await prisma.fractionalIncentive.findMany({
      where: {
        leaderId: userId,
        isActive: true,
      },
      include: {
        consultant: {
          select: {
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get assignments where user is the consultant
    const asConsultant = await prisma.fractionalIncentive.findMany({
      where: {
        consultantId: userId,
        isActive: true,
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get earnings for current year
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const earnings = await prisma.incentiveEarning.findMany({
      where: {
        leaderId: userId,
        createdAt: {
          gte: yearStart,
        },
      },
      include: {
        timeEntry: {
          select: {
            date: true,
            hoursWorked: true,
            user: {
              select: {
                name: true,
              },
            },
            project: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalEarnings = earnings.reduce((sum, e) => sum + e.incentiveAmount, 0);

    res.json({
      success: true,
      data: {
        asLeader,
        asConsultant,
        earnings,
        totalEarnings,
      },
    });
  } catch (error: any) {
    console.error('Get my incentives error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch incentives' });
  }
});

// Create FIP assignment (admin only)
router.post('/', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { leaderId, consultantId, projectId, incentiveRate, startDate, endDate } = req.body;

    if (!leaderId || !consultantId || !incentiveRate || !startDate) {
      return res.status(400).json({ error: 'Leader, consultant, incentive rate, and start date are required' });
    }

    if (leaderId === consultantId) {
      return res.status(400).json({ error: 'Leader and consultant cannot be the same person' });
    }

    // Normalize projectId to null if it's an empty string or undefined
    const normalizedProjectId = projectId && projectId !== '' ? projectId : null;

    // Validate that leader and consultant exist
    const [leader, consultant] = await Promise.all([
      prisma.user.findUnique({ where: { id: leaderId } }),
      prisma.user.findUnique({ where: { id: consultantId } }),
    ]);

    if (!leader) {
      return res.status(400).json({ error: 'Leader user not found' });
    }
    if (!consultant) {
      return res.status(400).json({ error: 'Consultant user not found' });
    }

    // If projectId is provided, validate it exists
    if (normalizedProjectId) {
      const project = await prisma.project.findUnique({ where: { id: normalizedProjectId } });
      if (!project) {
        return res.status(400).json({ error: 'Project not found' });
      }
    }

    // Check if assignment already exists
    const existing = await prisma.fractionalIncentive.findUnique({
      where: {
        leaderId_consultantId_projectId: {
          leaderId,
          consultantId,
          projectId: normalizedProjectId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'This FIP assignment already exists' });
    }

    const assignment = await prisma.fractionalIncentive.create({
      data: {
        leaderId,
        consultantId,
        projectId: normalizedProjectId,
        incentiveRate: parseFloat(incentiveRate),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true,
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        consultant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ success: true, data: assignment });
  } catch (error: any) {
    console.error('Create FIP assignment error:', error);
    res.status(500).json({ error: error.message || 'Failed to create FIP assignment' });
  }
});

// Update FIP assignment (admin only)
router.put('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { incentiveRate, endDate, isActive } = req.body;

    const assignment = await prisma.fractionalIncentive.update({
      where: { id },
      data: {
        incentiveRate: incentiveRate ? parseFloat(incentiveRate) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
          },
        },
        consultant: {
          select: {
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ success: true, data: assignment });
  } catch (error: any) {
    console.error('Update FIP assignment error:', error);
    res.status(500).json({ error: error.message || 'Failed to update FIP assignment' });
  }
});

// Delete FIP assignment (admin only)
router.delete('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.fractionalIncentive.delete({
      where: { id },
    });

    res.json({ success: true, message: 'FIP assignment deleted' });
  } catch (error: any) {
    console.error('Delete FIP assignment error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete FIP assignment' });
  }
});

// Get FIP earnings for a user/year (for 1099 reporting)
router.get('/earnings/:userId/:year', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, year } = req.params;
    
    const yearStart = new Date(parseInt(year), 0, 1);
    const yearEnd = new Date(parseInt(year), 11, 31, 23, 59, 59);

    const earnings = await prisma.incentiveEarning.findMany({
      where: {
        leaderId: userId,
        createdAt: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
      include: {
        timeEntry: {
          select: {
            date: true,
            hoursWorked: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        fractionalIncentive: {
          select: {
            consultant: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const totalEarnings = earnings.reduce((sum, e) => sum + e.incentiveAmount, 0);
    const totalHours = earnings.reduce((sum, e) => sum + e.timeEntry.hoursWorked, 0);

    res.json({
      success: true,
      data: {
        year: parseInt(year),
        earnings,
        summary: {
          totalEarnings,
          totalHours,
          entriesCount: earnings.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Get FIP earnings error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch FIP earnings' });
  }
});

export default router;
