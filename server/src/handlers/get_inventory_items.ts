
import { db } from '../db';
import { inventoryItemsTable } from '../db/schema';
import { type InventoryItem } from '../schema';

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  try {
    const result = await db.select()
      .from(inventoryItemsTable)
      .execute();

    // Convert numeric fields back to numbers
    return result.map(item => ({
      ...item,
      purchase_price: item.purchase_price ? parseFloat(item.purchase_price) : null
    }));
  } catch (error) {
    console.error('Failed to fetch inventory items:', error);
    throw error;
  }
};
