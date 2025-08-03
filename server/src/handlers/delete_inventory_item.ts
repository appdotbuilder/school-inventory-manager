
import { db } from '../db';
import { inventoryItemsTable, borrowingRecordsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function deleteInventoryItem(id: number): Promise<boolean> {
  try {
    // First check if the item exists
    const existingItem = await db.select()
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.id, id))
      .execute();

    if (existingItem.length === 0) {
      return false; // Item doesn't exist
    }

    // Check if there are any active borrowing records for this item
    const activeBorrowings = await db.select()
      .from(borrowingRecordsTable)
      .where(
        and(
          eq(borrowingRecordsTable.item_id, id),
          eq(borrowingRecordsTable.status, 'active')
        )
      )
      .execute();

    if (activeBorrowings.length > 0) {
      // Cannot delete item with active borrowings
      throw new Error('Cannot delete item with active borrowings');
    }

    // Delete the inventory item
    const result = await db.delete(inventoryItemsTable)
      .where(eq(inventoryItemsTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Item deletion failed:', error);
    throw error;
  }
}
