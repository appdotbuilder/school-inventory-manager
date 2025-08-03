
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryItemsTable, usersTable, borrowingRecordsTable } from '../db/schema';
import { type CreateBorrowingRecordInput } from '../schema';
import { createBorrowingRecord } from '../handlers/create_borrowing_record';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  role: 'student' as const,
  student_id: 'STU001',
  department: null
};

const testItem = {
  name: 'Test Equipment',
  description: 'Test laboratory equipment',
  item_type: 'laboratory_equipment' as const,
  label_code: 'LAB001',
  quantity_total: 10,
  quantity_available: 10,
  location: 'Lab Room 1',
  purchase_date: new Date('2024-01-01'),
  purchase_price: '1000.00',
  condition_notes: 'Good condition'
};

describe('createBorrowingRecord', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a borrowing record successfully', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [item] = await db.insert(inventoryItemsTable).values(testItem).returning().execute();

    const testInput: CreateBorrowingRecordInput = {
      item_id: item.id,
      user_id: user.id,
      quantity_borrowed: 2,
      borrowing_duration_days: 7,
      notes: 'Test borrowing'
    };

    const result = await createBorrowingRecord(testInput);

    // Verify borrowing record fields
    expect(result.item_id).toEqual(item.id);
    expect(result.user_id).toEqual(user.id);
    expect(result.quantity_borrowed).toEqual(2);
    expect(result.status).toEqual('active');
    expect(result.notes).toEqual('Test borrowing');
    expect(result.id).toBeDefined();
    expect(result.borrowed_date).toBeInstanceOf(Date);
    expect(result.due_date).toBeInstanceOf(Date);
    expect(result.returned_date).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify due date calculation (7 days from now)
    const expectedDueDate = new Date();
    expectedDueDate.setDate(expectedDueDate.getDate() + 7);
    expect(result.due_date.toDateString()).toEqual(expectedDueDate.toDateString());
  });

  it('should update inventory item quantity_available', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [item] = await db.insert(inventoryItemsTable).values(testItem).returning().execute();

    const testInput: CreateBorrowingRecordInput = {
      item_id: item.id,
      user_id: user.id,
      quantity_borrowed: 3,
      borrowing_duration_days: 14,
      notes: null
    };

    await createBorrowingRecord(testInput);

    // Check updated inventory
    const updatedItems = await db.select()
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.id, item.id))
      .execute();

    expect(updatedItems).toHaveLength(1);
    expect(updatedItems[0].quantity_available).toEqual(7); // 10 - 3 = 7
    expect(updatedItems[0].quantity_total).toEqual(10); // Should remain unchanged
    expect(updatedItems[0].updated_at).toBeInstanceOf(Date);
  });

  it('should save borrowing record to database', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [item] = await db.insert(inventoryItemsTable).values(testItem).returning().execute();

    const testInput: CreateBorrowingRecordInput = {
      item_id: item.id,
      user_id: user.id,
      quantity_borrowed: 1,
      borrowing_duration_days: 3,
      notes: 'Database test'
    };

    const result = await createBorrowingRecord(testInput);

    // Verify record exists in database
    const records = await db.select()
      .from(borrowingRecordsTable)
      .where(eq(borrowingRecordsTable.id, result.id))
      .execute();

    expect(records).toHaveLength(1);
    expect(records[0].item_id).toEqual(item.id);
    expect(records[0].user_id).toEqual(user.id);
    expect(records[0].quantity_borrowed).toEqual(1);
    expect(records[0].status).toEqual('active');
    expect(records[0].notes).toEqual('Database test');
  });

  it('should throw error when user does not exist', async () => {
    // Create only item, not user
    const [item] = await db.insert(inventoryItemsTable).values(testItem).returning().execute();

    const testInput: CreateBorrowingRecordInput = {
      item_id: item.id,
      user_id: 999, // Non-existent user
      quantity_borrowed: 1,
      borrowing_duration_days: 7,
      notes: null
    };

    await expect(createBorrowingRecord(testInput)).rejects.toThrow(/user.*not found/i);
  });

  it('should throw error when item does not exist', async () => {
    // Create only user, not item
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();

    const testInput: CreateBorrowingRecordInput = {
      item_id: 999, // Non-existent item
      user_id: user.id,
      quantity_borrowed: 1,
      borrowing_duration_days: 7,
      notes: null
    };

    await expect(createBorrowingRecord(testInput)).rejects.toThrow(/item.*not found/i);
  });

  it('should throw error when insufficient quantity available', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [item] = await db.insert(inventoryItemsTable).values({
      ...testItem,
      quantity_available: 2 // Only 2 available
    }).returning().execute();

    const testInput: CreateBorrowingRecordInput = {
      item_id: item.id,
      user_id: user.id,
      quantity_borrowed: 5, // Requesting more than available
      borrowing_duration_days: 7,
      notes: null
    };

    await expect(createBorrowingRecord(testInput)).rejects.toThrow(/insufficient quantity/i);
  });

  it('should handle different borrowing duration correctly', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [item] = await db.insert(inventoryItemsTable).values(testItem).returning().execute();

    const testInput: CreateBorrowingRecordInput = {
      item_id: item.id,
      user_id: user.id,
      quantity_borrowed: 1,
      borrowing_duration_days: 30, // 30 days
      notes: 'Long term borrowing'
    };

    const result = await createBorrowingRecord(testInput);

    // Verify due date calculation (30 days from now)
    const expectedDueDate = new Date();
    expectedDueDate.setDate(expectedDueDate.getDate() + 30);
    expect(result.due_date.toDateString()).toEqual(expectedDueDate.toDateString());
  });
});
