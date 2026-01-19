import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, adminOnly } from '../middleware/auth';
import prisma from '../utils/prisma';
import billComService from '../services/billcom';
import notificationService from '../services/notification';

const router = Router();

// Generate invoice batch from approved time entries
router.post('/batches/generate', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, notes } = req.body;
    const userId = req.user!.userId;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all APPROVED time entries in the date range
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        status: 'APPROVED',
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        user: true,
        client: true,
        project: true,
      },
      orderBy: [
        { clientId: 'asc' },
        { projectId: 'asc' },
        { userId: 'asc' },
        { date: 'asc' },
      ],
    });

    if (timeEntries.length === 0) {
      return res.status(400).json({ error: 'No approved time entries found in the specified date range' });
    }

    // Group time entries by client
    const clientGroups = new Map<string, any[]>();
    timeEntries.forEach((entry) => {
      if (!clientGroups.has(entry.clientId)) {
        clientGroups.set(entry.clientId, []);
      }
      clientGroups.get(entry.clientId)!.push(entry);
    });

    // Create invoice batch
    const batch = await prisma.invoiceBatch.create({
      data: {
        startDate: start,
        endDate: end,
        status: 'DRAFT',
        generatedBy: userId,
        notes,
      },
    });

    // Create invoices for each client
    const invoices = [];
    for (const [clientId, entries] of Array.from(clientGroups)) {
      const client = entries[0].client;
      
      // Group entries by employee and project
      const lineItemGroups = new Map<string, any[]>();
      entries.forEach((entry) => {
        const key = `${entry.userId}-${entry.projectId}`;
        if (!lineItemGroups.has(key)) {
          lineItemGroups.set(key, []);
        }
        lineItemGroups.get(key)!.push(entry);
      });

      // Calculate total hours and amount
      const totalHours = entries.reduce((sum, entry) => sum + entry.hoursWorked, 0);
      const totalAmount = entries.reduce((sum, entry) => sum + (entry.clientAmount || 0), 0);

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          batchId: batch.id,
          clientId,
          status: 'DRAFT',
          totalHours,
          totalAmount,
        },
      });

      // Create line items
      for (const [key, groupEntries] of Array.from(lineItemGroups)) {
        const employee = groupEntries[0].user;
        const project = groupEntries[0].project;
        const hours = groupEntries.reduce((sum, entry) => sum + entry.hoursWorked, 0);
        const amount = groupEntries.reduce((sum, entry) => sum + (entry.clientAmount || 0), 0);
        const rate = hours > 0 ? amount / hours : 0;

        const description = `${employee.name} - ${project.name} - ${hours} hours @ $${rate.toFixed(2)}/hr`;

        // Create line item for each time entry (or aggregated)
        await prisma.invoiceLineItem.create({
          data: {
            invoiceId: invoice.id,
            timeEntryId: groupEntries[0].id, // Link to first entry
            employeeName: employee.name,
            projectName: project.name,
            description,
            hours,
            amount,
            rate,
            date: groupEntries[0].date,
          },
        });
      }

      invoices.push(invoice);
    }

    // Send notification to admin
    await notificationService.sendInvoiceReadyNotification(
      userId,
      batch.id,
      clientGroups.size
    );

    // Return batch with invoices
    const batchWithInvoices = await prisma.invoiceBatch.findUnique({
      where: { id: batch.id },
      include: {
        invoices: {
          include: {
            client: true,
            lineItems: true,
          },
        },
      },
    });

    res.json({ success: true, data: batchWithInvoices });
  } catch (error: any) {
    console.error('Generate invoice batch error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate invoice batch' });
  }
});

// Get all invoice batches
router.get('/batches', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;

    const batches = await prisma.invoiceBatch.findMany({
      where: status ? { status: status as string } : undefined,
      include: {
        invoices: {
          include: {
            client: true,
            lineItems: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: batches });
  } catch (error: any) {
    console.error('Get invoice batches error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch invoice batches' });
  }
});

// Get single invoice batch
router.get('/batches/:batchId', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { batchId } = req.params;

    const batch = await prisma.invoiceBatch.findUnique({
      where: { id: batchId },
      include: {
        invoices: {
          include: {
            client: true,
            lineItems: {
              include: {
                timeEntry: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ error: 'Invoice batch not found' });
    }

    res.json({ success: true, data: batch });
  } catch (error: any) {
    console.error('Get invoice batch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch invoice batch' });
  }
});

// Update invoice (edit line items, notes, etc.)
router.patch('/invoices/:invoiceId', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const { notes, status } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Only allow editing DRAFT invoices
    if (invoice.status !== 'DRAFT' && status !== 'APPROVED') {
      return res.status(400).json({ error: 'Can only edit draft invoices' });
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        notes,
        status: status || invoice.status,
      },
      include: {
        client: true,
        lineItems: true,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: error.message || 'Failed to update invoice' });
  }
});

// Delete invoice line item
router.delete('/invoices/:invoiceId/line-items/:lineItemId', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId, lineItemId } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Can only edit draft invoices' });
    }

    await prisma.invoiceLineItem.delete({
      where: { id: lineItemId },
    });

    // Recalculate total hours
    const lineItems = await prisma.invoiceLineItem.findMany({
      where: { invoiceId },
    });

    const totalHours = lineItems.reduce((sum, item) => sum + item.hours, 0);

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { totalHours },
    });

    res.json({ success: true, message: 'Line item deleted' });
  } catch (error: any) {
    console.error('Delete line item error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete line item' });
  }
});

// Submit invoices to Bill.com
router.post('/batches/:batchId/submit', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { batchId } = req.params;
    const userId = req.user!.userId;

    const batch = await prisma.invoiceBatch.findUnique({
      where: { id: batchId },
      include: {
        invoices: {
          where: {
            status: 'APPROVED',
          },
          include: {
            client: {
              include: {
                billComMapping: true,
              },
            },
            lineItems: true,
          },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ error: 'Invoice batch not found' });
    }

    if (batch.invoices.length === 0) {
      return res.status(400).json({ error: 'No approved invoices to submit' });
    }

    let successCount = 0;
    let failureCount = 0;

    // Submit each invoice to Bill.com
    for (const invoice of batch.invoices) {
      try {
        // Check if client is mapped to Bill.com customer
        if (!invoice.client.billComMapping) {
          throw new Error(`Client ${invoice.client.name} is not mapped to a Bill.com customer`);
        }

        const billComCustomerId = invoice.client.billComMapping.billComCustomerId;

        // Prepare line items with rates and amounts
        const lineItems = invoice.lineItems.map((item) => ({
          description: item.description,
          quantity: item.hours,
          price: item.rate || 0,
          amount: item.amount || 0,
        }));

        // Calculate due date (30 days from now)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        // Create invoice in Bill.com
        const billComInvoice = await billComService.createInvoice({
          customerId: billComCustomerId,
          dueDate: dueDate.toISOString().split('T')[0],
          invoiceLineItems: lineItems,
          description: `Services for ${batch.startDate.toLocaleDateString()} - ${batch.endDate.toLocaleDateString()}`,
          sendEmail: true,
        });

        // v2 API returns data in response_data, v3 returns it at top level
        const invoiceResult = billComInvoice.response_data || billComInvoice;
        
        // Update invoice in database
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            billComInvoiceId: invoiceResult.id,
            invoiceNumber: invoiceResult.invoiceNumber,
            status: 'SUBMITTED',
            totalAmount: invoiceResult.amount || null,
            dueDate: invoiceResult.dueDate ? new Date(invoiceResult.dueDate) : null,
            submittedAt: new Date(),
          },
        });

        successCount++;
      } catch (error: any) {
        console.error(`Failed to submit invoice for ${invoice.client.name}:`, error.message);
        
        // Update invoice status to FAILED
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'FAILED',
            failureReason: error.message,
          },
        });

        // Send failure notification
        await notificationService.sendInvoiceFailureNotification(
          userId,
          invoice.client.name,
          error.message
        );

        failureCount++;
      }
    }

    // Update batch status
    const batchStatus = failureCount > 0 ? 'FAILED' : 'COMPLETED';
    await prisma.invoiceBatch.update({
      where: { id: batchId },
      data: {
        status: batchStatus,
        submittedAt: new Date(),
        completedAt: failureCount === 0 ? new Date() : undefined,
      },
    });

    // Send success notification if any succeeded
    if (successCount > 0) {
      await notificationService.sendInvoiceSuccessNotification(userId, successCount);
    }

    res.json({
      success: true,
      data: {
        successCount,
        failureCount,
        message: `Submitted ${successCount} invoice(s) successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      },
    });
  } catch (error: any) {
    console.error('Submit invoices error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit invoices' });
  }
});

// Get all invoices (with optional filters)
router.get('/invoices', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { status, clientId, startDate, endDate } = req.query;

    const invoices = await prisma.invoice.findMany({
      where: {
        status: status ? (status as string) : undefined,
        clientId: clientId ? (clientId as string) : undefined,
        createdAt: startDate && endDate ? {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        } : undefined,
      },
      include: {
        client: true,
        batch: true,
        lineItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: invoices });
  } catch (error: any) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch invoices' });
  }
});

// Get single invoice details
router.get('/invoices/:invoiceId', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true,
        batch: true,
        lineItems: {
          include: {
            timeEntry: {
              include: {
                user: true,
                project: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ success: true, data: invoice });
  } catch (error: any) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch invoice' });
  }
});

// Sync invoice status from Bill.com
router.post('/invoices/:invoiceId/sync', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.billComInvoiceId) {
      return res.status(400).json({ error: 'Invoice not yet submitted to Bill.com' });
    }

    // Get invoice from Bill.com
    const billComInvoice = await billComService.getInvoice(invoice.billComInvoiceId);

    // Update local invoice with Bill.com data
    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: billComInvoice.paymentStatus || invoice.status,
        totalAmount: billComInvoice.amount,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Sync invoice error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync invoice' });
  }
});

export default router;
