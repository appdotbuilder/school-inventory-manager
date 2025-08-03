
import { db } from '../db';
import { inventoryItemsTable, borrowingRecordsTable } from '../db/schema';
import { type ItemUsageReport } from '../schema';
import { eq, count, max, desc } from 'drizzle-orm';

export async function getItemUsageReport(): Promise<ItemUsageReport[]> {
  try {
    // Get all inventory items with their borrowing statistics
    const results = await db
      .select({
        id: inventoryItemsTable.id,
        name: inventoryItemsTable.name,
        label_code: inventoryItemsTable.label_code,
        total_borrows: count(borrowingRecordsTable.id),
        quantity_total: inventoryItemsTable.quantity_total,
        quantity_available: inventoryItemsTable.quantity_available,
        last_borrowed_date: max(borrowingRecordsTable.borrowed_date)
      })
      .from(inventoryItemsTable)
      .leftJoin(
        borrowingRecordsTable,
        eq(inventoryItemsTable.id, borrowingRecordsTable.item_id)
      )
      .groupBy(
        inventoryItemsTable.id,
        inventoryItemsTable.name,
        inventoryItemsTable.label_code,
        inventoryItemsTable.quantity_total,
        inventoryItemsTable.quantity_available
      )
      .orderBy(desc(count(borrowingRecordsTable.id)))
      .execute();

    return results.map(result => ({
      item_id: result.id,
      item_name: result.name,
      label_code: result.label_code,
      total_borrows: result.total_borrows,
      current_borrowed: result.quantity_total - result.quantity_available,
      last_borrowed_date: result.last_borrowed_date
    }));
  } catch (error) {
    console.error('Failed to generate item usage report:', error);
    throw error;
  }
}
