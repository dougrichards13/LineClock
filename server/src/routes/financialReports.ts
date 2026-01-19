import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, adminOnly } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();

// Get 1099 report for a user/year (admin only)
router.get('/1099/:userId/:year', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, year } = req.params;
    
    const yearStart = new Date(parseInt(year), 0, 1);
    const yearEnd = new Date(parseInt(year), 11, 31, 23, 59, 59);

    // Get direct billable earnings
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId,
        status: 'APPROVED',
        date: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
      select: {
        id: true,
        date: true,
        hoursWorked: true,
        consultantRate: true,
        consultantAmount: true,
        project: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Get FIP earnings
    const fipEarnings = await prisma.incentiveEarning.findMany({
      where: {
        leaderId: userId,
        createdAt: {
          gte: yearStart,
          lte: yearEnd,
        },
        timeEntry: {
          status: 'APPROVED',
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
        fractionalIncentive: {
          select: {
            incentiveRate: true,
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

    const directEarnings = timeEntries.reduce((sum, e) => sum + (e.consultantAmount || 0), 0);
    const fipTotal = fipEarnings.reduce((sum, e) => sum + e.incentiveAmount, 0);
    const totalIncome = directEarnings + fipTotal;

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        billableRate: true,
      },
    });

    res.json({
      success: true,
      data: {
        year: parseInt(year),
        user,
        directBillable: {
          entries: timeEntries,
          totalHours: timeEntries.reduce((sum, e) => sum + e.hoursWorked, 0),
          totalEarnings: directEarnings,
        },
        fipIncentives: {
          earnings: fipEarnings,
          totalHours: fipEarnings.reduce((sum, e) => sum + e.timeEntry.hoursWorked, 0),
          totalEarnings: fipTotal,
        },
        summary: {
          totalIncome,
          directEarnings,
          fipEarnings: fipTotal,
        },
      },
    });
  } catch (error: any) {
    console.error('Get 1099 report error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate 1099 report' });
  }
});

// Get project profitability report (admin only)
router.get('/project-profitability/:projectId', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    const where: any = {
      projectId,
      status: 'APPROVED',
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
          },
        },
        incentiveEarnings: {
          include: {
            leader: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: {
          select: {
            name: true,
          },
        },
      },
    });

    const totalHours = timeEntries.reduce((sum, e) => sum + e.hoursWorked, 0);
    const totalClientAmount = timeEntries.reduce((sum, e) => sum + (e.clientAmount || 0), 0);
    const totalConsultantAmount = timeEntries.reduce((sum, e) => sum + (e.consultantAmount || 0), 0);
    const totalFipAmount = timeEntries.reduce(
      (sum, e) => sum + e.incentiveEarnings.reduce((s, ie) => s + ie.incentiveAmount, 0),
      0
    );
    const totalMargin = timeEntries.reduce((sum, e) => sum + (e.smartFactoryMargin || 0), 0);

    // Group by consultant
    const byConsultant = timeEntries.reduce((acc: any, entry) => {
      const userName = entry.user.name;
      if (!acc[userName]) {
        acc[userName] = {
          hours: 0,
          clientAmount: 0,
          consultantAmount: 0,
          fipAmount: 0,
        };
      }
      acc[userName].hours += entry.hoursWorked;
      acc[userName].clientAmount += entry.clientAmount || 0;
      acc[userName].consultantAmount += entry.consultantAmount || 0;
      acc[userName].fipAmount += entry.incentiveEarnings.reduce((s, ie) => s + ie.incentiveAmount, 0);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        project,
        dateRange: {
          start: startDate || null,
          end: endDate || null,
        },
        summary: {
          totalHours,
          totalClientAmount,
          totalConsultantAmount,
          totalFipAmount,
          totalMargin,
          marginPercentage: totalClientAmount > 0 ? ((totalMargin / totalClientAmount) * 100).toFixed(2) : 0,
        },
        byConsultant,
        entries: timeEntries,
      },
    });
  } catch (error: any) {
    console.error('Get project profitability error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate profitability report' });
  }
});

// Get company-wide financial summary (admin only)
router.get('/company-summary', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {
      status: 'APPROVED',
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where,
      include: {
        project: {
          select: {
            name: true,
            client: {
              select: {
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    const totalHours = timeEntries.reduce((sum, e) => sum + e.hoursWorked, 0);
    const totalClientAmount = timeEntries.reduce((sum, e) => sum + (e.clientAmount || 0), 0);
    const totalConsultantAmount = timeEntries.reduce((sum, e) => sum + (e.consultantAmount || 0), 0);
    const totalMargin = timeEntries.reduce((sum, e) => sum + (e.smartFactoryMargin || 0), 0);

    // Group by project
    const byProject = timeEntries.reduce((acc: any, entry) => {
      const projectName = entry.project.name;
      if (!acc[projectName]) {
        acc[projectName] = {
          clientName: entry.project.client?.name,
          hours: 0,
          clientAmount: 0,
          consultantAmount: 0,
          margin: 0,
        };
      }
      acc[projectName].hours += entry.hoursWorked;
      acc[projectName].clientAmount += entry.clientAmount || 0;
      acc[projectName].consultantAmount += entry.consultantAmount || 0;
      acc[projectName].margin += entry.smartFactoryMargin || 0;
      return acc;
    }, {});

    // Group by client
    const byClient = timeEntries.reduce((acc: any, entry) => {
      const clientName = entry.project.client?.name || 'Unknown';
      if (!acc[clientName]) {
        acc[clientName] = {
          hours: 0,
          clientAmount: 0,
          margin: 0,
        };
      }
      acc[clientName].hours += entry.hoursWorked;
      acc[clientName].clientAmount += entry.clientAmount || 0;
      acc[clientName].margin += entry.smartFactoryMargin || 0;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        dateRange: {
          start: startDate || null,
          end: endDate || null,
        },
        summary: {
          totalHours,
          totalClientAmount,
          totalConsultantAmount,
          totalMargin,
          marginPercentage: totalClientAmount > 0 ? ((totalMargin / totalClientAmount) * 100).toFixed(2) : 0,
        },
        byProject,
        byClient,
      },
    });
  } catch (error: any) {
    console.error('Get company summary error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate company summary' });
  }
});

export default router;
