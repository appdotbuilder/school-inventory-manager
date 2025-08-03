
import { db } from '../db';
import { borrowingRecordsTable, inventoryItemsTable, usersTable } from '../db/schema';
import { type OverdueItem } from '../schema';
import { eq, lt } from 'drizzle-orm';

export async function getOverdueItems(): Promise<OverdueItem[]> {
  try {
    const currentDate = new Date();
    
    // Query overdue borrowing records with item and user information
    const results = await db.select({
      borrowing_record_id: borrowingRecordsTable.id,
      item_name: inventoryItemsTable.name,
      label_code: inventoryItemsTable.label_code,
      user_name: usersTable.name,
      user_email: usersTable.email,
      borrowed_date: borrowingRecordsTable.borrowed_date,
      due_date: borrowingRecordsTable.due_date,
    })
    .from(borrowingRecordsTable)
    .innerJoin(inventoryItemsTable, eq(borrowingRecordsTable.item_id, inventoryItemsTable.id))
    .innerJoin(usersTable, eq(borrowingRecordsTable.user_id, usersTable.id))
    .where(
      eq(borrowingRecordsTable.status, 'overdue')
    )
    .execute();

    // Calculate days overdue for each record
    return results.map(result => {
      const daysOverdue = Math.floor(
        (currentDate.getTime() - result.due_date.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        borrowing_record_id: result.borrowing_record_id,
        item_name: result.item_name,
        label_code: result.label_code,
        user_name: result.user_name,
        user_email: result.user_email,
        borrowed_date: result.borrowed_date,
        due_date: result.due_date,
        days_overdue: daysOverdue
      };
    });
  } catch (error) {
    console.error('Failed to get overdue items:', error);
    throw error;
  }
}
