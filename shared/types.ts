// Shared TypeScript types for Smart Factory Time Entry System

export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  ADMIN = 'ADMIN',
}

export enum TimeEntryStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum VacationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum QuestionStatus {
  OPEN = 'OPEN',
  ANSWERED = 'ANSWERED',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  entraId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeEntry {
  id: string;
  userId: string;
  user?: User;
  date: Date;
  hoursWorked: number;
  description: string;
  status: TimeEntryStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface VacationRequest {
  id: string;
  userId: string;
  user?: User;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: VacationStatus;
  reviewedBy?: string;
  reviewedByUser?: User;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  userId: string;
  user?: User;
  question: string;
  answer?: string;
  answeredBy?: string;
  answeredByUser?: User;
  answeredAt?: Date;
  status: QuestionStatus;
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response types
export interface CreateTimeEntryRequest {
  date: string;
  hoursWorked: number;
  description: string;
}

export interface UpdateTimeEntryRequest {
  date?: string;
  hoursWorked?: number;
  description?: string;
  status?: TimeEntryStatus;
}

export interface CreateVacationRequestRequest {
  startDate: string;
  endDate: string;
  reason: string;
}

export interface UpdateVacationStatusRequest {
  status: VacationStatus;
}

export interface CreateQuestionRequest {
  question: string;
}

export interface AnswerQuestionRequest {
  answer: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  role: UserRole;
  entraId?: string;
}

export interface LoginRequest {
  email: string;
}

export interface EntraAuthResponse {
  accessToken: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export interface DashboardStats {
  pendingTimeEntries: number;
  pendingVacations: number;
  openQuestions: number;
  totalEmployees: number;
}
