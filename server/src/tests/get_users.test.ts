
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

const testUser1: CreateUserInput = {
  name: 'John Teacher',
  email: 'john.teacher@school.edu',
  role: 'teacher',
  student_id: null,
  department: 'Mathematics'
};

const testUser2: CreateUserInput = {
  name: 'Jane Student',
  email: 'jane.student@school.edu',
  role: 'student',
  student_id: 'ST12345',
  department: null
};

const testUser3: CreateUserInput = {
  name: 'Bob Admin',
  email: 'bob.admin@school.edu',
  role: 'admin',
  student_id: null,
  department: 'IT Department'
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    expect(result).toEqual([]);
  });

  it('should return all users when users exist', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([testUser1, testUser2, testUser3])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Check that all users are returned
    const names = result.map(user => user.name).sort();
    expect(names).toEqual(['Bob Admin', 'Jane Student', 'John Teacher']);
    
    // Verify user data structure
    result.forEach(user => {
      expect(user.id).toBeDefined();
      expect(user.name).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.role).toBeDefined();
      expect(user.created_at).toBeInstanceOf(Date);
    });
  });

  it('should include all user roles', async () => {
    // Create users with different roles
    await db.insert(usersTable)
      .values([testUser1, testUser2, testUser3])
      .execute();

    const result = await getUsers();

    const roles = result.map(user => user.role).sort();
    expect(roles).toEqual(['admin', 'student', 'teacher']);
  });

  it('should include role-specific fields correctly', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([testUser1, testUser2])
      .execute();

    const result = await getUsers();

    const teacher = result.find(user => user.role === 'teacher');
    const student = result.find(user => user.role === 'student');

    // Teacher should have department but no student_id
    expect(teacher?.department).toEqual('Mathematics');
    expect(teacher?.student_id).toBeNull();

    // Student should have student_id but no department
    expect(student?.student_id).toEqual('ST12345');
    expect(student?.department).toBeNull();
  });
});
