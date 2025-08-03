
import { db } from '../db';
import { borrowingRecordsTable, inventoryItemsTable, usersTable } from '../db/schema';
import { type CreateBorrowingRecordInput, type BorrowingRecord } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const createBorrowingRecord = async (input: CreateBorrowingRecordInput): Promise<BorrowingRecord> => {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Verify item exists and check availability
    const item = await db.select()
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.id, input.item_id))
      .execute();

    if (item.length === 0) {
      throw new Error(`Item with id ${input.item_id} not found`);
    }

    const inventoryItem = item[0];
    if (inventoryItem.quantity_available < input.quantity_borrowed) {
      throw new Error(`Insufficient quantity available. Requested: ${input.quantity_borrowed}, Available: ${inventoryItem.quantity_available}`);
    }

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + input.borrowing_duration_days);

    // Create borrowing record and update item availability in a transaction
    const result = await db.transaction(async (tx) => {
      // Update inventory item quantity
      await tx.update(inventoryItemsTable)
        .set({
          quantity_available: sql`${inventoryItemsTable.quantity_available} - ${input.quantity_borrowed}`,
          updated_at: new Date()
        })
        .where(eq(inventoryItemsTable.id, input.item_id))
        .execute();

      // Create borrowing record
      const borrowingResult = await tx.insert(borrowingRecordsTable)
        .values({
          item_id: input.item_id,
          user_id: input.user_id,
          quantity_borrowed: input.quantity_borrowed,
          due_date: dueDate,
          notes: input.notes
        })
        .returning()
        .execute();

      return borrowingResult[0];
    });

    return result;
  } catch (error) {
    console.error('Borrowing record creation failed:', error);
    throw error;
  }
};
