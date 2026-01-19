import axios, { AxiosInstance } from 'axios';
import { PrismaClient } from '@prisma/client';
import CryptoJS from 'crypto-js';

const prisma = new PrismaClient();

// Encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

// Bill.com API endpoints
// v3 API for sandbox, v2 API for production (v3 production not available)
const BILLCOM_SANDBOX_URL = 'https://gateway.stage.bill.com/connect/v3';
const BILLCOM_PRODUCTION_URL = 'https://api.bill.com/api/v2';

// API versions differ between sandbox and production
const isV3API = (environment: string) => environment !== 'PRODUCTION';

interface BillComCredentials {
  devKey: string;
  username: string;
  password: string;
  organizationId: string;
  environment: 'SANDBOX' | 'PRODUCTION';
}

interface BillComSession {
  sessionId: string;
  userId: string;
  organizationId: string;
}

interface InvoiceLineItem {
  amount?: number;
  quantity?: number;
  description: string;
  rate?: number;
}

interface CreateInvoiceRequest {
  customerId: string;
  invoiceNumber?: string;
  dueDate?: string;
  invoiceDate?: string;
  invoiceLineItems: InvoiceLineItem[];
  description?: string;
  sendEmail?: boolean;
}

class BillComService {
  private axiosInstance: AxiosInstance;
  private sessionId: string | null = null;
  private sessionExpiry: Date | null = null;
  private config: any = null;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Encryption helpers
  private encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  }

  private decrypt(encryptedText: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  // Get Bill.com API base URL based on environment
  private getBaseUrl(environment: string): string {
    return environment === 'PRODUCTION' ? BILLCOM_PRODUCTION_URL : BILLCOM_SANDBOX_URL;
  }

  // Load config from database
  private async loadConfig(): Promise<void> {
    if (this.config) return;

    const config = await prisma.billComConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!config) {
      throw new Error('Bill.com configuration not found. Please set up Bill.com credentials in admin settings.');
    }

    this.config = config;

    // Check if we have a valid session
    if (config.sessionId && config.sessionExpiry) {
      const now = new Date();
      const expiry = new Date(config.sessionExpiry);
      
      // If session is still valid (with 5 min buffer)
      if (expiry.getTime() - now.getTime() > 5 * 60 * 1000) {
        this.sessionId = config.sessionId;
        this.sessionExpiry = expiry;
      }
    }
  }

  // Authenticate with Bill.com
  async login(): Promise<BillComSession> {
    await this.loadConfig();

    // If we have a valid session, return it
    if (this.sessionId && this.sessionExpiry && new Date() < this.sessionExpiry) {
      console.log('✅ Using cached Bill.com session');
      return {
        sessionId: this.sessionId!,
        userId: '',
        organizationId: this.decrypt(this.config.organizationId),
      };
    }

    // Otherwise, login
    const credentials: BillComCredentials = {
      devKey: this.decrypt(this.config.devKey),
      username: this.decrypt(this.config.username),
      password: this.decrypt(this.config.password),
      organizationId: this.decrypt(this.config.organizationId),
      environment: this.config.environment as 'SANDBOX' | 'PRODUCTION',
    };

    const baseUrl = this.getBaseUrl(credentials.environment);
    const isV3 = isV3API(credentials.environment);
    console.log('🔑 Logging in to Bill.com...');
    console.log('Environment:', credentials.environment);
    console.log('API Version:', isV3 ? 'v3' : 'v2');
    console.log('Base URL:', baseUrl);
    console.log('Organization ID:', credentials.organizationId);

    try {
      let response;
      
      if (isV3) {
        // v3 API uses JSON and /login endpoint
        response = await this.axiosInstance.post(`${baseUrl}/login`, {
          username: credentials.username,
          password: credentials.password,
          organizationId: credentials.organizationId,
          devKey: credentials.devKey,
        });
      } else {
        // v2 API uses form-encoded data and /Login.json endpoint
        const params = new URLSearchParams();
        params.append('userName', credentials.username);
        params.append('password', credentials.password);
        params.append('orgId', credentials.organizationId);
        params.append('devKey', credentials.devKey);
        
        response = await this.axiosInstance.post(`${baseUrl}/Login.json`, params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
      }
      
      console.log('✅ Bill.com login response status:', response.status);
      console.log('Response data:', response.data);

      // v2 API returns sessionId in response_data, v3 returns it at top level
      const sessionId = response.data.sessionId || response.data.response_data?.sessionId;
      const userId = response.data.userId || response.data.response_data?.usersId;
      
      if (sessionId) {
        this.sessionId = sessionId;
        
        // Sessions expire after 35 minutes of inactivity
        this.sessionExpiry = new Date(Date.now() + 35 * 60 * 1000);

        // Save session to database
        await prisma.billComConfig.update({
          where: { id: this.config.id },
          data: {
            sessionId: this.sessionId,
            sessionExpiry: this.sessionExpiry,
          },
        });

        console.log('✅ Session saved:', this.sessionId?.substring(0, 10) + '...');
        return {
          sessionId: this.sessionId!,
          userId: userId || '',
          organizationId: credentials.organizationId,
        };
      }

      throw new Error('Failed to authenticate with Bill.com: No session ID returned');
    } catch (error: any) {
      console.error('Bill.com login error:', error.response?.data || error.message);
      throw new Error(`Bill.com authentication failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Get customers from Bill.com
  async getCustomers(): Promise<any[]> {
    await this.loadConfig();
    const session = await this.login();
    const baseUrl = this.getBaseUrl(this.config.environment);
    const isV3 = isV3API(this.config.environment);

    console.log('👥 Fetching customers from Bill.com...');
    console.log('API Version:', isV3 ? 'v3' : 'v2');

    try {
      let response;
      
      if (isV3) {
        // v3 API: GET /customers with headers
        console.log('URL:', `${baseUrl}/customers`);
        response = await this.axiosInstance.get(`${baseUrl}/customers`, {
          headers: {
            devKey: this.decrypt(this.config.devKey),
            sessionId: session.sessionId!,
          },
        });
      } else {
        // v2 API: POST /List/Customer.json to list all customers
        // v2 requires start/max inside a 'data' JSON parameter
        console.log('URL:', `${baseUrl}/List/Customer.json`);
        const params = new URLSearchParams();
        params.append('devKey', this.decrypt(this.config.devKey));
        params.append('sessionId', session.sessionId!);
        params.append('data', JSON.stringify({ start: 0, max: 999 }));
        
        console.log('📝 Params being sent:', params.toString());
        
        response = await this.axiosInstance.post(`${baseUrl}/List/Customer.json`, params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
      }

      console.log('✅ Bill.com customers response status:', response.status);
      console.log('Response data keys:', Object.keys(response.data));
      console.log('Raw response:', JSON.stringify(response.data, null, 2));

      // v3 returns 'results', v2 might return 'response_data'
      const customers = response.data.results || response.data.response_data || response.data.customers || [];
      console.log(`Found ${Array.isArray(customers) ? customers.length : 'non-array'} customers`);
      return Array.isArray(customers) ? customers : [];
    } catch (error: any) {
      console.error('Bill.com get customers error:', error.response?.data || error.message);
      
      // If session expired, try re-login
      if (error.response?.status === 401) {
        this.sessionId = null;
        return this.getCustomers(); // Retry
      }
      
      throw new Error(`Failed to fetch customers: ${error.response?.data?.message || error.message}`);
    }
  }

  // Create invoice in Bill.com
  async createInvoice(invoiceData: CreateInvoiceRequest): Promise<any> {
    await this.loadConfig();
    const session = await this.login();
    const baseUrl = this.getBaseUrl(this.config.environment);
    const isV3 = isV3API(this.config.environment);

    console.log('📧 Creating invoice in Bill.com...');
    console.log('API Version:', isV3 ? 'v3' : 'v2');

    try {
      let response;
      
      if (isV3) {
        // v3 API: POST /invoices with JSON body
        response = await this.axiosInstance.post(
          `${baseUrl}/invoices`,
          {
            customerId: invoiceData.customerId,
            invoiceNumber: invoiceData.invoiceNumber,
            dueDate: invoiceData.dueDate,
            invoiceDate: invoiceData.invoiceDate || new Date().toISOString().split('T')[0],
            description: invoiceData.description,
            invoiceLineItems: invoiceData.invoiceLineItems,
            sendEmail: invoiceData.sendEmail || false,
          },
          {
            headers: {
              devKey: this.decrypt(this.config.devKey),
              sessionId: session.sessionId,
            },
          }
        );
      } else {
        // v2 API: POST /Crud/Create/Invoice.json with form data
        // Generate invoice number if not provided (INV-YYYYMMDD-XXXXX)
        const invoiceNumber = invoiceData.invoiceNumber || 
          `INV-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        
        const invoiceObj = {
          entity: 'Invoice',
          customerId: invoiceData.customerId,
          invoiceNumber: invoiceNumber,
          invoiceDate: invoiceData.invoiceDate || new Date().toISOString().split('T')[0],
          dueDate: invoiceData.dueDate,
          description: invoiceData.description,
          invoiceLineItems: invoiceData.invoiceLineItems.map(item => ({
            entity: 'InvoiceLineItem',
            quantity: item.quantity || 1,
            amount: item.amount,
            description: item.description,
            ratePercent: item.rate,
          })),
        };
        
        const params = new URLSearchParams();
        params.append('devKey', this.decrypt(this.config.devKey));
        params.append('sessionId', session.sessionId!);
        params.append('data', JSON.stringify({ obj: invoiceObj }));
        
        console.log('Creating v2 invoice with data:', JSON.stringify(invoiceObj, null, 2));
        
        response = await this.axiosInstance.post(`${baseUrl}/Crud/Create/Invoice.json`, params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
      }

      console.log('✅ Invoice created:', response.data);
      
      // Check for v2 API errors (response_status: 1 means error)
      if (response.data.response_status === 1) {
        const errorMsg = response.data.response_data?.error_message || response.data.response_message || 'Unknown error';
        throw new Error(`Bill.com API error: ${errorMsg}`);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Bill.com create invoice error:', error.response?.data || error.message);
      
      // If session expired, try re-login
      if (error.response?.status === 401) {
        this.sessionId = null;
        return this.createInvoice(invoiceData); // Retry
      }
      
      throw new Error(`Failed to create invoice: ${error.response?.data?.message || error.message}`);
    }
  }

  // Get invoice details from Bill.com
  async getInvoice(invoiceId: string): Promise<any> {
    await this.loadConfig();
    const session = await this.login();
    const baseUrl = this.getBaseUrl(this.config.environment);

    try {
      const response = await this.axiosInstance.get(`${baseUrl}/invoices/${invoiceId}`, {
        headers: {
          devKey: this.decrypt(this.config.devKey),
          sessionId: session.sessionId,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Bill.com get invoice error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        this.sessionId = null;
        return this.getInvoice(invoiceId); // Retry
      }
      
      throw new Error(`Failed to fetch invoice: ${error.response?.data?.message || error.message}`);
    }
  }

  // Send invoice email via Bill.com
  async sendInvoiceEmail(invoiceId: string, recipientEmails: string[], replyToUserId?: string): Promise<void> {
    await this.loadConfig();
    const session = await this.login();
    const baseUrl = this.getBaseUrl(this.config.environment);

    try {
      await this.axiosInstance.post(
        `${baseUrl}/invoices/${invoiceId}/email`,
        {
          replyTo: replyToUserId ? { userId: replyToUserId } : undefined,
          recipient: {
            to: recipientEmails,
          },
        },
        {
          headers: {
            devKey: this.decrypt(this.config.devKey),
            sessionId: session.sessionId,
          },
        }
      );
    } catch (error: any) {
      console.error('Bill.com send invoice email error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        this.sessionId = null;
        return this.sendInvoiceEmail(invoiceId, recipientEmails, replyToUserId); // Retry
      }
      
      throw new Error(`Failed to send invoice email: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test connection with Bill.com
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const session = await this.login();
      return {
        success: true,
        message: 'Successfully connected to Bill.com',
        data: {
          organizationId: session.organizationId,
          environment: this.config.environment,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Save or update Bill.com credentials
  async saveCredentials(credentials: BillComCredentials): Promise<void> {
    // Encrypt sensitive data
    const encryptedData = {
      devKey: this.encrypt(credentials.devKey),
      username: this.encrypt(credentials.username),
      password: this.encrypt(credentials.password),
      organizationId: this.encrypt(credentials.organizationId),
      environment: credentials.environment,
      isActive: true,
    };

    // Deactivate existing configs
    await prisma.billComConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new config
    await prisma.billComConfig.create({
      data: encryptedData,
    });

    // Clear cached config
    this.config = null;
    this.sessionId = null;
  }
}

// Export singleton instance
export const billComService = new BillComService();
export default billComService;
