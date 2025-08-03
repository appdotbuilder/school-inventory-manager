
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryItemsTable, usersTable, borrowingRecordsTable } from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats for empty database', async () => {
    const stats = await getDashboardStats();

    expect(stats.total_items).toEqual(0);
    expect(stats.total_borrowed).toEqual(0);
    expect(stats.overdue_items).toEqual(0);
    expect(stats.available_items).toEqual(0);
    expect(stats.active_borrowers).toEqual(0);
    
    // Verify all values are numbers
    expect(typeof stats.total_items).toBe('number');
    expect(typeof stats.total_borrowed).toBe('number');
    expect(typeof stats.overdue_items).toBe('number');
    expect(typeof stats.available_items).toBe('number');
    expect(typeof stats.active_borrowers).toBe('number');
  });

  it('should calculate correct stats with sample data', async () => {
    // Create inventory items
    await db.insert(inventoryItemsTable).values([
      {
        name: 'Digital Book 1',
        item_type: 'digital_book',
        label_code: 'DB001',
        quantity_total: 5,
        quantity_available: 3
      },
      {
        name: 'Lab Equipment 1',
        item_type: 'laboratory_equipment',
        label_code: 'LE001',
        quantity_total: 10,
        quantity_available: 7
      }
    ]).execute();

    // Create users
    await db.insert(usersTable).values([
      {
        name: 'John Teacher',
        email: 'john@school.edu',
        role: 'teacher',
        department: 'Science'
      },
      {
        name: 'Jane Student',
        email: 'jane@school.edu',
        role: 'student',
        student_id: 'STU001'
      }
    ]).execute();

    // Create borrowing records
    const currentDate = new Date();
    const futureDate = new Date(currentDate);
    futureDate.setDate(futureDate.getDate() + 7);
    
    const pastDate = new Date(currentDate);
    pastDate.setDate(pastDate.getDate() - 1);

    await db.insert(borrowingRecordsTable).values([
      {
        item_id: 1,
        user_id: 1,
        quantity_borrowed: 2,
        borrowed_date: currentDate,
        due_date: futureDate, // Not overdue
        status: 'active'
      },
      {
        item_id: 2,
        user_id: 2,
        quantity_borrowed: 3,
        borrowed_date: currentDate,
        due_date: pastDate, // Overdue
        status: 'active'
      },
      {
        item_id: 1,
        user_id: 2,
        quantity_borrowed: 1,
        borrowed_date: currentDate,
        due_date: futureDate,
        status: 'returned' // Should not count
      }
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.total_items).toEqual(2);
    expect(stats.total_borrowed).toEqual(5); // 2 + 3 (only active)
    expect(stats.overdue_items).toEqual(1); // One overdue record
    expect(stats.available_items).toEqual(10); // 3 + 7
    expect(stats.active_borrowers).toEqual(2); // Two distinct users with active borrowings
  });

  it('should handle overdue calculation correctly', async () => {
    // Create inventory item
    await db.insert(inventoryItemsTable).values({
      name: 'Test Item',
      item_type: 'digital_book',
      label_code: 'TI001',
      quantity_total: 5,
      quantity_available: 3
    }).execute();

    // Create user
    await db.insert(usersTable).values({
      name: 'Test User',
      email: 'test@school.edu',
      role: 'student',
      student_id: 'STU001'
    }).execute();

    // Create overdue borrowing record
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

    await db.insert(borrowingRecordsTable).values({
      item_id: 1,
      user_id: 1,
      quantity_borrowed: 2,
      borrowed_date: pastDate,
      due_date: pastDate, // Due date in the past
      status: 'active'
    }).execute();

    const stats = await getDashboardStats();

    expect(stats.overdue_items).toEqual(1);
    expect(stats.total_borrowed).toEqual(2);
    expect(stats.active_borrowers).toEqual(1);
  });

  it('should count distinct active borrowers correctly', async () => {
    // Create inventory items
    await db.insert(inventoryItemsTable).values([
      {
        name: 'Item 1',
        item_type: 'digital_book',
        label_code: 'I001',
        quantity_total: 5,
        quantity_available: 3
      },
      {
        name: 'Item 2',
        item_type: 'digital_book',
        label_code: 'I002',
        quantity_total: 5,
        quantity_available: 3
      }
    ]).execute();

    // Create user
    await db.insert(usersTable).values({
      name: 'Multi Borrower',
      email: 'multi@school.edu',
      role: 'student',
      student_id: 'STU001'
    }).execute();

    // Create multiple active borrowing records for same user
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    await db.insert(borrowingRecordsTable).values([
      {
        item_id: 1,
        user_id: 1,
        quantity_borrowed: 1,
        borrowed_date: new Date(),
        due_date: futureDate,
        status: 'active'
      },
      {
        item_id: 2,
        user_id: 1,
        quantity_borrowed: 2,
        borrowed_date: new Date(),
        due_date: futureDate,
        status: 'active'
      }
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.active_borrowers).toEqual(1); // Should count user only once
    expect(stats.total_borrowed).toEqual(3); // 1 + 2
  });
});
