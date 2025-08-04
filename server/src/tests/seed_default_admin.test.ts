import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { adminsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { seedDefaultAdmin } from '../handlers/seed_default_admin';

describe('seedDefaultAdmin', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create default admin account when none exists', async () => {
    // Verify no admin exists initially
    const initialAdmins = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.username, 'fajar'))
      .execute();
    
    expect(initialAdmins).toHaveLength(0);

    // Run seed function
    await seedDefaultAdmin();

    // Verify default admin was created
    const admins = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.username, 'fajar'))
      .execute();

    expect(admins).toHaveLength(1);
    expect(admins[0].username).toEqual('fajar');
    expect(admins[0].email).toEqual('fajar@school.edu');
    expect(admins[0].password_hash).toBeDefined();
    expect(admins[0].password_hash).not.toEqual('fajar'); // Should be hashed
    expect(admins[0].created_at).toBeInstanceOf(Date);

    // Verify password hash is valid by checking it can be verified
    const isValidPassword = await Bun.password.verify('fajar', admins[0].password_hash);
    expect(isValidPassword).toBe(true);
  });

  it('should not create duplicate admin if one already exists', async () => {
    // Create the default admin first time
    await seedDefaultAdmin();

    // Verify admin exists
    const firstCheck = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.username, 'fajar'))
      .execute();
    
    expect(firstCheck).toHaveLength(1);
    const originalCreatedAt = firstCheck[0].created_at;

    // Run seed function again
    await seedDefaultAdmin();

    // Verify still only one admin exists and it's the same one
    const secondCheck = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.username, 'fajar'))
      .execute();

    expect(secondCheck).toHaveLength(1);
    expect(secondCheck[0].created_at).toEqual(originalCreatedAt);
  });

  it('should handle errors gracefully without throwing', async () => {
    // This test ensures the function doesn't crash the app on database errors
    
    // Force a database error by trying to seed after database is reset
    await resetDB();
    
    // Should not throw an error
    await expect(seedDefaultAdmin()).resolves.toBeUndefined();
  });
});