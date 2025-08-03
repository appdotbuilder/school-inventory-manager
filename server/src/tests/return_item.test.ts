
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryItemsTable, usersTable, borrowingRecordsTable } from '../db/schema';
import { type ReturnItemInput } from '../schema';
import { returnItem } from '../handlers/return_item';
import { eq } from 'drizzle-orm';

describe('returnItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return an active item successfully', async () => {
    // Create test inventory item
    const inventoryItems = await db.insert(inventoryItemsTable)
      .values({
        name: 'Test Equipment',
        description: 'Test lab equipment',
        item_type: 'laboratory_equipment',
        label_code: 'LAB001',
        quantity_total: 10,
        quantity_available: 7, // 3 are borrowed
        location: 'Lab A'
      })
      .returning()
      .execute();

    const inventoryItem = inventoryItems[0];

    // Create test user
    const users = await db.insert(usersTable)
      .values({
        name: 'John Doe',
        email: 'john@example.com',
        role: 'student',
        student_id: 'STU001'
      })
      .returning()
      .execute();

    const user = users[0];

    // Create active borrowing record
    const borrowingRecords = await db.insert(borrowingRecordsTable)
      .values({
        item_id: inventoryItem.id,
        user_id: user.id,
        quantity_borrowed: 3,
        borrowed_date: new Date('2024-01-01'),
        due_date: new Date('2024-01-15'),
        status: 'active',
        notes: 'Original borrowing'
      })
      .returning()
      .execute();

    const borrowingRecord = borrowingRecords[0];

    const input: ReturnItemInput = {
      borrowing_record_id: borrowingRecord.id,
      notes: 'Returned in good condition'
    };

    const result = await returnItem(input);

    // Verify borrowing record was updated
    expect(result.id).toEqual(borrowingRecord.id);
    expect(result.status).toEqual('returned');
    expect(result.returned_date).toBeInstanceOf(Date);
    expect(result.notes).toEqual('Returned in good condition');
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify database was updated
    const updatedBorrowingRecords = await db.select()
      .from(borrowingRecordsTable)
      .where(eq(borrowingRecordsTable.id, borrowingRecord.id))
      .execute();

    expect(updatedBorrowingRecords).toHaveLength(1);
    expect(updatedBorrowingRecords[0].status).toEqual('returned');
    expect(updatedBorrowingRecords[0].returned_date).toBeInstanceOf(Date);
    expect(updatedBorrowingRecords[0].notes).toEqual('Returned in good condition');
  });

  it('should update inventory item quantity_available', async () => {
    // Create test inventory item
    const inventoryItems = await db.insert(inventoryItemsTable)
      .values({
        name: 'Test Book',
        description: 'Digital book for testing',
        item_type: 'digital_book',
        label_code: 'BOOK001',
        quantity_total: 5,
        quantity_available: 3, // 2 are borrowed
        location: 'Digital Library'
      })
      .returning()
      .execute();

    const inventoryItem = inventoryItems[0];

    // Create test user
    const users = await db.insert(usersTable)
      .values({
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'teacher',
        department: 'Computer Science'
      })
      .returning()
      .execute();

    const user = users[0];

    // Create active borrowing record
    const borrowingRecords = await db.insert(borrowingRecordsTable)
      .values({
        item_id: inventoryItem.id,
        user_id: user.id,
        quantity_borrowed: 2,
        borrowed_date: new Date('2024-01-01'),
        due_date: new Date('2024-01-15'),
        status: 'active'
      })
      .returning()
      .execute();

    const borrowingRecord = borrowingRecords[0];

    const input: ReturnItemInput = {
      borrowing_record_id: borrowingRecord.id,
      notes: null
    };

    await returnItem(input);

    // Verify inventory item quantity was updated
    const updatedItems = await db.select()
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.id, inventoryItem.id))
      .execute();

    expect(updatedItems).toHaveLength(1);
    expect(updatedItems[0].quantity_available).toEqual(5); // 3 + 2 returned
    expect(updatedItems[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return an overdue item successfully', async () => {
    // Create test data
    const inventoryItems = await db.insert(inventoryItemsTable)
      .values({
        name: 'Overdue Equipment',
        item_type: 'it_asset',
        label_code: 'IT001',
        quantity_total: 1,
        quantity_available: 0
      })
      .returning()
      .execute();

    const users = await db.insert(usersTable)
      .values({
        name: 'Overdue User',
        email: 'overdue@example.com',
        role: 'student',
        student_id: 'STU002'
      })
      .returning()
      .execute();

    // Create overdue borrowing record
    const borrowingRecords = await db.insert(borrowingRecordsTable)
      .values({
        item_id: inventoryItems[0].id,
        user_id: users[0].id,
        quantity_borrowed: 1,
        borrowed_date: new Date('2024-01-01'),
        due_date: new Date('2024-01-15'),
        status: 'overdue'
      })
      .returning()
      .execute();

    const input: ReturnItemInput = {
      borrowing_record_id: borrowingRecords[0].id,
      notes: 'Late return with penalty'
    };

    const result = await returnItem(input);

    expect(result.status).toEqual('returned');
    expect(result.returned_date).toBeInstanceOf(Date);
    expect(result.notes).toEqual('Late return with penalty');
  });

  it('should throw error for non-existent borrowing record', async () => {
    const input: ReturnItemInput = {
      borrowing_record_id: 99999,
      notes: null
    };

    expect(returnItem(input)).rejects.toThrow(/borrowing record not found/i);
  });

  it('should throw error for already returned item', async () => {
    // Create test data
    const inventoryItems = await db.insert(inventoryItemsTable)
      .values({
        name: 'Already Returned',
        item_type: 'furniture',
        label_code: 'FURN001',
        quantity_total: 1,
        quantity_available: 1
      })
      .returning()
      .execute();

    const users = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        role: 'student',
        student_id: 'STU003'
      })
      .returning()
      .execute();

    // Create already returned borrowing record
    const borrowingRecords = await db.insert(borrowingRecordsTable)
      .values({
        item_id: inventoryItems[0].id,
        user_id: users[0].id,
        quantity_borrowed: 1,
        borrowed_date: new Date('2024-01-01'),
        due_date: new Date('2024-01-15'),
        returned_date: new Date('2024-01-10'),
        status: 'returned'
      })
      .returning()
      .execute();

    const input: ReturnItemInput = {
      borrowing_record_id: borrowingRecords[0].id,
      notes: 'Trying to return again'
    };

    expect(returnItem(input)).rejects.toThrow(/already been returned/i);
  });
});
