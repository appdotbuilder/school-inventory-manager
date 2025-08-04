
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createAdminInputSchema,
  createInventoryItemInputSchema,
  updateInventoryItemInputSchema,
  createUserInputSchema,
  createBorrowingRecordInputSchema,
  returnItemInputSchema
} from './schema';

// Import handlers
import { createAdmin } from './handlers/create_admin';
import { createInventoryItem } from './handlers/create_inventory_item';
import { updateInventoryItem } from './handlers/update_inventory_item';
import { getInventoryItems } from './handlers/get_inventory_items';
import { getInventoryItemById } from './handlers/get_inventory_item_by_id';
import { deleteInventoryItem } from './handlers/delete_inventory_item';
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { createBorrowingRecord } from './handlers/create_borrowing_record';
import { returnItem } from './handlers/return_item';
import { getBorrowingRecords } from './handlers/get_borrowing_records';
import { getActiveBorrowings } from './handlers/get_active_borrowings';
import { getOverdueItems } from './handlers/get_overdue_items';
import { updateOverdueStatus } from './handlers/update_overdue_status';
import { getDashboardStats } from './handlers/get_dashboard_stats';
import { getItemUsageReport } from './handlers/get_item_usage_report';
import { searchItemsByLabel } from './handlers/search_items_by_label';
import { seedDefaultAdmin } from './handlers/seed_default_admin';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Admin authentication
  createAdmin: publicProcedure
    .input(createAdminInputSchema)
    .mutation(({ input }) => createAdmin(input)),

  // Inventory management
  createInventoryItem: publicProcedure
    .input(createInventoryItemInputSchema)
    .mutation(({ input }) => createInventoryItem(input)),
  
  updateInventoryItem: publicProcedure
    .input(updateInventoryItemInputSchema)
    .mutation(({ input }) => updateInventoryItem(input)),
  
  getInventoryItems: publicProcedure
    .query(() => getInventoryItems()),
  
  getInventoryItemById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getInventoryItemById(input.id)),
  
  deleteInventoryItem: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteInventoryItem(input.id)),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),

  // Borrowing management
  createBorrowingRecord: publicProcedure
    .input(createBorrowingRecordInputSchema)
    .mutation(({ input }) => createBorrowingRecord(input)),
  
  returnItem: publicProcedure
    .input(returnItemInputSchema)
    .mutation(({ input }) => returnItem(input)),
  
  getBorrowingRecords: publicProcedure
    .query(() => getBorrowingRecords()),
  
  getActiveBorrowings: publicProcedure
    .query(() => getActiveBorrowings()),
  
  getOverdueItems: publicProcedure
    .query(() => getOverdueItems()),
  
  updateOverdueStatus: publicProcedure
    .mutation(() => updateOverdueStatus()),

  // Dashboard and reports
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),
  
  getItemUsageReport: publicProcedure
    .query(() => getItemUsageReport()),

  // Search functionality
  searchItemsByLabel: publicProcedure
    .input(z.object({ labelCode: z.string() }))
    .query(({ input }) => searchItemsByLabel(input.labelCode)),
});

export type AppRouter = typeof appRouter;

async function start() {
  // Seed default admin account on startup
  await seedDefaultAdmin();
  
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`School Inventory Management TRPC server listening at port: ${port}`);
}

start();
