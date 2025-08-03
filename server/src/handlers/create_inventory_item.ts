
import { db } from '../db';
import { inventoryItemsTable } from '../db/schema';
import { type CreateInventoryItemInput, type InventoryItem } from '../schema';

export const createInventoryItem = async (input: CreateInventoryItemInput): Promise<InventoryItem> => {
  try {
    // Insert inventory item record
    const result = await db.insert(inventoryItemsTable)
      .values({
        name: input.name,
        description: input.description,
        item_type: input.item_type,
        label_code: input.label_code,
        quantity_total: input.quantity_total,
        quantity_available: input.quantity_total, // Initially all items are available
        location: input.location,
        purchase_date: input.purchase_date,
        purchase_price: input.purchase_price ? input.purchase_price.toString() : null, // Convert number to string for numeric column
        condition_notes: input.condition_notes
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const item = result[0];
    return {
      ...item,
      purchase_price: item.purchase_price ? parseFloat(item.purchase_price) : null // Convert string back to number
    };
  } catch (error) {
    console.error('Inventory item creation failed:', error);
    throw error;
  }
};
