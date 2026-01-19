import { EmailClient } from '@azure/communication-email';
import { SmsClient } from '@azure/communication-sms';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Azure Communication Services connection strings from environment
const EMAIL_CONNECTION_STRING = process.env.AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING || '';
const SMS_CONNECTION_STRING = process.env.AZURE_COMMUNICATION_SMS_CONNECTION_STRING || '';
const SENDER_EMAIL = process.env.SENDER_EMAIL || '[email protected]';
const SENDER_PHONE = process.env.SENDER_PHONE || '+1234567890';

interface EmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

interface SmsOptions {
  to: string;
  message: string;
}

interface NotificationOptions {
  userId: string;
  type: string;
  subject?: string;
  message: string;
  method?: 'EMAIL' | 'SMS' | 'BOTH';
}

class NotificationService {
  private emailClient: EmailClient | null = null;
  private smsClient: SmsClient | null = null;

  constructor() {
    // Initialize email client if connection string is provided
    if (EMAIL_CONNECTION_STRING) {
      this.emailClient = new EmailClient(EMAIL_CONNECTION_STRING);
    }

    // Initialize SMS client if connection string is provided
    if (SMS_CONNECTION_STRING) {
      this.smsClient = new SmsClient(SMS_CONNECTION_STRING);
    }
  }

  // Send email
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.emailClient) {
      console.warn('Email client not configured. Skipping email notification.');
      return false;
    }

    try {
      const poller = await this.emailClient.beginSend({
        senderAddress: SENDER_EMAIL,
        content: {
          subject: options.subject,
          plainText: options.textContent || '',
          html: options.htmlContent,
        },
        recipients: {
          to: [{ address: options.to }],
        },
      });

      const result = await poller.pollUntilDone();
      
      return result.status === 'Succeeded';
    } catch (error: any) {
      console.error('Failed to send email:', error.message);
      return false;
    }
  }

  // Send SMS
  async sendSms(options: SmsOptions): Promise<boolean> {
    if (!this.smsClient) {
      console.warn('SMS client not configured. Skipping SMS notification.');
      return false;
    }

    try {
      const results = await this.smsClient.send({
        from: SENDER_PHONE,
        to: [options.to],
        message: options.message,
      });

      // Check if message was sent successfully
      return results[0]?.successful || false;
    } catch (error: any) {
      console.error('Failed to send SMS:', error.message);
      return false;
    }
  }

  // Send notification based on user preference
  async sendNotification(options: NotificationOptions): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: options.userId },
      select: {
        email: true,
        phoneNumber: true,
        notificationPreference: true,
      },
    });

    if (!user) {
      console.error(`User ${options.userId} not found`);
      return;
    }

    const method = options.method || user.notificationPreference;
    const shouldSendEmail = method === 'EMAIL' || method === 'BOTH';
    const shouldSendSms = method === 'SMS' || method === 'BOTH';

    // Send email
    if (shouldSendEmail && user.email) {
      const htmlMessage = `<html><body>${options.message}</body></html>`;
      const emailSent = await this.sendEmail({
        to: user.email,
        subject: options.subject || 'LineClock Notification',
        htmlContent: htmlMessage,
        textContent: options.message,
      });

      await prisma.notificationLog.create({
        data: {
          userId: options.userId,
          type: options.type,
          method: 'EMAIL',
          recipient: user.email,
          subject: options.subject,
          message: options.message,
          status: emailSent ? 'SENT' : 'FAILED',
          sentAt: emailSent ? new Date() : undefined,
          failureReason: emailSent ? undefined : 'Email delivery failed',
        },
      });
    }

    // Send SMS
    if (shouldSendSms && user.phoneNumber) {
      const smsSent = await this.sendSms({
        to: user.phoneNumber,
        message: options.message,
      });

      await prisma.notificationLog.create({
        data: {
          userId: options.userId,
          type: options.type,
          method: 'SMS',
          recipient: user.phoneNumber,
          message: options.message,
          status: smsSent ? 'SENT' : 'FAILED',
          sentAt: smsSent ? new Date() : undefined,
          failureReason: smsSent ? undefined : 'SMS delivery failed',
        },
      });
    }
  }

  // Send overdue time entry reminder
  async sendOverdueTimeReminder(userId: string, weekEnding: Date): Promise<void> {
    const weekEndingStr = weekEnding.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    await this.sendNotification({
      userId,
      type: 'OVERDUE_TIME',
      subject: 'Reminder: Submit Your Time Entries',
      message: `Hi! This is a friendly reminder to submit your time entries for the week ending ${weekEndingStr}. Please log in to LineClock to complete your timesheet.`,
    });
  }

  // Send invoice ready notification to admin
  async sendInvoiceReadyNotification(adminId: string, batchId: string, clientCount: number): Promise<void> {
    await this.sendNotification({
      userId: adminId,
      type: 'INVOICE_READY',
      subject: 'Invoice Batch Ready for Review',
      message: `An invoice batch with ${clientCount} client(s) is ready for your review. Please review and approve the invoices in LineClock before submitting to Bill.com.`,
      method: 'EMAIL', // Always use email for admin notifications
    });
  }

  // Send invoice submission failure notification
  async sendInvoiceFailureNotification(adminId: string, clientName: string, error: string): Promise<void> {
    await this.sendNotification({
      userId: adminId,
      type: 'INVOICE_FAILED',
      subject: 'Invoice Submission Failed',
      message: `Failed to submit invoice for ${clientName} to Bill.com. Error: ${error}. Please check the invoice details and try again.`,
      method: 'EMAIL',
    });
  }

  // Send invoice submission success notification
  async sendInvoiceSuccessNotification(adminId: string, clientCount: number): Promise<void> {
    await this.sendNotification({
      userId: adminId,
      type: 'INVOICE_SUCCESS',
      subject: 'Invoices Successfully Submitted',
      message: `Successfully submitted ${clientCount} invoice(s) to Bill.com. Invoices have been sent to clients.`,
      method: 'EMAIL',
    });
  }

  // Check for overdue time entries and send reminders
  async checkOverdueTimeEntries(): Promise<void> {
    // Get the previous week's Friday (typical submission deadline)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToLastFriday = dayOfWeek >= 5 ? dayOfWeek - 5 : dayOfWeek + 2;
    const lastFriday = new Date(today);
    lastFriday.setDate(today.getDate() - daysToLastFriday);
    lastFriday.setHours(0, 0, 0, 0);

    const previousFriday = new Date(lastFriday);
    previousFriday.setDate(lastFriday.getDate() - 7);

    // Get all active employees (not hidden, role = EMPLOYEE)
    const employees = await prisma.user.findMany({
      where: {
        role: 'EMPLOYEE',
        isHidden: false,
      },
    });

    for (const employee of employees) {
      // Check if employee has submitted time for the previous week
      const timeEntries = await prisma.timeEntry.findMany({
        where: {
          userId: employee.id,
          date: {
            gte: previousFriday,
            lte: lastFriday,
          },
          status: {
            in: ['SUBMITTED', 'APPROVED'],
          },
        },
      });

      // If no time entries submitted, send reminder
      if (timeEntries.length === 0) {
        console.log(`Sending overdue time reminder to ${employee.name} for week ending ${lastFriday.toDateString()}`);
        await this.sendOverdueTimeReminder(employee.id, lastFriday);
      }
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
