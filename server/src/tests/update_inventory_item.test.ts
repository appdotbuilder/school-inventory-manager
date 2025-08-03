
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryItemsTable, usersTable, borrowingRecordsTable } from '../db/schema';
import { type UpdateInventoryItemInput, type CreateInventoryItemInput, type CreateUserInput, type CreateBorrowingRecordInput } from '../schema';
import { updateInventoryItem } from '../handlers/update_inventory_item';
import { eq } from 'drizzle-orm';

describe('updateInventoryItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create test inventory item
  const createTestItem = async (): Promise<number> => {
    const testInput: CreateInventoryItemInput = {
      name: 'Original Item',
      description: 'Original description',
      item_type: 'digital_book',
      label_code: 'ORIG001',
      quantity_total: 50,
      location: 'Original Location',
      purchase_date: new Date('2023-01-01'),
      purchase_price: 99.99,
      condition_notes: 'Original condition'
    };

    const result = await db.insert(inventoryItemsTable)
      .values({
        ...testInput,
        quantity_available: testInput.quantity_total,
        purchase_price: testInput.purchase_price?.toString()
      })
      .returning()
      .execute();

    return result[0].id;
  };

  it('should update basic item fields', async () => {
    const itemId = await createTestItem();

    const updateInput: UpdateInventoryItemInput = {
      id: itemId,
      name: 'Updated Item Name',
      description: 'Updated description',
      item_type: 'laboratory_equipment',
      location: 'Updated Location',
      condition_notes: 'Updated condition'
    };

    const result = await updateInventoryItem(updateInput);

    expect(result.id).toBe(itemId);
    expect(result.name).toBe('Updated Item Name');
    expect(result.description).toBe('Updated description');
    expect(result.item_type).toBe('laboratory_equipment');
    expect(result.location).toBe('Updated Location');
    expect(result.condition_notes).toBe('Updated condition');
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify fields not updated remain unchanged
    expect(result.label_code).toBe('ORIG001');
    expect(result.quantity_total).toBe(50);
    expect(result.purchase_price).toBe(99.99);
  });

  it('should update numeric fields correctly', async () => {
    const itemId = await createTestItem();

    const updateInput: UpdateInventoryItemInput = {
      id: itemId,
      quantity_total: 75,
      purchase_price: 149.99
    };

    const result = await updateInventoryItem(updateInput);

    expect(result.quantity_total).toBe(75);
    expect(result.quantity_available).toBe(75); // No borrowings, so available equals total
    expect(result.purchase_price).toBe(149.99);
    expect(typeof result.purchase_price).toBe('number');
  });

  it('should update quantity_available when quantity_total changes', async () => {
    const itemId = await createTestItem();

    // Create a user and borrowing record first
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

    // Create borrowing record for 10 items
    await db.insert(borrowingRecordsTable)
      .values({
        item_id: itemId,
        user_id: userId,
        quantity_borrowed: 10,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'active',
        notes: null
      })
      .execute();

    // Update total quantity to 60
    const updateInput: UpdateInventoryItemInput = {
      id: itemId,
      quantity_total: 60
    };

    const result = await updateInventoryItem(updateInput);

    expect(result.quantity_total).toBe(60);
    expect(result.quantity_available).toBe(50); // 60 total - 10 borrowed = 50 available
  });

  it('should handle nullable fields correctly', async () => {
    const itemId = await createTestItem();

    const updateInput: UpdateInventoryItemInput = {
      id: itemId,
      description: null,
      location: null,
      purchase_date: null,
      purchase_price: null,
      condition_notes: null
    };

    const result = await updateInventoryItem(updateInput);

    expect(result.description).toBeNull();
    expect(result.location).toBeNull();
    expect(result.purchase_date).toBeNull();
    expect(result.purchase_price).toBeNull();
    expect(result.condition_notes).toBeNull();
  });

  it('should save updates to database', async () => {
    const itemId = await createTestItem();

    const updateInput: UpdateInventoryItemInput = {
      id: itemId,
      name: 'Database Test Item',
      purchase_price: 199.99
    };

    await updateInventoryItem(updateInput);

    // Verify changes are persisted
    const items = await db.select()
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.id, itemId))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Database Test Item');
    expect(parseFloat(items[0].purchase_price || '0')).toBe(199.99);
    expect(items[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when item does not exist', async () => {
    const updateInput: UpdateInventoryItemInput = {
      id: 99999,
      name: 'Non-existent Item'
    };

    expect(updateInventoryItem(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should throw error when reducing quantity below borrowed amount', async () => {
    const itemId = await createTestItem();

    // Create user and borrowing record
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

    await db.insert(borrowingRecordsTable)
      .values({
        item_id: itemId,
        user_id: userResult[0].id,
        quantity_borrowed: 30,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'active',
        notes: null
      })
      .execute();

    // Try to set total quantity less than borrowed amount
    const updateInput: UpdateInventoryItemInput = {
      id: itemId,
      quantity_total: 20 // Less than 30 borrowed
    };

    expect(updateInventoryItem(updateInput)).rejects.toThrow(/Cannot set total quantity/i);
  });

  it('should only update fields that are provided', async () => {
    const itemId = await createTestItem();

    // Update only name, leave everything else unchanged
    const updateInput: UpdateInventoryItemInput = {
      id: itemId,
      name: 'Only Name Updated'
    };

    const result = await updateInventoryItem(updateInput);

    expect(result.name).toBe('Only Name Updated');
    // Original values should remain
    expect(result.description).toBe('Original description');
    expect(result.item_type).toBe('digital_book');
    expect(result.label_code).toBe('ORIG001');
    expect(result.quantity_total).toBe(50);
    expect(result.location).toBe('Original Location');
    expect(result.purchase_price).toBe(99.99);
    expect(result.condition_notes).toBe('Original condition');
  });
});
