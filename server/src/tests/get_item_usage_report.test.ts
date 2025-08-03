
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryItemsTable, usersTable, borrowingRecordsTable } from '../db/schema';
import { getItemUsageReport } from '../handlers/get_item_usage_report';

describe('getItemUsageReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty report when no items exist', async () => {
    const report = await getItemUsageReport();
    
    expect(report).toEqual([]);
  });

  it('should return item with zero borrows when no borrowing records exist', async () => {
    // Create test item
    const [item] = await db.insert(inventoryItemsTable)
      .values({
        name: 'Test Book',
        item_type: 'digital_book',
        label_code: 'BOOK001',
        quantity_total: 5,
        quantity_available: 5
      })
      .returning()
      .execute();

    const report = await getItemUsageReport();

    expect(report).toHaveLength(1);
    expect(report[0]).toEqual({
      item_id: item.id,
      item_name: 'Test Book',
      label_code: 'BOOK001',
      total_borrows: 0,
      current_borrowed: 0,
      last_borrowed_date: null
    });
  });

  it('should calculate usage statistics correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        role: 'student',
        student_id: 'S001'
      })
      .returning()
      .execute();

    // Create test items
    const [item1] = await db.insert(inventoryItemsTable)
      .values({
        name: 'Popular Book',
        item_type: 'digital_book',
        label_code: 'BOOK001',
        quantity_total: 10,
        quantity_available: 7 // 3 currently borrowed
      })
      .returning()
      .execute();

    const [item2] = await db.insert(inventoryItemsTable)
      .values({
        name: 'Lab Equipment',
        item_type: 'laboratory_equipment',
        label_code: 'LAB001',
        quantity_total: 5,
        quantity_available: 5 // None borrowed
      })
      .returning()
      .execute();

    // Create borrowing records with different dates
    const oldDate = new Date('2023-01-01');
    const recentDate = new Date('2024-01-01');

    await db.insert(borrowingRecordsTable)
      .values([
        {
          item_id: item1.id,
          user_id: user.id,
          quantity_borrowed: 2,
          borrowed_date: oldDate,
          due_date: new Date('2023-01-15'),
          status: 'returned'
        },
        {
          item_id: item1.id,
          user_id: user.id,
          quantity_borrowed: 1,
          borrowed_date: recentDate,
          due_date: new Date('2024-01-15'),
          status: 'active'
        },
        {
          item_id: item1.id,
          user_id: user.id,
          quantity_borrowed: 1,
          borrowed_date: new Date('2023-06-01'),
          due_date: new Date('2023-06-15'),
          status: 'returned'
        }
      ])
      .execute();

    const report = await getItemUsageReport();

    expect(report).toHaveLength(2);

    // Should be ordered by total_borrows desc (Popular Book first)
    const popularBook = report[0];
    expect(popularBook.item_id).toEqual(item1.id);
    expect(popularBook.item_name).toEqual('Popular Book');
    expect(popularBook.label_code).toEqual('BOOK001');
    expect(popularBook.total_borrows).toEqual(3);
    expect(popularBook.current_borrowed).toEqual(3); // 10 total - 7 available
    expect(popularBook.last_borrowed_date).toEqual(recentDate);

    const labEquipment = report[1];
    expect(labEquipment.item_id).toEqual(item2.id);
    expect(labEquipment.item_name).toEqual('Lab Equipment');
    expect(labEquipment.label_code).toEqual('LAB001');  
    expect(labEquipment.total_borrows).toEqual(0);
    expect(labEquipment.current_borrowed).toEqual(0); // 5 total - 5 available
    expect(labEquipment.last_borrowed_date).toBeNull();
  });

  it('should handle multiple items with different usage patterns', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        role: 'teacher',
        department: 'Computer Science'
      })
      .returning()
      .execute();

    // Create items with different usage patterns
    const [highUsageItem] = await db.insert(inventoryItemsTable)
      .values({
        name: 'High Usage Item',
        item_type: 'it_asset',
        label_code: 'IT001',
        quantity_total: 3,
        quantity_available: 1
      })
      .returning()
      .execute();

    const [mediumUsageItem] = await db.insert(inventoryItemsTable)
      .values({
        name: 'Medium Usage Item',
        item_type: 'furniture',
        label_code: 'FURN001',
        quantity_total: 2,
        quantity_available: 2
      })
      .returning()
      .execute();

    // Create borrowing records
    await db.insert(borrowingRecordsTable)
      .values([
        // High usage item - 5 borrows
        {
          item_id: highUsageItem.id,
          user_id: user.id,
          quantity_borrowed: 1,
          borrowed_date: new Date('2023-01-01'),
          due_date: new Date('2023-01-15'),
          status: 'returned'
        },
        {
          item_id: highUsageItem.id,
          user_id: user.id,
          quantity_borrowed: 1,
          borrowed_date: new Date('2023-02-01'),
          due_date: new Date('2023-02-15'),
          status: 'returned'
        },
        {
          item_id: highUsageItem.id,
          user_id: user.id,
          quantity_borrowed: 1,
          borrowed_date: new Date('2023-03-01'),
          due_date: new Date('2023-03-15'),
          status: 'returned'
        },
        {
          item_id: highUsageItem.id,
          user_id: user.id,
          quantity_borrowed: 1,
          borrowed_date: new Date('2023-04-01'),
          due_date: new Date('2023-04-15'),
          status: 'returned'
        },
        {
          item_id: highUsageItem.id,
          user_id: user.id,
          quantity_borrowed: 2,
          borrowed_date: new Date('2024-01-01'),
          due_date: new Date('2024-01-15'),
          status: 'active'
        },
        // Medium usage item - 2 borrows
        {
          item_id: mediumUsageItem.id,
          user_id: user.id,
          quantity_borrowed: 1,
          borrowed_date: new Date('2023-05-01'),
          due_date: new Date('2023-05-15'),
          status: 'returned'
        },
        {
          item_id: mediumUsageItem.id,
          user_id: user.id,
          quantity_borrowed: 1,
          borrowed_date: new Date('2023-06-01'),
          due_date: new Date('2023-06-15'),
          status: 'returned'
        }
      ])
      .execute();

    const report = await getItemUsageReport();

    expect(report).toHaveLength(2);

    // Should be ordered by total_borrows desc
    expect(report[0].item_name).toEqual('High Usage Item');
    expect(report[0].total_borrows).toEqual(5);
    expect(report[0].current_borrowed).toEqual(2); // 3 total - 1 available
    expect(report[0].last_borrowed_date).toEqual(new Date('2024-01-01'));

    expect(report[1].item_name).toEqual('Medium Usage Item');
    expect(report[1].total_borrows).toEqual(2);
    expect(report[1].current_borrowed).toEqual(0); // 2 total - 2 available
    expect(report[1].last_borrowed_date).toEqual(new Date('2023-06-01'));
  });
});
