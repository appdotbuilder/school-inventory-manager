
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryItemsTable } from '../db/schema';
import { type CreateInventoryItemInput } from '../schema';
import { getInventoryItems } from '../handlers/get_inventory_items';

const testItem: CreateInventoryItemInput = {
  name: 'Test Laboratory Equipment',
  description: 'A piece of test equipment',
  item_type: 'laboratory_equipment',
  label_code: 'LAB001',
  quantity_total: 5,
  location: 'Lab Room A',
  purchase_date: new Date('2024-01-15'),
  purchase_price: 299.99,
  condition_notes: 'Good condition'
};

const testItemWithoutOptionals: CreateInventoryItemInput = {
  name: 'Basic Item',
  description: null,
  item_type: 'furniture',
  label_code: 'FUR001',
  quantity_total: 10,
  location: null,
  purchase_date: null,
  purchase_price: null,
  condition_notes: null
};

describe('getInventoryItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no items exist', async () => {
    const result = await getInventoryItems();
    expect(result).toEqual([]);
  });

  it('should return all inventory items', async () => {
    // Create test items
    await db.insert(inventoryItemsTable)
      .values([
        {
          name: testItem.name,
          description: testItem.description,
          item_type: testItem.item_type,
          label_code: testItem.label_code,
          quantity_total: testItem.quantity_total,
          quantity_available: testItem.quantity_total, // Default to total
          location: testItem.location,
          purchase_date: testItem.purchase_date,
          purchase_price: testItem.purchase_price?.toString(),
          condition_notes: testItem.condition_notes
        },
        {
          name: testItemWithoutOptionals.name,
          description: testItemWithoutOptionals.description,
          item_type: testItemWithoutOptionals.item_type,
          label_code: testItemWithoutOptionals.label_code,
          quantity_total: testItemWithoutOptionals.quantity_total,
          quantity_available: testItemWithoutOptionals.quantity_total,
          location: testItemWithoutOptionals.location,
          purchase_date: testItemWithoutOptionals.purchase_date,
          purchase_price: testItemWithoutOptionals.purchase_price?.toString() || null,
          condition_notes: testItemWithoutOptionals.condition_notes
        }
      ])
      .execute();

    const result = await getInventoryItems();

    expect(result).toHaveLength(2);
    
    // Check first item with all fields
    const firstItem = result.find(item => item.label_code === 'LAB001');
    expect(firstItem).toBeDefined();
    expect(firstItem!.name).toEqual('Test Laboratory Equipment');
    expect(firstItem!.description).toEqual('A piece of test equipment');
    expect(firstItem!.item_type).toEqual('laboratory_equipment');
    expect(firstItem!.quantity_total).toEqual(5);
    expect(firstItem!.quantity_available).toEqual(5);
    expect(firstItem!.location).toEqual('Lab Room A');
    expect(firstItem!.purchase_date).toBeInstanceOf(Date);
    expect(firstItem!.purchase_price).toEqual(299.99);
    expect(typeof firstItem!.purchase_price).toBe('number');
    expect(firstItem!.condition_notes).toEqual('Good condition');
    expect(firstItem!.id).toBeDefined();
    expect(firstItem!.created_at).toBeInstanceOf(Date);
    expect(firstItem!.updated_at).toBeInstanceOf(Date);

    // Check second item with null values
    const secondItem = result.find(item => item.label_code === 'FUR001');
    expect(secondItem).toBeDefined();
    expect(secondItem!.name).toEqual('Basic Item');
    expect(secondItem!.description).toBeNull();
    expect(secondItem!.item_type).toEqual('furniture');
    expect(secondItem!.quantity_total).toEqual(10);
    expect(secondItem!.location).toBeNull();
    expect(secondItem!.purchase_date).toBeNull();
    expect(secondItem!.purchase_price).toBeNull();
    expect(secondItem!.condition_notes).toBeNull();
  });

  it('should handle numeric conversion correctly', async () => {
    // Create item with purchase price
    await db.insert(inventoryItemsTable)
      .values({
        name: 'Price Test Item',
        description: 'Testing price conversion',
        item_type: 'it_asset',
        label_code: 'IT001',
        quantity_total: 1,
        quantity_available: 1,
        location: 'IT Room',
        purchase_date: new Date(),
        purchase_price: '1234.56', // Insert as string
        condition_notes: null
      })
      .execute();

    const result = await getInventoryItems();

    expect(result).toHaveLength(1);
    expect(result[0].purchase_price).toEqual(1234.56);
    expect(typeof result[0].purchase_price).toBe('number');
  });

  it('should return items sorted by creation order', async () => {
    // Create multiple items
    const items = [
      { name: 'First Item', label_code: 'TEST001' },
      { name: 'Second Item', label_code: 'TEST002' },
      { name: 'Third Item', label_code: 'TEST003' }
    ];

    for (const item of items) {
      await db.insert(inventoryItemsTable)
        .values({
          name: item.name,
          description: null,
          item_type: 'digital_book',
          label_code: item.label_code,
          quantity_total: 1,
          quantity_available: 1,
          location: null,
          purchase_date: null,
          purchase_price: null,
          condition_notes: null
        })
        .execute();
    }

    const result = await getInventoryItems();

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('First Item');
    expect(result[1].name).toEqual('Second Item');
    expect(result[2].name).toEqual('Third Item');
  });
});
