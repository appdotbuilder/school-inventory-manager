
import { db } from '../db';
import { inventoryItemsTable, borrowingRecordsTable, usersTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { eq, count, sum, and, sql } from 'drizzle-orm';

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get total items count
    const totalItemsResult = await db.select({
      count: count()
    }).from(inventoryItemsTable).execute();
    
    const total_items = Number(totalItemsResult[0]?.count || 0);

    // Get total borrowed quantity (active borrowings only)
    const totalBorrowedResult = await db.select({
      total: sum(borrowingRecordsTable.quantity_borrowed)
    })
    .from(borrowingRecordsTable)
    .where(eq(borrowingRecordsTable.status, 'active'))
    .execute();

    const total_borrowed = Number(totalBorrowedResult[0]?.total || 0);

    // Get overdue items count
    const currentDate = new Date();
    const overdueItemsResult = await db.select({
      count: count()
    })
    .from(borrowingRecordsTable)
    .where(
      and(
        eq(borrowingRecordsTable.status, 'active'),
        sql`${borrowingRecordsTable.due_date} < ${currentDate}`
      )
    )
    .execute();

    const overdue_items = Number(overdueItemsResult[0]?.count || 0);

    // Get available items (sum of quantity_available)
    const availableItemsResult = await db.select({
      total: sum(inventoryItemsTable.quantity_available)
    }).from(inventoryItemsTable).execute();

    const available_items = Number(availableItemsResult[0]?.total || 0);

    // Get active borrowers count (distinct users with active borrowings)
    const activeBorrowersResult = await db.select({
      count: sql<string>`count(distinct ${borrowingRecordsTable.user_id})`
    })
    .from(borrowingRecordsTable)
    .where(eq(borrowingRecordsTable.status, 'active'))
    .execute();

    const active_borrowers = Number(activeBorrowersResult[0]?.count || 0);

    return {
      total_items,
      total_borrowed,
      overdue_items,
      available_items,
      active_borrowers
    };
  } catch (error) {
    console.error('Dashboard stats calculation failed:', error);
    throw error;
  }
}
