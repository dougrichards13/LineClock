import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, adminOnly } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();

// Get dashboard statistics
router.get('/stats', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const [pendingTimeEntries, pendingVacations, openQuestions, totalEmployees] = await Promise.all([
      prisma.timeEntry.count({ where: { status: 'SUBMITTED' } }),
      prisma.vacationRequest.count({ where: { status: 'PENDING' } }),
      prisma.question.count({ where: { status: 'OPEN' } }),
      prisma.user.count({ where: { role: 'EMPLOYEE' } }),
    ]);

    res.json({
      success: true,
      data: {
        pendingTimeEntries,
        pendingVacations,
        openQuestions,
        totalEmployees,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
