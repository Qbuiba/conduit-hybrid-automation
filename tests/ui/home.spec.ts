import { test, expect } from '../../fixtures';

// Opt OUT of the shared authenticated storageState — this validates the
// unauthenticated home page.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Home page (unauthenticated)', () => {
  test('shows banner, global feed, and sign-up link', async ({ pages }) => {
    await pages.home.goto();
    await expect(pages.home.banner).toBeVisible();
    await expect(pages.home.globalFeedTab).toBeVisible();
    await expect(pages.navbar.signUp).toBeVisible();
  });
});
