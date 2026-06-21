import { test, expect } from '../../fixtures';
import { NewUser } from '../../src/api/types';
import { generateDynamicUser } from '../../src/utils/dataGen';

/** Pure API contract tests for Authentication (no browser). */
test.describe('Auth API', () => {
  test('registers a new user and returns a JWT', async ({ services }) => {
    const u = generateDynamicUser();
    const created = await services.auth.register(u);
    expect(created.email).toBe(u.email);
    expect(created.username).toBe(u.username);
    expect(created.token).toBeTruthy();
  });

  test('logs in an existing user', async ({ services }) => {
    const u = generateDynamicUser();
    await services.auth.register(u);
    const loggedIn = await services.auth.login({ email: u.email, password: u.password });
    expect(loggedIn.username).toBe(u.username);
    expect(loggedIn.token).toBeTruthy();
  });

  test('rejects duplicate email registration', async ({ services }) => {
    const u = generateDynamicUser();
    await services.auth.register(u);
    await expect(services.auth.register({ ...u, username: `${u.username}_2` })).rejects.toThrow();
  });

  test('rejects login with a wrong password', async ({ services }) => {
    const u = generateDynamicUser();
    await services.auth.register(u);
    await expect(services.auth.login({ email: u.email, password: 'definitely-wrong' })).rejects.toThrow();
  });

  // Data-driven: each required field is enforced.
  for (const field of ['username', 'email', 'password'] as const) {
    test(`rejects registration missing ${field}`, async ({ services }) => {
      const u = generateDynamicUser();
      delete (u as Partial<NewUser>)[field];
      await expect(services.auth.register(u)).rejects.toThrow();
    });
  }
});
