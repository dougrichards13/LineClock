import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get user's overtime requests
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    const requests = await prisma.overtimeRequest.findMany({
      where: { userId },
      include: {
        reviewer: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Get overtime requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch overtime requests' });
  }
});

// Get all pending overtime requests (admin only)
router.get('/pending', authMiddleware, adminOnly, async (req, res) => {
  try {
    const requests = await prisma.overtimeRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Get pending overtime requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending requests' });
  }
});

// Create overtime request
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { weekStartDate, requestedHours, reason } = req.body;
    
    if (!weekStartDate || !requestedHours || !reason) {
      return res.status(400).json({ 
        success: false, 
        error: 'weekStartDate, requestedHours, and reason are required' 
      });
    }
    
    if (requestedHours <= 0 || requestedHours > 20) {
      return res.status(400).json({
        success: false,
        error: 'Requested hours must be between 0 and 20'
      });
    }
    
    // Check if request already exists for this week
    const existing = await prisma.overtimeRequest.findFirst({
      where: {
        userId,
        weekStartDate: new Date(weekStartDate),
        status: { in: ['PENDING', 'APPROVED'] }
      }
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'An overtime request already exists for this week'
      });
    }
    
    const request = await prisma.overtimeRequest.create({
      data: {
        userId,
        weekStartDate: new Date(weekStartDate),
        requestedHours: parseFloat(requestedHours),
        reason,
        status: 'PENDING'
      }
    });
    
    res.json({ success: true, data: request });
  } catch (error) {
    console.error('Create overtime request error:', error);
    res.status(500).json({ success: false, error: 'Failed to create overtime request' });
  }
});

// Review overtime request (admin only)
router.patch('/:id/review', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;
    
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Status must be APPROVED or REJECTED' 
      });
    }
    
    const request = await prisma.overtimeRequest.findUnique({
      where: { id }
    });
    
    if (!request) {
      return res.status(404).json({ success: false, error: 'Overtime request not found' });
    }
    
    if (request.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only pending requests can be reviewed' 
      });
    }
    
    const updated = await prisma.overtimeRequest.update({
      where: { id },
      data: {
        status,
        reviewedBy: req.user!.userId,
        reviewedAt: new Date(),
        reviewNotes
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        reviewer: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Review overtime request error:', error);
    res.status(500).json({ success: false, error: 'Failed to review overtime request' });
  }
});

// Check if overtime is allowed for a week
router.post('/check-hours', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { weekStartDate, additionalHours } = req.body;
    
    if (!weekStartDate) {
      return res.status(400).json({ success: false, error: 'weekStartDate is required' });
    }
    
    const startDate = new Date(weekStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    
    // Get total hours for the week
    const entries = await prisma.timeEntry.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lt: endDate
        },
        status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED'] }
      }
    });
    
    const totalHours = entries.reduce((sum, entry) => sum + entry.hoursWorked, 0);
    const projectedTotal = totalHours + (additionalHours || 0);
    
    // Check for approved overtime request
    const overtimeRequest = await prisma.overtimeRequest.findFirst({
      where: {
        userId,
        weekStartDate: startDate,
        status: 'APPROVED'
      }
    });
    
    const maxAllowedHours = 40 + (overtimeRequest?.requestedHours || 0);
    const canAddHours = projectedTotal <= maxAllowedHours;
    const hoursRemaining = maxAllowedHours - totalHours;
    
    res.json({
      success: true,
      data: {
        totalHours,
        projectedTotal,
        maxAllowedHours,
        canAddHours,
        hoursRemaining,
        overtimeApproved: !!overtimeRequest,
        overtimeHours: overtimeRequest?.requestedHours || 0
      }
    });
  } catch (error) {
    console.error('Check hours error:', error);
    res.status(500).json({ success: false, error: 'Failed to check hours' });
  }
});

export default router;
