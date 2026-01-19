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
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        reviewer: { select: { name: true, email: true } },
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
    const { date, hoursWorked, description, clientId, projectId } = req.body;
    const userId = req.user!.userId;

    if (!date || !hoursWorked || !clientId || !projectId) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    // Fetch user's billable rate and project's billing rate
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { billableRate: true },
    });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { billingRate: true },
    });

    const hours = parseFloat(hoursWorked);
    const consultantRate = user?.billableRate || 0;
    const clientRate = project?.billingRate || 0;
    const consultantAmount = hours * consultantRate;
    const clientAmount = hours * clientRate;

    // Find active FIP assignments for this consultant
    const fipAssignments = await prisma.fractionalIncentive.findMany({
      where: {
        consultantId: userId,
        isActive: true,
        startDate: { lte: new Date(date) },
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: new Date(date) } },
            ],
          },
          {
            OR: [
              { projectId: null }, // Global FIP (applies to all projects)
              { projectId: projectId }, // Project-specific FIP
            ],
          },
        ],
      },
    });

    // Calculate total FIP amounts
    const totalFipAmount = fipAssignments.reduce(
      (sum, fip) => sum + (hours * fip.incentiveRate),
      0
    );

    // Calculate Smart Factory margin
    const smartFactoryMargin = clientAmount - consultantAmount - totalFipAmount;

    // Create time entry with financial data
    const entry = await prisma.timeEntry.create({
      data: {
        userId,
        clientId,
        projectId,
        date: new Date(date),
        hoursWorked: hours,
        description: description || null,
        status: 'DRAFT',
        consultantRate,
        clientRate,
        consultantAmount,
        clientAmount,
        smartFactoryMargin,
      },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // Create IncentiveEarning records for each FIP assignment
    if (fipAssignments.length > 0) {
      await prisma.incentiveEarning.createMany({
        data: fipAssignments.map(fip => ({
          timeEntryId: entry.id,
          fractionalIncentiveId: fip.id,
          leaderId: fip.leaderId,
          incentiveRate: fip.incentiveRate,
          incentiveAmount: hours * fip.incentiveRate,
        })),
      });
    }

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
    const { date, hoursWorked, description, status, clientId, projectId } = req.body;
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
    if (description !== undefined) updateData.description = description || null;
    if (status) updateData.status = status;
    if (clientId) updateData.clientId = clientId;
    if (projectId) updateData.projectId = projectId;

    // If hours, client, or project changed, recalculate financial data
    if (hoursWorked || clientId || projectId) {
      const hours = hoursWorked ? parseFloat(hoursWorked) : existing.hoursWorked;
      const finalProjectId = projectId || existing.projectId;

      // Fetch user's billable rate and project's billing rate
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { billableRate: true },
      });

      const project = await prisma.project.findUnique({
        where: { id: finalProjectId },
        select: { billingRate: true },
      });

      const consultantRate = user?.billableRate || 0;
      const clientRate = project?.billingRate || 0;
      const consultantAmount = hours * consultantRate;
      const clientAmount = hours * clientRate;

      // Find active FIP assignments
      const fipAssignments = await prisma.fractionalIncentive.findMany({
        where: {
          consultantId: userId,
          isActive: true,
          startDate: { lte: updateData.date || existing.date },
          AND: [
            {
              OR: [
                { endDate: null },
                { endDate: { gte: updateData.date || existing.date } },
              ],
            },
            {
              OR: [
                { projectId: null },
                { projectId: finalProjectId },
              ],
            },
          ],
        },
      });

      const totalFipAmount = fipAssignments.reduce(
        (sum, fip) => sum + (hours * fip.incentiveRate),
        0
      );

      const smartFactoryMargin = clientAmount - consultantAmount - totalFipAmount;

      updateData.consultantRate = consultantRate;
      updateData.clientRate = clientRate;
      updateData.consultantAmount = consultantAmount;
      updateData.clientAmount = clientAmount;
      updateData.smartFactoryMargin = smartFactoryMargin;

      // Delete old FIP earnings and recreate
      await prisma.incentiveEarning.deleteMany({
        where: { timeEntryId: id },
      });

      if (fipAssignments.length > 0) {
        await prisma.incentiveEarning.createMany({
          data: fipAssignments.map(fip => ({
            timeEntryId: id,
            fractionalIncentiveId: fip.id,
            leaderId: fip.leaderId,
            incentiveRate: fip.incentiveRate,
            incentiveAmount: hours * fip.incentiveRate,
          })),
        });
      }
    }

    const entry = await prisma.timeEntry.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
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
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
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
