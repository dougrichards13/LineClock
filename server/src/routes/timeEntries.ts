import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, adminOnly } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();

// Get all time entries for current user
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const entries = await prisma.timeEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: {
        reviewer: {
          select: { name: true, email: true },
        },
      },
    });

    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch time entries' });
  }
});

// Get single time entry
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';

    const entry = await prisma.timeEntry.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        reviewer: { select: { name: true, email: true } },
      },
    });

    if (!entry) {
      res.status(404).json({ success: false, error: 'Time entry not found' });
      return;
    }

    // Only owner or admin can view
    if (entry.userId !== userId && !isAdmin) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('Get time entry error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch time entry' });
  }
});

// Create time entry
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { date, hoursWorked, description } = req.body;
    const userId = req.user!.userId;

    if (!date || !hoursWorked || !description) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    const entry = await prisma.timeEntry.create({
      data: {
        userId,
        date: new Date(date),
        hoursWorked: parseFloat(hoursWorked),
        description,
        status: 'DRAFT',
      },
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('Create time entry error:', error);
    res.status(500).json({ success: false, error: 'Failed to create time entry' });
  }
});

// Update time entry
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { date, hoursWorked, description, status } = req.body;
    const userId = req.user!.userId;

    const existing = await prisma.timeEntry.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Time entry not found' });
      return;
    }

    // Only owner can edit their own entries, and only if draft or submitted
    if (existing.userId !== userId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    if (existing.status === 'APPROVED' || existing.status === 'REJECTED') {
      res.status(400).json({ success: false, error: 'Cannot edit approved or rejected entries' });
      return;
    }

    const updateData: any = {};
    if (date) updateData.date = new Date(date);
    if (hoursWorked) updateData.hoursWorked = parseFloat(hoursWorked);
    if (description) updateData.description = description;
    if (status) updateData.status = status;

    const entry = await prisma.timeEntry.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('Update time entry error:', error);
    res.status(500).json({ success: false, error: 'Failed to update time entry' });
  }
});

// Delete time entry (only drafts)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const existing = await prisma.timeEntry.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Time entry not found' });
      return;
    }

    if (existing.userId !== userId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    if (existing.status !== 'DRAFT') {
      res.status(400).json({ success: false, error: 'Can only delete draft entries' });
      return;
    }

    await prisma.timeEntry.delete({ where: { id } });

    res.json({ success: true, message: 'Time entry deleted' });
  } catch (error) {
    console.error('Delete time entry error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete time entry' });
  }
});

// Admin: Get all pending time entries
router.get('/admin/pending', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const entries = await prisma.timeEntry.findMany({
      where: { status: 'SUBMITTED' },
      orderBy: { date: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('Get pending entries error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending entries' });
  }
});

// Admin: Approve or reject time entry
router.patch('/:id/review', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user!.userId;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid status' });
      return;
    }

    const entry = await prisma.timeEntry.update({
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

    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('Review time entry error:', error);
    res.status(500).json({ success: false, error: 'Failed to review time entry' });
  }
});

export default router;
