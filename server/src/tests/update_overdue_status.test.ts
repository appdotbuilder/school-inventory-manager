
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { borrowingRecordsTable, inventoryItemsTable, usersTable } from '../db/schema';
import { updateOverdueStatus } from '../handlers/update_overdue_status';
import { eq } from 'drizzle-orm';

describe('updateOverdueStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update overdue borrowing records', async () => {
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
    const userId = userResult[0].id;

    // Create test inventory item
    const itemResult = await db.insert(inventoryItemsTable)
      .values({
        name: 'Test Item',
        description: 'Test description',
        item_type: 'laboratory_equipment',
        label_code: 'LAB001',
        quantity_total: 10,
        quantity_available: 5,
        location: 'Room 101',
        purchase_date: new Date(),
        purchase_price: '100.00',
        condition_notes: 'Good condition'
      })
      .returning()
      .execute();
    const itemId = itemResult[0].id;

    // Create overdue borrowing record (due date in the past)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

    await db.insert(borrowingRecordsTable)
      .values({
        item_id: itemId,
        user_id: userId,
        quantity_borrowed: 2,
        borrowed_date: pastDate,
        due_date: pastDate,
        returned_date: null,
        status: 'active',
        notes: 'Test borrowing'
      })
      .execute();

    // Update overdue status
    const updatedCount = await updateOverdueStatus();

    // Verify one record was updated
    expect(updatedCount).toEqual(1);

    // Verify the record status was changed to overdue
    const records = await db.select()
      .from(borrowingRecordsTable)
      .where(eq(borrowingRecordsTable.item_id, itemId))
      .execute();

    expect(records).toHaveLength(1);
    expect(records[0].status).toEqual('overdue');
    expect(records[0].updated_at).toBeInstanceOf(Date);
  });

  it('should not update returned records', async () => {
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
    const userId = userResult[0].id;

    // Create test inventory item
    const itemResult = await db.insert(inventoryItemsTable)
      .values({
        name: 'Test Item',
        description: 'Test description',
        item_type: 'laboratory_equipment',
        label_code: 'LAB001',
        quantity_total: 10,
        quantity_available: 5,
        location: 'Room 101',
        purchase_date: new Date(),
        purchase_price: '100.00',
        condition_notes: 'Good condition'
      })
      .returning()
      .execute();
    const itemId = itemResult[0].id;

    // Create returned borrowing record (due date in the past but already returned)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

    await db.insert(borrowingRecordsTable)
      .values({
        item_id: itemId,
        user_id: userId,
        quantity_borrowed: 2,
        borrowed_date: pastDate,
        due_date: pastDate,
        returned_date: new Date(),
        status: 'returned',
        notes: 'Test borrowing'
      })
      .execute();

    // Update overdue status
    const updatedCount = await updateOverdueStatus();

    // Verify no records were updated
    expect(updatedCount).toEqual(0);

    // Verify the record status remains returned
    const records = await db.select()
      .from(borrowingRecordsTable)
      .where(eq(borrowingRecordsTable.item_id, itemId))
      .execute();

    expect(records).toHaveLength(1);
    expect(records[0].status).toEqual('returned');
  });

  it('should not update active records with future due dates', async () => {
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
    const userId = userResult[0].id;

    // Create test inventory item
    const itemResult = await db.insert(inventoryItemsTable)
      .values({
        name: 'Test Item',
        description: 'Test description',
        item_type: 'laboratory_equipment',
        label_code: 'LAB001',
        quantity_total: 10,
        quantity_available: 5,
        location: 'Room 101',
        purchase_date: new Date(),
        purchase_price: '100.00',
        condition_notes: 'Good condition'
      })
      .returning()
      .execute();
    const itemId = itemResult[0].id;

    // Create active borrowing record with future due date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5); // 5 days from now

    await db.insert(borrowingRecordsTable)
      .values({
        item_id: itemId,
        user_id: userId,
        quantity_borrowed: 2,
        borrowed_date: new Date(),
        due_date: futureDate,
        returned_date: null,
        status: 'active',
        notes: 'Test borrowing'
      })
      .execute();

    // Update overdue status
    const updatedCount = await updateOverdueStatus();

    // Verify no records were updated
    expect(updatedCount).toEqual(0);

    // Verify the record status remains active
    const records = await db.select()
      .from(borrowingRecordsTable)
      .where(eq(borrowingRecordsTable.item_id, itemId))
      .execute();

    expect(records).toHaveLength(1);
    expect(records[0].status).toEqual('active');
  });

  it('should handle multiple overdue records', async () => {
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
    const userId = userResult[0].id;

    // Create multiple test inventory items
    const items = await Promise.all([
      db.insert(inventoryItemsTable)
        .values({
          name: 'Test Item 1',
          description: 'Test description',
          item_type: 'laboratory_equipment',
          label_code: 'LAB001',
          quantity_total: 10,
          quantity_available: 5,
          location: 'Room 101',
          purchase_date: new Date(),
          purchase_price: '100.00',
          condition_notes: 'Good condition'
        })
        .returning()
        .execute(),
      db.insert(inventoryItemsTable)
        .values({
          name: 'Test Item 2',
          description: 'Test description',
          item_type: 'furniture',
          label_code: 'FUR001',
          quantity_total: 5,
          quantity_available: 3,
          location: 'Room 102',
          purchase_date: new Date(),
          purchase_price: '200.00',
          condition_notes: 'Good condition'
        })
        .returning()
        .execute()
    ]);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3); // 3 days ago

    // Create multiple overdue borrowing records
    await Promise.all([
      db.insert(borrowingRecordsTable)
        .values({
          item_id: items[0][0].id,
          user_id: userId,
          quantity_borrowed: 1,
          borrowed_date: pastDate,
          due_date: pastDate,
          returned_date: null,
          status: 'active',
          notes: 'Test borrowing 1'
        })
        .execute(),
      db.insert(borrowingRecordsTable)
        .values({
          item_id: items[1][0].id,
          user_id: userId,
          quantity_borrowed: 1,
          borrowed_date: pastDate,
          due_date: pastDate,
          returned_date: null,
          status: 'active',
          notes: 'Test borrowing 2'
        })
        .execute()
    ]);

    // Update overdue status
    const updatedCount = await updateOverdueStatus();

    // Verify both records were updated
    expect(updatedCount).toEqual(2);

    // Verify both records have overdue status
    const records = await db.select()
      .from(borrowingRecordsTable)
      .execute();

    expect(records).toHaveLength(2);
    records.forEach(record => {
      expect(record.status).toEqual('overdue');
    });
  });
});
