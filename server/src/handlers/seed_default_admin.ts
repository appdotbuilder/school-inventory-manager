import { db } from '../db';
import { adminsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Admin } from '../schema';

export const seedDefaultAdmin = async (): Promise<void> => {
  try {
    // Check if the default admin 'fajar' already exists
    const existingAdmin = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.username, 'fajar'))
      .limit(1)
      .execute();

    // If admin doesn't exist, create it
    if (existingAdmin.length === 0) {
      // Hash the password using Bun's built-in password hashing
      const password_hash = await Bun.password.hash('fajar');

      // Insert default admin record
      await db.insert(adminsTable)
        .values({
          username: 'fajar',
          email: 'fajar@school.edu',
          password_hash: password_hash
        })
        .execute();

      console.log('Default admin account created successfully (username: fajar, password: fajar)');
    } else {
      console.log('Default admin account already exists');
    }
  } catch (error) {
    console.error('Failed to seed default admin account:', error);
    // Don't throw error to prevent app startup failure
  }
};