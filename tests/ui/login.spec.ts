import { test, expect } from '../../fixtures';
import { generateDynamicUser } from '../../src/utils/dataGen';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login (UI)', () => {
  test('logs in via the form (user seeded via API)', async ({ services, pages }) => {
    const u = generateDynamicUser();
    await services.auth.register(u);

    await pages.login.login(u.email, u.password);
    await expect(pages.navbar.newArticle).toBeVisible();
  });
});
