
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryItemsTable } from '../db/schema';
import { type CreateInventoryItemInput } from '../schema';
import { searchItemsByLabel } from '../handlers/search_items_by_label';

// Test inventory items
const testItems: CreateInventoryItemInput[] = [
  {
    name: 'Digital Physics Book',
    description: 'Advanced physics textbook',
    item_type: 'digital_book',
    label_code: 'DB001',
    quantity_total: 1,
    location: 'Digital Library',
    purchase_date: new Date('2024-01-15'),
    purchase_price: 29.99,
    condition_notes: 'New digital copy'
  },
  {
    name: 'Microscope',
    description: 'High-powered laboratory microscope',
    item_type: 'laboratory_equipment',
    label_code: 'LAB001',
    quantity_total: 5,
    location: 'Lab Room A',
    purchase_date: new Date('2023-08-20'),
    purchase_price: 1200.50,
    condition_notes: 'Excellent condition'
  },
  {
    name: 'Office Chair',
    description: 'Ergonomic office chair',
    item_type: 'furniture',
    label_code: 'FUR001',
    quantity_total: 10,
    location: 'Office Building',
    purchase_date: new Date('2023-09-10'),
    purchase_price: 150.00,
    condition_notes: null
  },
  {
    name: 'Laptop Computer',
    description: 'Student laptop for programming',
    item_type: 'it_asset',
    label_code: 'IT001',
    quantity_total: 25,
    location: 'Computer Lab',
    purchase_date: new Date('2024-02-01'),
    purchase_price: 800.75,
    condition_notes: 'Good working condition'
  }
];

describe('searchItemsByLabel', () => {
  beforeEach(async () => {
    await createDB();
    
    // Insert test items
    for (const item of testItems) {
      await db.insert(inventoryItemsTable)
        .values({
          ...item,
          quantity_available: item.quantity_total,
          purchase_price: item.purchase_price?.toString()
        })
        .execute();
    }
  });

  afterEach(resetDB);

  it('should find exact label code match', async () => {
    const result = await searchItemsByLabel('DB001');

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Digital Physics Book');
    expect(result[0].label_code).toEqual('DB001');
    expect(result[0].item_type).toEqual('digital_book');
    expect(result[0].purchase_price).toEqual(29.99);
    expect(typeof result[0].purchase_price).toBe('number');
  });

  it('should find partial label code matches', async () => {
    const result = await searchItemsByLabel('001');

    expect(result).toHaveLength(4);
    const labelCodes = result.map(item => item.label_code);
    expect(labelCodes).toContain('DB001');
    expect(labelCodes).toContain('LAB001');
    expect(labelCodes).toContain('FUR001');
    expect(labelCodes).toContain('IT001');
  });

  it('should be case insensitive', async () => {
    const result = await searchItemsByLabel('lab001');

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Microscope');
    expect(result[0].label_code).toEqual('LAB001');
    expect(result[0].purchase_price).toEqual(1200.50);
  });

  it('should find items with prefix search', async () => {
    const result = await searchItemsByLabel('LAB');

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Microscope');
    expect(result[0].label_code).toEqual('LAB001');
  });

  it('should return empty array for non-existent label', async () => {
    const result = await searchItemsByLabel('NONEXISTENT');

    expect(result).toHaveLength(0);
  });

  it('should handle null purchase_price correctly', async () => {
    // Create item without purchase price
    await db.insert(inventoryItemsTable)
      .values({
        name: 'Free Item',
        description: 'Item with no price',
        item_type: 'furniture',
        label_code: 'FREE001',
        quantity_total: 1,
        quantity_available: 1,
        location: 'Storage',
        purchase_date: null,
        purchase_price: null,
        condition_notes: null
      })
      .execute();

    const result = await searchItemsByLabel('FREE001');

    expect(result).toHaveLength(1);
    expect(result[0].purchase_price).toBeNull();
  });

  it('should return all numeric fields as numbers', async () => {
    const result = await searchItemsByLabel('IT001');

    expect(result).toHaveLength(1);
    const item = result[0];
    expect(typeof item.id).toBe('number');
    expect(typeof item.quantity_total).toBe('number');
    expect(typeof item.quantity_available).toBe('number');
    expect(typeof item.purchase_price).toBe('number');
    expect(item.purchase_price).toEqual(800.75);
  });
});
