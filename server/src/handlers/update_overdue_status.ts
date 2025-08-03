
import { db } from '../db';
import { borrowingRecordsTable } from '../db/schema';
import { and, eq, lt } from 'drizzle-orm';

export async function updateOverdueStatus(): Promise<number> {
  try {
    // Update records where status is 'active' and due_date is before current time
    const now = new Date();
    
    const result = await db
      .update(borrowingRecordsTable)
      .set({ 
        status: 'overdue',
        updated_at: now
      })
      .where(
        and(
          eq(borrowingRecordsTable.status, 'active'),
          lt(borrowingRecordsTable.due_date, now)
        )
      )
      .execute();

    // Return the count of updated records
    return result.rowCount || 0;
  } catch (error) {
    console.error('Failed to update overdue status:', error);
    throw error;
  }
}
