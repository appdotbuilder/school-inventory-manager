
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryItemsTable, usersTable, borrowingRecordsTable } from '../db/schema';
import { getOverdueItems } from '../handlers/get_overdue_items';

describe('getOverdueItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no overdue items exist', async () => {
    const result = await getOverdueItems();
    expect(result).toEqual([]);
  });

  it('should return overdue items with calculated days overdue', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test Student',
        email: 'student@test.com',
        role: 'student',
        student_id: 'S12345',
        department: null
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create test inventory item
    const itemResult = await db.insert(inventoryItemsTable)
      .values({
        name: 'Test Book',
        description: 'A test book',
        item_type: 'digital_book',
        label_code: 'TB001',
        quantity_total: 5,
        quantity_available: 4,
        location: 'Library',
        purchase_date: null,
        purchase_price: null,
        condition_notes: null
      })
      .returning()
      .execute();

    const item = itemResult[0];

    // Create overdue borrowing record (due 5 days ago)
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    await db.insert(borrowingRecordsTable)
      .values({
        item_id: item.id,
        user_id: user.id,
        quantity_borrowed: 1,
        borrowed_date: tenDaysAgo,
        due_date: fiveDaysAgo,
        returned_date: null,
        status: 'overdue',
        notes: null
      })
      .execute();

    const result = await getOverdueItems();

    expect(result).toHaveLength(1);
    
    const overdueItem = result[0];
    expect(overdueItem.item_name).toEqual('Test Book');
    expect(overdueItem.label_code).toEqual('TB001');
    expect(overdueItem.user_name).toEqual('Test Student');
    expect(overdueItem.user_email).toEqual('student@test.com');
    expect(overdueItem.borrowed_date).toBeInstanceOf(Date);
    expect(overdueItem.due_date).toBeInstanceOf(Date);
    expect(overdueItem.days_overdue).toBeGreaterThanOrEqual(4);
    expect(overdueItem.days_overdue).toBeLessThanOrEqual(6);
    expect(overdueItem.borrowing_record_id).toBeDefined();
  });

  it('should not return active borrowing records', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test Teacher',
        email: 'teacher@test.com',
        role: 'teacher',
        student_id: null,
        department: 'Science'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create test inventory item
    const itemResult = await db.insert(inventoryItemsTable)
      .values({
        name: 'Test Equipment',
        description: 'Lab equipment',
        item_type: 'laboratory_equipment',
        label_code: 'LE001',
        quantity_total: 3,
        quantity_available: 2,
        location: 'Lab Room 1',
        purchase_date: null,
        purchase_price: null,
        condition_notes: null
      })
      .returning()
      .execute();

    const item = itemResult[0];

    // Create active borrowing record (due in future)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await db.insert(borrowingRecordsTable)
      .values({
        item_id: item.id,
        user_id: user.id,
        quantity_borrowed: 1,
        borrowed_date: new Date(),
        due_date: tomorrow,
        returned_date: null,
        status: 'active',
        notes: null
      })
      .execute();

    const result = await getOverdueItems();
    expect(result).toHaveLength(0);
  });

  it('should handle multiple overdue items from different users', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        name: 'Student One',
        email: 'student1@test.com',
        role: 'student',
        student_id: 'S11111',
        department: null
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        name: 'Student Two',
        email: 'student2@test.com',
        role: 'student',
        student_id: 'S22222',
        department: null
      })
      .returning()
      .execute();

    const user1 = user1Result[0];
    const user2 = user2Result[0];

    // Create two test inventory items
    const item1Result = await db.insert(inventoryItemsTable)
      .values({
        name: 'Book One',
        description: 'First book',
        item_type: 'digital_book',
        label_code: 'B001',
        quantity_total: 2,
        quantity_available: 1,
        location: 'Library',
        purchase_date: null,
        purchase_price: null,
        condition_notes: null
      })
      .returning()
      .execute();

    const item2Result = await db.insert(inventoryItemsTable)
      .values({
        name: 'Book Two',
        description: 'Second book',
        item_type: 'digital_book',
        label_code: 'B002',
        quantity_total: 1,
        quantity_available: 0,
        location: 'Library',
        purchase_date: null,
        purchase_price: null,
        condition_notes: null
      })
      .returning()
      .execute();

    const item1 = item1Result[0];
    const item2 = item2Result[0];

    // Create overdue borrowing records
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    await db.insert(borrowingRecordsTable)
      .values([
        {
          item_id: item1.id,
          user_id: user1.id,
          quantity_borrowed: 1,
          borrowed_date: new Date(),
          due_date: threeDaysAgo,
          returned_date: null,
          status: 'overdue',
          notes: null
        },
        {
          item_id: item2.id,
          user_id: user2.id,
          quantity_borrowed: 1,
          borrowed_date: new Date(),
          due_date: threeDaysAgo,
          returned_date: null,
          status: 'overdue',
          notes: null
        }
      ])
      .execute();

    const result = await getOverdueItems();

    expect(result).toHaveLength(2);
    expect(result.map(item => item.user_name)).toContain('Student One');
    expect(result.map(item => item.user_name)).toContain('Student Two');
    expect(result.map(item => item.item_name)).toContain('Book One');
    expect(result.map(item => item.item_name)).toContain('Book Two');
    
    // All should have similar days overdue
    result.forEach(item => {
      expect(item.days_overdue).toBeGreaterThanOrEqual(2);
      expect(item.days_overdue).toBeLessThanOrEqual(4);
    });
  });
});
