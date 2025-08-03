
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryItemsTable, usersTable, borrowingRecordsTable } from '../db/schema';
import { deleteInventoryItem } from '../handlers/delete_inventory_item';
import { eq } from 'drizzle-orm';

describe('deleteInventoryItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing inventory item', async () => {
    // Create test item
    const result = await db.insert(inventoryItemsTable)
      .values({
        name: 'Test Item',
        description: 'A test item',
        item_type: 'digital_book',
        label_code: 'TEST001',
        quantity_total: 5,
        quantity_available: 5,
        location: 'Library',
        purchase_date: new Date(),
        purchase_price: '25.99',
        condition_notes: 'Good condition'
      })
      .returning()
      .execute();

    const itemId = result[0].id;

    // Delete the item
    const deleted = await deleteInventoryItem(itemId);

    expect(deleted).toBe(true);

    // Verify item is deleted from database
    const items = await db.select()
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.id, itemId))
      .execute();

    expect(items).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent item', async () => {
    const deleted = await deleteInventoryItem(999);

    expect(deleted).toBe(false);
  });

  it('should throw error when item has active borrowings', async () => {
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

    // Create test item
    const itemResult = await db.insert(inventoryItemsTable)
      .values({
        name: 'Test Item',
        description: 'A test item',
        item_type: 'digital_book',
        label_code: 'TEST001',
        quantity_total: 5,
        quantity_available: 4,
        location: 'Library',
        purchase_date: new Date(),
        purchase_price: '25.99',
        condition_notes: 'Good condition'
      })
      .returning()
      .execute();

    const itemId = itemResult[0].id;

    // Create active borrowing record
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    await db.insert(borrowingRecordsTable)
      .values({
        item_id: itemId,
        user_id: userId,
        quantity_borrowed: 1,
        borrowed_date: new Date(),
        due_date: dueDate,
        returned_date: null,
        status: 'active',
        notes: 'Test borrowing'
      })
      .execute();

    // Try to delete item with active borrowing
    expect(async () => {
      await deleteInventoryItem(itemId);
    }).toThrow(/cannot delete item with active borrowings/i);

    // Verify item still exists
    const items = await db.select()
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.id, itemId))
      .execute();

    expect(items).toHaveLength(1);
  });

  it('should allow deletion when item has returned borrowings', async () => {
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

    // Create test item
    const itemResult = await db.insert(inventoryItemsTable)
      .values({
        name: 'Test Item',
        description: 'A test item',
        item_type: 'digital_book',
        label_code: 'TEST001',
        quantity_total: 5,
        quantity_available: 5,
        location: 'Library',
        purchase_date: new Date(),
        purchase_price: '25.99',
        condition_notes: 'Good condition'
      })
      .returning()
      .execute();

    const itemId = itemResult[0].id;

    // Create returned borrowing record
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    await db.insert(borrowingRecordsTable)
      .values({
        item_id: itemId,
        user_id: userId,
        quantity_borrowed: 1,
        borrowed_date: new Date(),
        due_date: dueDate,
        returned_date: new Date(),
        status: 'returned',
        notes: 'Test borrowing'
      })
      .execute();

    // Delete item (should succeed as borrowing is returned)
    const deleted = await deleteInventoryItem(itemId);

    expect(deleted).toBe(true);

    // Verify item is deleted
    const items = await db.select()
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.id, itemId))
      .execute();

    expect(items).toHaveLength(0);
  });
});
