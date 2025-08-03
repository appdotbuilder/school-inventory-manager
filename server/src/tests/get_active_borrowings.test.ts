
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryItemsTable, usersTable, borrowingRecordsTable } from '../db/schema';
import { getActiveBorrowings } from '../handlers/get_active_borrowings';

describe('getActiveBorrowings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no active borrowings exist', async () => {
    const result = await getActiveBorrowings();
    expect(result).toEqual([]);
  });

  it('should return active borrowing records', async () => {
    // Create prerequisite user
    const users = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        role: 'student',
        student_id: 'S12345',
        department: null
      })
      .returning()
      .execute();

    // Create prerequisite inventory item
    const items = await db.insert(inventoryItemsTable)
      .values({
        name: 'Test Item',
        description: 'Test description',
        item_type: 'it_asset',
        label_code: 'IT001',
        quantity_total: 10,
        quantity_available: 5,
        location: 'Lab A',
        purchase_date: new Date(),
        purchase_price: '299.99',
        condition_notes: 'Good condition'
      })
      .returning()
      .execute();

    // Create active borrowing record
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    await db.insert(borrowingRecordsTable)
      .values({
        item_id: items[0].id,
        user_id: users[0].id,
        quantity_borrowed: 2,
        borrowed_date: new Date(),
        due_date: dueDate,
        returned_date: null,
        status: 'active',
        notes: 'Test borrowing'
      })
      .execute();

    const result = await getActiveBorrowings();

    expect(result).toHaveLength(1);
    expect(result[0].status).toEqual('active');
    expect(result[0].item_id).toEqual(items[0].id);
    expect(result[0].user_id).toEqual(users[0].id);
    expect(result[0].quantity_borrowed).toEqual(2);
    expect(result[0].returned_date).toBeNull();
    expect(result[0].notes).toEqual('Test borrowing');
  });

  it('should return overdue borrowing records', async () => {
    // Create prerequisite user
    const users = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        role: 'teacher',
        student_id: null,
        department: 'Mathematics'
      })
      .returning()
      .execute();

    // Create prerequisite inventory item
    const items = await db.insert(inventoryItemsTable)
      .values({
        name: 'Overdue Item',
        description: 'Item that is overdue',
        item_type: 'laboratory_equipment',
        label_code: 'LAB001',
        quantity_total: 5,
        quantity_available: 2,
        location: 'Lab B',
        purchase_date: null,
        purchase_price: null,
        condition_notes: null
      })
      .returning()
      .execute();

    // Create overdue borrowing record
    const pastDueDate = new Date();
    pastDueDate.setDate(pastDueDate.getDate() - 3);

    await db.insert(borrowingRecordsTable)
      .values({
        item_id: items[0].id,
        user_id: users[0].id,
        quantity_borrowed: 1,
        borrowed_date: new Date(),
        due_date: pastDueDate,
        returned_date: null,
        status: 'overdue',
        notes: null
      })
      .execute();

    const result = await getActiveBorrowings();

    expect(result).toHaveLength(1);
    expect(result[0].status).toEqual('overdue');
    expect(result[0].item_id).toEqual(items[0].id);
    expect(result[0].user_id).toEqual(users[0].id);
    expect(result[0].quantity_borrowed).toEqual(1);
    expect(result[0].notes).toBeNull();
  });

  it('should return both active and overdue records', async () => {
    // Create prerequisite user
    const users = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        role: 'student',
        student_id: 'S54321',
        department: null
      })
      .returning()
      .execute();

    // Create prerequisite inventory item
    const items = await db.insert(inventoryItemsTable)
      .values({
        name: 'Mixed Status Item',
        description: 'Item for mixed status test',
        item_type: 'furniture',
        label_code: 'FURN001',
        quantity_total: 8,
        quantity_available: 4,
        location: 'Room 101',
        purchase_date: new Date(),
        purchase_price: '150.50',
        condition_notes: 'Fair condition'
      })
      .returning()
      .execute();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);

    // Create active borrowing record
    await db.insert(borrowingRecordsTable)
      .values({
        item_id: items[0].id,
        user_id: users[0].id,
        quantity_borrowed: 1,
        borrowed_date: new Date(),
        due_date: futureDate,
        returned_date: null,
        status: 'active',
        notes: 'Active borrowing'
      })
      .execute();

    // Create overdue borrowing record
    await db.insert(borrowingRecordsTable)
      .values({
        item_id: items[0].id,
        user_id: users[0].id,
        quantity_borrowed: 2,
        borrowed_date: new Date(),
        due_date: pastDate,
        returned_date: null,
        status: 'overdue',
        notes: 'Overdue borrowing'
      })
      .execute();

    // Create returned record (should not be included)
    await db.insert(borrowingRecordsTable)
      .values({
        item_id: items[0].id,
        user_id: users[0].id,
        quantity_borrowed: 1,
        borrowed_date: new Date(),
        due_date: pastDate,
        returned_date: new Date(),
        status: 'returned',
        notes: 'Returned borrowing'
      })
      .execute();

    const result = await getActiveBorrowings();

    expect(result).toHaveLength(2);
    
    const activeRecord = result.find(r => r.status === 'active');
    const overdueRecord = result.find(r => r.status === 'overdue');
    
    expect(activeRecord).toBeDefined();
    expect(activeRecord?.quantity_borrowed).toEqual(1);
    expect(activeRecord?.notes).toEqual('Active borrowing');
    
    expect(overdueRecord).toBeDefined();
    expect(overdueRecord?.quantity_borrowed).toEqual(2);
    expect(overdueRecord?.notes).toEqual('Overdue borrowing');
    
    // Verify returned record is not included
    const returnedRecord = result.find(r => r.status === 'returned');
    expect(returnedRecord).toBeUndefined();
  });

  it('should exclude returned borrowing records', async () => {
    // Create prerequisite user
    const users = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin',
        student_id: null,
        department: 'Administration'
      })
      .returning()
      .execute();

    // Create prerequisite inventory item
    const items = await db.insert(inventoryItemsTable)
      .values({
        name: 'Returned Item',
        description: 'Item that was returned',
        item_type: 'digital_book',
        label_code: 'BOOK001',
        quantity_total: 1,
        quantity_available: 1,
        location: 'Digital Library',
        purchase_date: null,
        purchase_price: null,
        condition_notes: null
      })
      .returning()
      .execute();

    // Create returned borrowing record
    await db.insert(borrowingRecordsTable)
      .values({
        item_id: items[0].id,
        user_id: users[0].id,
        quantity_borrowed: 1,
        borrowed_date: new Date(),
        due_date: new Date(),
        returned_date: new Date(),
        status: 'returned',
        notes: 'Successfully returned'
      })
      .execute();

    const result = await getActiveBorrowings();

    expect(result).toHaveLength(0);
  });
});
