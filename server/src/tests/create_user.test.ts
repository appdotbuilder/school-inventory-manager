
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test inputs for different user types
const testStudentInput: CreateUserInput = {
  name: 'Test Student',
  email: 'student@test.com',
  role: 'student',
  student_id: 'STU123',
  department: null
};

const testTeacherInput: CreateUserInput = {
  name: 'Test Teacher',
  email: 'teacher@test.com',
  role: 'teacher',
  student_id: null,
  department: 'Computer Science'
};

const testAdminInput: CreateUserInput = {
  name: 'Test Admin',
  email: 'admin@test.com',
  role: 'admin',
  student_id: null,
  department: null
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a student user', async () => {
    const result = await createUser(testStudentInput);

    // Basic field validation
    expect(result.name).toEqual('Test Student');
    expect(result.email).toEqual('student@test.com');
    expect(result.role).toEqual('student');
    expect(result.student_id).toEqual('STU123');
    expect(result.department).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a teacher user', async () => {
    const result = await createUser(testTeacherInput);

    // Basic field validation
    expect(result.name).toEqual('Test Teacher');
    expect(result.email).toEqual('teacher@test.com');
    expect(result.role).toEqual('teacher');
    expect(result.student_id).toBeNull();
    expect(result.department).toEqual('Computer Science');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an admin user', async () => {
    const result = await createUser(testAdminInput);

    // Basic field validation
    expect(result.name).toEqual('Test Admin');
    expect(result.email).toEqual('admin@test.com');
    expect(result.role).toEqual('admin');
    expect(result.student_id).toBeNull();
    expect(result.department).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testStudentInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('Test Student');
    expect(users[0].email).toEqual('student@test.com');
    expect(users[0].role).toEqual('student');
    expect(users[0].student_id).toEqual('STU123');
    expect(users[0].department).toBeNull();
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(testStudentInput);

    // Try to create another user with same email
    const duplicateInput: CreateUserInput = {
      ...testTeacherInput,
      email: 'student@test.com' // Same email as first user
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });
});
