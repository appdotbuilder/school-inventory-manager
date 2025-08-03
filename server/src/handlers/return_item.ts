
import { db } from '../db';
import { borrowingRecordsTable, inventoryItemsTable } from '../db/schema';
import { type ReturnItemInput, type BorrowingRecord } from '../schema';
import { eq, sql } from 'drizzle-orm';

export async function returnItem(input: ReturnItemInput): Promise<BorrowingRecord> {
  try {
    // First, get the borrowing record to validate it exists and is active
    const borrowingRecords = await db.select()
      .from(borrowingRecordsTable)
      .where(eq(borrowingRecordsTable.id, input.borrowing_record_id))
      .execute();

    if (borrowingRecords.length === 0) {
      throw new Error('Borrowing record not found');
    }

    const borrowingRecord = borrowingRecords[0];

    if (borrowingRecord.status !== 'active' && borrowingRecord.status !== 'overdue') {
      throw new Error('Item has already been returned');
    }

    // Update the borrowing record - set returned_date, status, and notes
    const updatedRecords = await db.update(borrowingRecordsTable)
      .set({
        returned_date: new Date(),
        status: 'returned',
        notes: input.notes,
        updated_at: new Date()
      })
      .where(eq(borrowingRecordsTable.id, input.borrowing_record_id))
      .returning()
      .execute();

    const updatedRecord = updatedRecords[0];

    // Update the inventory item - increase quantity_available using SQL increment
    await db.update(inventoryItemsTable)
      .set({
        quantity_available: sql`${inventoryItemsTable.quantity_available} + ${borrowingRecord.quantity_borrowed}`,
        updated_at: new Date()
      })
      .where(eq(inventoryItemsTable.id, borrowingRecord.item_id))
      .execute();

    return updatedRecord;
  } catch (error) {
    console.error('Item return failed:', error);
    throw error;
  }
}
