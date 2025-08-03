
import { db } from '../db';
import { adminsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type AdminLoginInput, type Admin } from '../schema';

export async function adminLogin(input: AdminLoginInput): Promise<{ admin: Admin; token: string } | null> {
  try {
    // Find admin by username
    const adminResults = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.username, input.username))
      .execute();

    if (adminResults.length === 0) {
      return null; // Admin not found
    }

    const adminRecord = adminResults[0];

    // Simple password comparison (in production, use proper password hashing)
    if (input.password !== adminRecord.password_hash) {
      return null; // Invalid password
    }

    // Generate simple token (in production, use proper JWT)
    const token = `admin-${adminRecord.id}-${Date.now()}`;

    // Return admin info
    const admin: Admin = {
      id: adminRecord.id,
      username: adminRecord.username,
      email: adminRecord.email,
      password_hash: adminRecord.password_hash,
      created_at: adminRecord.created_at
    };

    return { admin, token };
  } catch (error) {
    console.error('Admin login failed:', error);
    throw error;
  }
}
