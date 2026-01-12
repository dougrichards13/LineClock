import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, adminOnly } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();

// Get all vacation requests for current user
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const requests = await prisma.vacationRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: { name: true, email: true },
        },
      },
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Get vacation requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vacation requests' });
  }
});

// Create vacation request
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, reason } = req.body;
    const userId = req.user!.userId;

    if (!startDate || !endDate || !reason) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      res.status(400).json({ success: false, error: 'End date must be after start date' });
      return;
    }

    const request = await prisma.vacationRequest.create({
      data: {
        userId,
        startDate: start,
        endDate: end,
        reason,
        status: 'PENDING',
      },
    });

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    console.error('Create vacation request error:', error);
    res.status(500).json({ success: false, error: 'Failed to create vacation request' });
  }
});

// Admin: Get all vacation requests
router.get('/admin/all', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const requests = await prisma.vacationRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        reviewer: { select: { name: true, email: true } },
      },
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Get all vacation requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vacation requests' });
  }
});

// Admin: Get pending vacation requests
router.get('/admin/pending', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const requests = await prisma.vacationRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Get pending vacation requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending requests' });
  }
});

// Admin: Approve or reject vacation request
router.patch('/:id/review', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user!.userId;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid status' });
      return;
    }

    const request = await prisma.vacationRequest.update({
      where: { id },
      data: {
        status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
      include: {
        user: { select: { name: true, email: true } },
        reviewer: { select: { name: true, email: true } },
      },
    });

    res.json({ success: true, data: request });
  } catch (error) {
    console.error('Review vacation request error:', error);
    res.status(500).json({ success: false, error: 'Failed to review vacation request' });
  }
});

export default router;
