
import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const itemTypeEnum = pgEnum('item_type', ['digital_book', 'laboratory_equipment', 'furniture', 'it_asset']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'teacher', 'student']);
export const borrowingStatusEnum = pgEnum('borrowing_status', ['active', 'returned', 'overdue']);

// Admins table
export const adminsTable = pgTable('admins', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Inventory items table
export const inventoryItemsTable = pgTable('inventory_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  item_type: itemTypeEnum('item_type').notNull(),
  label_code: text('label_code').notNull().unique(), // Unique identifier for easy identification
  quantity_total: integer('quantity_total').notNull(),
  quantity_available: integer('quantity_available').notNull(),
  location: text('location'),
  purchase_date: timestamp('purchase_date'),
  purchase_price: numeric('purchase_price', { precision: 10, scale: 2 }),
  condition_notes: text('condition_notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Users table (teachers and students)
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: userRoleEnum('role').notNull(),
  student_id: text('student_id'), // For students
  department: text('department'), // For teachers
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Borrowing records table
export const borrowingRecordsTable = pgTable('borrowing_records', {
  id: serial('id').primaryKey(),
  item_id: integer('item_id').notNull(),
  user_id: integer('user_id').notNull(),
  quantity_borrowed: integer('quantity_borrowed').notNull(),
  borrowed_date: timestamp('borrowed_date').defaultNow().notNull(),
  due_date: timestamp('due_date').notNull(),
  returned_date: timestamp('returned_date'),
  status: borrowingStatusEnum('status').notNull().default('active'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const inventoryItemsRelations = relations(inventoryItemsTable, ({ many }) => ({
  borrowingRecords: many(borrowingRecordsTable),
}));

export const usersRelations = relations(usersTable, ({ many }) => ({
  borrowingRecords: many(borrowingRecordsTable),
}));

export const borrowingRecordsRelations = relations(borrowingRecordsTable, ({ one }) => ({
  item: one(inventoryItemsTable, {
    fields: [borrowingRecordsTable.item_id],
    references: [inventoryItemsTable.id],
  }),
  user: one(usersTable, {
    fields: [borrowingRecordsTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Admin = typeof adminsTable.$inferSelect;
export type NewAdmin = typeof adminsTable.$inferInsert;

export type InventoryItem = typeof inventoryItemsTable.$inferSelect;
export type NewInventoryItem = typeof inventoryItemsTable.$inferInsert;

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type BorrowingRecord = typeof borrowingRecordsTable.$inferSelect;
export type NewBorrowingRecord = typeof borrowingRecordsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  admins: adminsTable,
  inventoryItems: inventoryItemsTable,
  users: usersTable,
  borrowingRecords: borrowingRecordsTable,
};
