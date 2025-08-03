
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { adminsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type AdminLoginInput } from '../schema';
import { adminLogin } from '../handlers/admin_login';

const testAdminData = {
  username: 'testadmin',
  email: 'test@example.com',
  password: 'password123'
};

const testLoginInput: AdminLoginInput = {
  username: 'testadmin',
  password: 'password123'
};

describe('adminLogin', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate admin with correct credentials', async () => {
    // Create test admin (storing password as plain text for testing)
    await db.insert(adminsTable)
      .values({
        username: testAdminData.username,
        email: testAdminData.email,
        password_hash: testAdminData.password
      })
      .execute();

    const result = await adminLogin(testLoginInput);

    expect(result).not.toBeNull();
    expect(result!.admin.username).toEqual('testadmin');
    expect(result!.admin.email).toEqual('test@example.com');
    expect(result!.admin.id).toBeDefined();
    expect(result!.admin.created_at).toBeInstanceOf(Date);
    expect(result!.token).toBeDefined();
    expect(typeof result!.token).toBe('string');
  });

  it('should return null for non-existent username', async () => {
    const result = await adminLogin({
      username: 'nonexistent',
      password: 'password123'
    });

    expect(result).toBeNull();
  });

  it('should return null for incorrect password', async () => {
    // Create test admin
    await db.insert(adminsTable)
      .values({
        username: testAdminData.username,
        email: testAdminData.email,
        password_hash: testAdminData.password
      })
      .execute();

    const result = await adminLogin({
      username: 'testadmin',
      password: 'wrongpassword'
    });

    expect(result).toBeNull();
  });

  it('should generate token with admin id', async () => {
    // Create test admin
    const adminResults = await db.insert(adminsTable)
      .values({
        username: testAdminData.username,
        email: testAdminData.email,
        password_hash: testAdminData.password
      })
      .returning()
      .execute();

    const result = await adminLogin(testLoginInput);

    expect(result).not.toBeNull();
    expect(result!.token).toBeDefined();
    expect(result!.token).toContain(`admin-${adminResults[0].id}`);
  });

  it('should save admin to database correctly', async () => {
    await db.insert(adminsTable)
      .values({
        username: testAdminData.username,
        email: testAdminData.email,
        password_hash: testAdminData.password
      })
      .execute();

    // Verify admin was saved
    const admins = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.username, testAdminData.username))
      .execute();

    expect(admins).toHaveLength(1);
    expect(admins[0].username).toEqual('testadmin');
    expect(admins[0].email).toEqual('test@example.com');
    expect(admins[0].created_at).toBeInstanceOf(Date);
  });
});
