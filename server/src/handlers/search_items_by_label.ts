
import { db } from '../db';
import { inventoryItemsTable } from '../db/schema';
import { type InventoryItem } from '../schema';
import { ilike } from 'drizzle-orm';

export async function searchItemsByLabel(labelCode: string): Promise<InventoryItem[]> {
  try {
    const results = await db.select()
      .from(inventoryItemsTable)
      .where(ilike(inventoryItemsTable.label_code, `%${labelCode}%`))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(item => ({
      ...item,
      purchase_price: item.purchase_price ? parseFloat(item.purchase_price) : null
    }));
  } catch (error) {
    console.error('Item search by label failed:', error);
    throw error;
  }
}
