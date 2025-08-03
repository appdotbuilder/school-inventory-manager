
import { db } from '../db';
import { borrowingRecordsTable, inventoryItemsTable, usersTable } from '../db/schema';
import { type BorrowingRecord } from '../schema';
import { eq } from 'drizzle-orm';

export async function getBorrowingRecords(): Promise<BorrowingRecord[]> {
  try {
    const results = await db.select()
      .from(borrowingRecordsTable)
      .innerJoin(inventoryItemsTable, eq(borrowingRecordsTable.item_id, inventoryItemsTable.id))
      .innerJoin(usersTable, eq(borrowingRecordsTable.user_id, usersTable.id))
      .execute();

    return results.map(result => ({
      id: result.borrowing_records.id,
      item_id: result.borrowing_records.item_id,
      user_id: result.borrowing_records.user_id,
      quantity_borrowed: result.borrowing_records.quantity_borrowed,
      borrowed_date: result.borrowing_records.borrowed_date,
      due_date: result.borrowing_records.due_date,
      returned_date: result.borrowing_records.returned_date,
      status: result.borrowing_records.status,
      notes: result.borrowing_records.notes,
      created_at: result.borrowing_records.created_at,
      updated_at: result.borrowing_records.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch borrowing records:', error);
    throw error;
  }
}
