
import { db } from '../db';
import { adminsTable } from '../db/schema';
import { type CreateAdminInput, type Admin } from '../schema';

export const createAdmin = async (input: CreateAdminInput): Promise<Admin> => {
  try {
    // Hash the password using Bun's built-in password hashing
    const password_hash = await Bun.password.hash(input.password);

    // Insert admin record
    const result = await db.insert(adminsTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash: password_hash
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Admin creation failed:', error);
    throw error;
  }
};
