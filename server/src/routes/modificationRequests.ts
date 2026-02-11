import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get user's modification requests
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    const requests = await prisma.timeModificationRequest.findMany({
      where: { userId },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Get modification requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch modification requests' });
  }
});

// Get pending modification requests for approval (admin or supervisor)
router.get('/pending', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    
    // Build where clause: admins see all, supervisors see their direct reports' requests
    let whereClause: any = { status: 'PENDING' };
    
    if (userRole !== 'ADMIN') {
      // Non-admins only see requests where they are the approver
      whereClause.approverId = userId;
    }
    
    const requests = await prisma.timeModificationRequest.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Get pending modification requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending requests' });
  }
});

// Create modification request
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { weekStartDate, clientId, projectId, entries, reason } = req.body;
    
    if (!weekStartDate || !clientId || !projectId || !entries || !reason) {
      return res.status(400).json({ 
        success: false, 
        error: 'weekStartDate, clientId, projectId, entries, and reason are required' 
      });
    }
    
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'entries must be a non-empty array'
      });
    }
    
    // Check if request already exists for this week/client/project
    const existing = await prisma.timeModificationRequest.findFirst({
      where: {
        userId,
        weekStartDate: new Date(weekStartDate),
        clientId,
        projectId,
        status: 'PENDING'
      }
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'A modification request already exists for this week, client, and project'
      });
    }
    
    // Find the approver (user's direct supervisor, or first admin if no supervisor)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { reportsToId: true }
    });
    
    let approverId = user?.reportsToId;
    
    // If no direct supervisor, find an admin
    if (!approverId) {
      const admin = await prisma.user.findFirst({
        where: { 
          role: 'ADMIN',
          id: { not: userId }, // Don't assign to self
          isHidden: false
        },
        orderBy: { createdAt: 'asc' }
      });
      approverId = admin?.id || null;
    }
    
    const request = await prisma.timeModificationRequest.create({
      data: {
        userId,
        approverId,
        weekStartDate: new Date(weekStartDate),
        clientId,
        projectId,
        entries, // PostgreSQL handles JSON natively
        reason,
        status: 'PENDING'
      },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true, email: true } }
      }
    });
    
    res.json({ success: true, data: request });
  } catch (error) {
    console.error('Create modification request error:', error);
    res.status(500).json({ success: false, error: 'Failed to create modification request' });
  }
});

// Review modification request (approve/reject)
router.patch('/:id/review', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;
    const reviewerId = req.user!.userId;
    const reviewerRole = req.user!.role;
    
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Status must be APPROVED or REJECTED' 
      });
    }
    
    const request = await prisma.timeModificationRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, billableRate: true } },
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, billingRate: true } }
      }
    });
    
    if (!request) {
      return res.status(404).json({ success: false, error: 'Modification request not found' });
    }
    
    if (request.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only pending requests can be reviewed' 
      });
    }
    
    // Check authorization: must be admin or the assigned approver
    if (reviewerRole !== 'ADMIN' && request.approverId !== reviewerId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to review this request'
      });
    }
    
    // If approved, create the time entries
    if (status === 'APPROVED') {
      const entries = request.entries as Array<{ date: string; hours: number; description?: string }>;
      
      for (const entry of entries) {
        if (entry.hours > 0) {
          await prisma.timeEntry.create({
            data: {
              userId: request.userId,
              clientId: request.clientId,
              projectId: request.projectId,
              date: new Date(entry.date),
              hoursWorked: entry.hours,
              description: entry.description || null,
              status: 'APPROVED', // Auto-approve since supervisor already approved
              reviewedBy: reviewerId,
              reviewedAt: new Date(),
              consultantRate: request.user.billableRate,
              clientRate: request.project.billingRate,
              consultantAmount: request.user.billableRate ? request.user.billableRate * entry.hours : null,
              clientAmount: request.project.billingRate ? request.project.billingRate * entry.hours : null
            }
          });
        }
      }
    }
    
    const updated = await prisma.timeModificationRequest.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewNotes
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true, email: true } }
      }
    });
    
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Review modification request error:', error);
    res.status(500).json({ success: false, error: 'Failed to review modification request' });
  }
});

export default router;
