
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryItemsTable, usersTable, borrowingRecordsTable } from '../db/schema';
import { getBorrowingRecords } from '../handlers/get_borrowing_records';

describe('getBorrowingRecords', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no borrowing records exist', async () => {
    const result = await getBorrowingRecords();
    expect(result).toEqual([]);
  });

  it('should return all borrowing records with correct structure', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        role: 'student',
        student_id: 'STU001',
        department: null
      })
      .returning()
      .execute();
    const testUser = userResult[0];

    // Create test inventory item
    const itemResult = await db.insert(inventoryItemsTable)
      .values({
        name: 'Test Item',
        description: 'A test item',
        item_type: 'digital_book',
        label_code: 'TEST001',
        quantity_total: 10,
        quantity_available: 8,
        location: 'Library',
        purchase_date: null,
        purchase_price: null,
        condition_notes: null
      })
      .returning()
      .execute();
    const testItem = itemResult[0];

    // Create test borrowing record
    const borrowingResult = await db.insert(borrowingRecordsTable)
      .values({
        item_id: testItem.id,
        user_id: testUser.id,
        quantity_borrowed: 2,
        due_date: new Date('2024-02-01'),
        returned_date: null,
        status: 'active',
        notes: 'Test borrowing'
      })
      .returning()
      .execute();
    const testBorrowing = borrowingResult[0];

    const result = await getBorrowingRecords();

    expect(result).toHaveLength(1);
    
    const record = result[0];
    expect(record.id).toEqual(testBorrowing.id);
    expect(record.item_id).toEqual(testItem.id);
    expect(record.user_id).toEqual(testUser.id);
    expect(record.quantity_borrowed).toEqual(2);
    expect(record.borrowed_date).toBeInstanceOf(Date);
    expect(record.due_date).toEqual(new Date('2024-02-01'));
    expect(record.returned_date).toBeNull();
    expect(record.status).toEqual('active');
    expect(record.notes).toEqual('Test borrowing');
    expect(record.created_at).toBeInstanceOf(Date);
    expect(record.updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple borrowing records', async () => {
    // Create test users
    const userResults = await db.insert(usersTable)
      .values([
        {
          name: 'User One',
          email: 'user1@example.com',
          role: 'student',
          student_id: 'STU001',
          department: null
        },
        {
          name: 'User Two',
          email: 'user2@example.com',
          role: 'teacher',
          student_id: null,
          department: 'Computer Science'
        }
      ])
      .returning()
      .execute();

    // Create test inventory items
    const itemResults = await db.insert(inventoryItemsTable)
      .values([
        {
          name: 'Item One',
          description: 'First test item',
          item_type: 'digital_book',
          label_code: 'ITEM001',
          quantity_total: 5,
          quantity_available: 3,
          location: 'Library',
          purchase_date: null,
          purchase_price: null,
          condition_notes: null
        },
        {
          name: 'Item Two',
          description: 'Second test item',
          item_type: 'laboratory_equipment',
          label_code: 'ITEM002',
          quantity_total: 3,
          quantity_available: 1,
          location: 'Lab A',
          purchase_date: null,
          purchase_price: null,
          condition_notes: null
        }
      ])
      .returning()
      .execute();

    // Create multiple borrowing records
    await db.insert(borrowingRecordsTable)
      .values([
        {
          item_id: itemResults[0].id,
          user_id: userResults[0].id,
          quantity_borrowed: 2,
          due_date: new Date('2024-02-01'),
          returned_date: null,
          status: 'active',
          notes: 'First borrowing'
        },
        {
          item_id: itemResults[1].id,
          user_id: userResults[1].id,
          quantity_borrowed: 1,
          due_date: new Date('2024-01-15'),
          returned_date: new Date('2024-01-10'),
          status: 'returned',
          notes: 'Second borrowing'
        }
      ])
      .execute();

    const result = await getBorrowingRecords();

    expect(result).toHaveLength(2);
    
    // Verify all records have proper structure
    result.forEach(record => {
      expect(record.id).toBeDefined();
      expect(record.item_id).toBeDefined();
      expect(record.user_id).toBeDefined();
      expect(record.quantity_borrowed).toBeGreaterThan(0);
      expect(record.borrowed_date).toBeInstanceOf(Date);
      expect(record.due_date).toBeInstanceOf(Date);
      expect(['active', 'returned', 'overdue']).toContain(record.status);
      expect(record.created_at).toBeInstanceOf(Date);
      expect(record.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should handle borrowing records with different statuses', async () => {
    // Create test user and item
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        role: 'student',
        student_id: 'STU001',
        department: null
      })
      .returning()
      .execute();

    const itemResult = await db.insert(inventoryItemsTable)
      .values({
        name: 'Test Item',
        description: 'A test item',
        item_type: 'furniture',
        label_code: 'FURN001',
        quantity_total: 5,
        quantity_available: 5,
        location: 'Office',
        purchase_date: null,
        purchase_price: null,
        condition_notes: null
      })
      .returning()
      .execute();

    // Create borrowing records with different statuses
    await db.insert(borrowingRecordsTable)
      .values([
        {
          item_id: itemResult[0].id,
          user_id: userResult[0].id,
          quantity_borrowed: 1,
          due_date: new Date('2024-02-01'),
          returned_date: null,
          status: 'active',
          notes: 'Active borrowing'
        },
        {
          item_id: itemResult[0].id,
          user_id: userResult[0].id,
          quantity_borrowed: 1,
          due_date: new Date('2024-01-01'),
          returned_date: null,
          status: 'overdue',
          notes: 'Overdue borrowing'
        },
        {
          item_id: itemResult[0].id,
          user_id: userResult[0].id,
          quantity_borrowed: 1,
          due_date: new Date('2024-01-15'),
          returned_date: new Date('2024-01-10'),
          status: 'returned',
          notes: 'Returned borrowing'
        }
      ])
      .execute();

    const result = await getBorrowingRecords();

    expect(result).toHaveLength(3);
    
    const statuses = result.map(record => record.status);
    expect(statuses).toContain('active');
    expect(statuses).toContain('overdue');
    expect(statuses).toContain('returned');
  });
});
