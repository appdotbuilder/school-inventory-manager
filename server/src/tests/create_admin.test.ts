
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { adminsTable } from '../db/schema';
import { type CreateAdminInput } from '../schema';
import { createAdmin } from '../handlers/create_admin';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateAdminInput = {
  username: 'testadmin',
  email: 'test@example.com',
  password: 'password123'
};

describe('createAdmin', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an admin', async () => {
    const result = await createAdmin(testInput);

    // Basic field validation
    expect(result.username).toEqual('testadmin');
    expect(result.email).toEqual('test@example.com');
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Should be hashed
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save admin to database', async () => {
    const result = await createAdmin(testInput);

    // Query using proper drizzle syntax
    const admins = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.id, result.id))
      .execute();

    expect(admins).toHaveLength(1);
    expect(admins[0].username).toEqual('testadmin');
    expect(admins[0].email).toEqual('test@example.com');
    expect(admins[0].password_hash).toBeDefined();
    expect(admins[0].created_at).toBeInstanceOf(Date);
  });

  it('should hash the password', async () => {
    const result = await createAdmin(testInput);

    // Password should be hashed (not plain text)
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash.length).toBeGreaterThan(10);

    // Verify password can be verified with Bun's password verification
    const isValid = await Bun.password.verify('password123', result.password_hash);
    expect(isValid).toBe(true);

    // Verify wrong password fails
    const isInvalid = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should enforce unique constraints', async () => {
    // Create first admin
    await createAdmin(testInput);

    // Try to create another admin with same username
    const duplicateUsernameInput: CreateAdminInput = {
      username: 'testadmin', // Same username
      email: 'different@example.com',
      password: 'password123'
    };

    await expect(createAdmin(duplicateUsernameInput)).rejects.toThrow(/unique/i);

    // Try to create another admin with same email
    const duplicateEmailInput: CreateAdminInput = {
      username: 'differentuser',
      email: 'test@example.com', // Same email
      password: 'password123'
    };

    await expect(createAdmin(duplicateEmailInput)).rejects.toThrow(/unique/i);
  });
});
