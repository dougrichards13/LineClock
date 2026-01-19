import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all templates for current user
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    const templates = await prisma.timesheetTemplate.findMany({
      where: { userId },
      include: {
        entries: {
          orderBy: { dayOfWeek: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
});

// Create new template
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, isDefault, entries } = req.body;
    
    if (!name || !entries || !Array.isArray(entries)) {
      return res.status(400).json({ success: false, error: 'Name and entries are required' });
    }
    
    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.timesheetTemplate.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }
    
    const template = await prisma.timesheetTemplate.create({
      data: {
        userId,
        name,
        isDefault: isDefault || false,
        entries: {
          create: entries.map((entry: any) => ({
            dayOfWeek: entry.dayOfWeek,
            clientId: entry.clientId,
            projectId: entry.projectId,
            hoursWorked: entry.hoursWorked,
            description: entry.description
          }))
        }
      },
      include: {
        entries: true
      }
    });
    
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ success: false, error: 'Failed to create template' });
  }
});

// Update template
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { name, isDefault, entries } = req.body;
    
    // Check ownership
    const existing = await prisma.timesheetTemplate.findFirst({
      where: { id, userId }
    });
    
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.timesheetTemplate.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false }
      });
    }
    
    // Delete old entries and create new ones
    await prisma.timesheetTemplateEntry.deleteMany({
      where: { templateId: id }
    });
    
    const template = await prisma.timesheetTemplate.update({
      where: { id },
      data: {
        name,
        isDefault: isDefault || false,
        entries: {
          create: entries.map((entry: any) => ({
            dayOfWeek: entry.dayOfWeek,
            clientId: entry.clientId,
            projectId: entry.projectId,
            hoursWorked: entry.hoursWorked,
            description: entry.description
          }))
        }
      },
      include: {
        entries: true
      }
    });
    
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ success: false, error: 'Failed to update template' });
  }
});

// Delete template
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    
    // Check ownership
    const existing = await prisma.timesheetTemplate.findFirst({
      where: { id, userId }
    });
    
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    await prisma.timesheetTemplate.delete({
      where: { id }
    });
    
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
});

// Apply template to create time entries for a week
router.post('/:id/apply', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { weekStartDate } = req.body; // Monday of the week (YYYY-MM-DD)
    
    if (!weekStartDate) {
      return res.status(400).json({ success: false, error: 'weekStartDate is required' });
    }
    
    // Check ownership
    const template = await prisma.timesheetTemplate.findFirst({
      where: { id, userId },
      include: { entries: true }
    });
    
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    const startDate = new Date(weekStartDate);
    const timeEntries = [];
    
    // Create time entries for each template entry
    for (const entry of template.entries) {
      const entryDate = new Date(startDate);
      // Adjust to the correct day of week
      entryDate.setDate(startDate.getDate() + entry.dayOfWeek);
      
      const timeEntry = await prisma.timeEntry.create({
        data: {
          userId,
          clientId: entry.clientId,
          projectId: entry.projectId,
          date: entryDate,
          hoursWorked: entry.hoursWorked,
          description: entry.description,
          status: 'DRAFT'
        },
        include: {
          client: true,
          project: true
        }
      });
      
      timeEntries.push(timeEntry);
    }
    
    res.json({ success: true, data: timeEntries });
  } catch (error) {
    console.error('Apply template error:', error);
    res.status(500).json({ success: false, error: 'Failed to apply template' });
  }
});

export default router;
