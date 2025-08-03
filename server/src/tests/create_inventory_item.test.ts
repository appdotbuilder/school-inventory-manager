
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryItemsTable } from '../db/schema';
import { type CreateInventoryItemInput } from '../schema';
import { createInventoryItem } from '../handlers/create_inventory_item';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateInventoryItemInput = {
  name: 'Test Laptop',
  description: 'A laptop for testing purposes',
  item_type: 'it_asset',
  label_code: 'LAPTOP-001',
  quantity_total: 5,
  location: 'Room 101',
  purchase_date: new Date('2024-01-15'),
  purchase_price: 999.99,
  condition_notes: 'New condition'
};

// Test input with minimal fields
const minimalInput: CreateInventoryItemInput = {
  name: 'Basic Item',
  description: null,
  item_type: 'furniture',
  label_code: 'FURN-001',
  quantity_total: 1,
  location: null,
  purchase_date: null,
  purchase_price: null,
  condition_notes: null
};

describe('createInventoryItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an inventory item with all fields', async () => {
    const result = await createInventoryItem(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Laptop');
    expect(result.description).toEqual('A laptop for testing purposes');
    expect(result.item_type).toEqual('it_asset');
    expect(result.label_code).toEqual('LAPTOP-001');
    expect(result.quantity_total).toEqual(5);
    expect(result.quantity_available).toEqual(5); // Should equal quantity_total initially
    expect(result.location).toEqual('Room 101');
    expect(result.purchase_date).toEqual(new Date('2024-01-15'));
    expect(result.purchase_price).toEqual(999.99);
    expect(typeof result.purchase_price).toEqual('number');
    expect(result.condition_notes).toEqual('New condition');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an inventory item with minimal fields', async () => {
    const result = await createInventoryItem(minimalInput);

    expect(result.name).toEqual('Basic Item');
    expect(result.description).toBeNull();
    expect(result.item_type).toEqual('furniture');
    expect(result.label_code).toEqual('FURN-001');
    expect(result.quantity_total).toEqual(1);
    expect(result.quantity_available).toEqual(1);
    expect(result.location).toBeNull();
    expect(result.purchase_date).toBeNull();
    expect(result.purchase_price).toBeNull();
    expect(result.condition_notes).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save inventory item to database', async () => {
    const result = await createInventoryItem(testInput);

    // Query using proper drizzle syntax
    const items = await db.select()
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.id, result.id))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].name).toEqual('Test Laptop');
    expect(items[0].description).toEqual('A laptop for testing purposes');
    expect(items[0].item_type).toEqual('it_asset');
    expect(items[0].label_code).toEqual('LAPTOP-001');
    expect(items[0].quantity_total).toEqual(5);
    expect(items[0].quantity_available).toEqual(5);
    expect(items[0].location).toEqual('Room 101');
    expect(items[0].purchase_date).toEqual(new Date('2024-01-15'));
    expect(parseFloat(items[0].purchase_price!)).toEqual(999.99);
    expect(items[0].condition_notes).toEqual('New condition');
    expect(items[0].created_at).toBeInstanceOf(Date);
    expect(items[0].updated_at).toBeInstanceOf(Date);
  });

  it('should enforce unique label codes', async () => {
    // Create first item
    await createInventoryItem(testInput);

    // Try to create another item with the same label code
    const duplicateInput = {
      ...testInput,
      name: 'Another Laptop'
    };

    await expect(createInventoryItem(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should set quantity_available equal to quantity_total initially', async () => {
    const result = await createInventoryItem({
      ...testInput,
      quantity_total: 10
    });

    expect(result.quantity_available).toEqual(10);
    expect(result.quantity_available).toEqual(result.quantity_total);
  });

  it('should handle different item types correctly', async () => {
    const digitalBookInput: CreateInventoryItemInput = {
      ...minimalInput,
      name: 'Digital Book',
      item_type: 'digital_book',
      label_code: 'BOOK-001'
    };

    const labEquipmentInput: CreateInventoryItemInput = {
      ...minimalInput,
      name: 'Microscope',
      item_type: 'laboratory_equipment',
      label_code: 'LAB-001'
    };

    const bookResult = await createInventoryItem(digitalBookInput);
    const labResult = await createInventoryItem(labEquipmentInput);

    expect(bookResult.item_type).toEqual('digital_book');
    expect(labResult.item_type).toEqual('laboratory_equipment');
  });
});
