
import { db } from '../db';
import { inventoryItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type InventoryItem } from '../schema';

export const getInventoryItemById = async (id: number): Promise<InventoryItem | null> => {
  try {
    const results = await db.select()
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const item = results[0];
    
    // Convert numeric fields back to numbers
    return {
      ...item,
      purchase_price: item.purchase_price ? parseFloat(item.purchase_price) : null
    };
  } catch (error) {
    console.error('Failed to get inventory item by ID:', error);
    throw error;
  }
};
