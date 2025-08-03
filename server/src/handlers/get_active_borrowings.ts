
import { db } from '../db';
import { borrowingRecordsTable } from '../db/schema';
import { type BorrowingRecord } from '../schema';
import { or, eq } from 'drizzle-orm';

export const getActiveBorrowings = async (): Promise<BorrowingRecord[]> => {
  try {
    const results = await db.select()
      .from(borrowingRecordsTable)
      .where(
        or(
          eq(borrowingRecordsTable.status, 'active'),
          eq(borrowingRecordsTable.status, 'overdue')
        )
      )
      .execute();

    // Return results directly - borrowing records don't have numeric fields that need conversion
    return results;
  } catch (error) {
    console.error('Failed to fetch active borrowings:', error);
    throw error;
  }
};
