
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryItemsTable } from '../db/schema';
import { type CreateInventoryItemInput } from '../schema';
import { getInventoryItemById } from '../handlers/get_inventory_item_by_id';

// Test inventory item input
const testItemInput: CreateInventoryItemInput = {
  name: 'Test Laptop',
  description: 'A laptop for testing purposes',
  item_type: 'it_asset',
  label_code: 'LAP001',
  quantity_total: 5,
  location: 'IT Storage Room',
  purchase_date: new Date('2024-01-15'),
  purchase_price: 899.99,
  condition_notes: 'Excellent condition'
};

describe('getInventoryItemById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return inventory item by ID', async () => {
    // Create test item
    const insertResult = await db.insert(inventoryItemsTable)
      .values({
        ...testItemInput,
        quantity_available: testItemInput.quantity_total,
        purchase_price: testItemInput.purchase_price?.toString()
      })
      .returning()
      .execute();

    const createdItem = insertResult[0];

    // Get item by ID
    const result = await getInventoryItemById(createdItem.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdItem.id);
    expect(result!.name).toEqual('Test Laptop');
    expect(result!.description).toEqual('A laptop for testing purposes');
    expect(result!.item_type).toEqual('it_asset');
    expect(result!.label_code).toEqual('LAP001');
    expect(result!.quantity_total).toEqual(5);
    expect(result!.quantity_available).toEqual(5);
    expect(result!.location).toEqual('IT Storage Room');
    expect(result!.purchase_date).toBeInstanceOf(Date);
    expect(result!.purchase_price).toEqual(899.99);
    expect(typeof result!.purchase_price).toBe('number');
    expect(result!.condition_notes).toEqual('Excellent condition');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent ID', async () => {
    const result = await getInventoryItemById(999);
    expect(result).toBeNull();
  });

  it('should handle item with null purchase_price', async () => {
    // Create item without purchase price
    const itemWithoutPrice = {
      ...testItemInput,
      purchase_price: null
    };

    const insertResult = await db.insert(inventoryItemsTable)
      .values({
        ...itemWithoutPrice,
        quantity_available: itemWithoutPrice.quantity_total
      })
      .returning()
      .execute();

    const createdItem = insertResult[0];

    // Get item by ID
    const result = await getInventoryItemById(createdItem.id);

    expect(result).not.toBeNull();
    expect(result!.purchase_price).toBeNull();
    expect(result!.name).toEqual('Test Laptop');
  });

  it('should handle item with null description and location', async () => {
    // Create minimal item
    const minimalItem = {
      name: 'Basic Item',
      description: null,
      item_type: 'furniture' as const,
      label_code: 'FUR001',
      quantity_total: 1,
      location: null,
      purchase_date: null,
      purchase_price: null,
      condition_notes: null
    };

    const insertResult = await db.insert(inventoryItemsTable)
      .values({
        ...minimalItem,
        quantity_available: minimalItem.quantity_total
      })
      .returning()
      .execute();

    const createdItem = insertResult[0];

    // Get item by ID
    const result = await getInventoryItemById(createdItem.id);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Basic Item');
    expect(result!.description).toBeNull();
    expect(result!.location).toBeNull();
    expect(result!.purchase_date).toBeNull();
    expect(result!.purchase_price).toBeNull();
    expect(result!.condition_notes).toBeNull();
  });
});
