
import { z } from 'zod';

// Enums
export const itemTypeEnum = z.enum(['digital_book', 'laboratory_equipment', 'furniture', 'it_asset']);
export const userRoleEnum = z.enum(['admin', 'teacher', 'student']);
export const borrowingStatusEnum = z.enum(['active', 'returned', 'overdue']);

// Admin schema
export const adminSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  created_at: z.coerce.date()
});

export type Admin = z.infer<typeof adminSchema>;

// Inventory item schema
export const inventoryItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  item_type: itemTypeEnum,
  label_code: z.string(), // Unique identifier for easy return identification
  quantity_total: z.number().int(),
  quantity_available: z.number().int(),
  location: z.string().nullable(),
  purchase_date: z.coerce.date().nullable(),
  purchase_price: z.number().nullable(),
  condition_notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;

// User schema (teachers and students)
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  role: userRoleEnum,
  student_id: z.string().nullable(), // For students
  department: z.string().nullable(), // For teachers
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Borrowing record schema
export const borrowingRecordSchema = z.object({
  id: z.number(),
  item_id: z.number(),
  user_id: z.number(),
  quantity_borrowed: z.number().int(),
  borrowed_date: z.coerce.date(),
  due_date: z.coerce.date(),
  returned_date: z.coerce.date().nullable(),
  status: borrowingStatusEnum,
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type BorrowingRecord = z.infer<typeof borrowingRecordSchema>;

// Input schemas for creating/updating
export const createAdminInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6)
});

export type CreateAdminInput = z.infer<typeof createAdminInputSchema>;

export const adminLoginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type AdminLoginInput = z.infer<typeof adminLoginInputSchema>;

export const createInventoryItemInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  item_type: itemTypeEnum,
  label_code: z.string().min(1),
  quantity_total: z.number().int().positive(),
  location: z.string().nullable(),
  purchase_date: z.coerce.date().nullable(),
  purchase_price: z.number().positive().nullable(),
  condition_notes: z.string().nullable()
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemInputSchema>;

export const updateInventoryItemInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  item_type: itemTypeEnum.optional(),
  label_code: z.string().min(1).optional(),
  quantity_total: z.number().int().positive().optional(),
  location: z.string().nullable().optional(),
  purchase_date: z.coerce.date().nullable().optional(),
  purchase_price: z.number().positive().nullable().optional(),
  condition_notes: z.string().nullable().optional()
});

export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemInputSchema>;

export const createUserInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: userRoleEnum,
  student_id: z.string().nullable(),
  department: z.string().nullable()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createBorrowingRecordInputSchema = z.object({
  item_id: z.number(),
  user_id: z.number(),
  quantity_borrowed: z.number().int().positive(),
  borrowing_duration_days: z.number().int().positive(),
  notes: z.string().nullable()
});

export type CreateBorrowingRecordInput = z.infer<typeof createBorrowingRecordInputSchema>;

export const returnItemInputSchema = z.object({
  borrowing_record_id: z.number(),
  notes: z.string().nullable()
});

export type ReturnItemInput = z.infer<typeof returnItemInputSchema>;

// Dashboard and report schemas
export const dashboardStatsSchema = z.object({
  total_items: z.number(),
  total_borrowed: z.number(),
  overdue_items: z.number(),
  available_items: z.number(),
  active_borrowers: z.number()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

export const itemUsageReportSchema = z.object({
  item_id: z.number(),
  item_name: z.string(),
  label_code: z.string(),
  total_borrows: z.number(),
  current_borrowed: z.number(),
  last_borrowed_date: z.coerce.date().nullable()
});

export type ItemUsageReport = z.infer<typeof itemUsageReportSchema>;

export const overdueItemSchema = z.object({
  borrowing_record_id: z.number(),
  item_name: z.string(),
  label_code: z.string(),
  user_name: z.string(),
  user_email: z.string(),
  borrowed_date: z.coerce.date(),
  due_date: z.coerce.date(),
  days_overdue: z.number()
});

export type OverdueItem = z.infer<typeof overdueItemSchema>;
