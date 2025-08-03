
import { db } from '../db';
import { inventoryItemsTable, borrowingRecordsTable } from '../db/schema';
import { type UpdateInventoryItemInput, type InventoryItem } from '../schema';
import { eq, sum, and } from 'drizzle-orm';

export async function updateInventoryItem(input: UpdateInventoryItemInput): Promise<InventoryItem> {
  try {
    // First, verify the item exists
    const existingItems = await db.select()
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.id, input.id))
      .execute();

    if (existingItems.length === 0) {
      throw new Error(`Inventory item with id ${input.id} not found`);
    }

    const existingItem = existingItems[0];

    // Prepare update data - only include fields that are provided
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.item_type !== undefined) updateData.item_type = input.item_type;
    if (input.label_code !== undefined) updateData.label_code = input.label_code;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.purchase_date !== undefined) updateData.purchase_date = input.purchase_date;
    if (input.purchase_price !== undefined) {
      updateData.purchase_price = input.purchase_price !== null ? input.purchase_price.toString() : null;
    }
    if (input.condition_notes !== undefined) updateData.condition_notes = input.condition_notes;

    // Handle quantity_total update - need to recalculate quantity_available
    if (input.quantity_total !== undefined) {
      updateData.quantity_total = input.quantity_total;

      // Calculate currently borrowed quantity
      const borrowedResult = await db.select({
        total_borrowed: sum(borrowingRecordsTable.quantity_borrowed)
      })
        .from(borrowingRecordsTable)
        .where(
          and(
            eq(borrowingRecordsTable.item_id, input.id),
            eq(borrowingRecordsTable.status, 'active')
          )
        )
        .execute();

      const totalBorrowed = parseInt(borrowedResult[0]?.total_borrowed || '0');
      updateData.quantity_available = input.quantity_total - totalBorrowed;

      // Validate that new total quantity is not less than currently borrowed
      if (updateData.quantity_available < 0) {
        throw new Error(`Cannot set total quantity to ${input.quantity_total}. Currently ${totalBorrowed} items are borrowed.`);
      }
    }

    // Update the item
    const updatedItems = await db.update(inventoryItemsTable)
      .set(updateData)
      .where(eq(inventoryItemsTable.id, input.id))
      .returning()
      .execute();

    const updatedItem = updatedItems[0];

    // Convert numeric fields back to numbers
    return {
      ...updatedItem,
      purchase_price: updatedItem.purchase_price ? parseFloat(updatedItem.purchase_price) : null
    };
  } catch (error) {
    console.error('Inventory item update failed:', error);
    throw error;
  }
}
