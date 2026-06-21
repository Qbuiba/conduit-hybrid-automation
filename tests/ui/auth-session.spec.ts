import { test, expect } from '../../fixtures';

/**
 * Uses the shared storageState written by the setup project — proves the
 * "authenticate once, reuse everywhere" pattern works end to end.
 */
test.describe('Authenticated session (storageState)', () => {
  test('navbar and feed reflect the logged-in state', async ({ pages }) => {
    await pages.home.goto();
    await expect(pages.navbar.newArticle).toBeVisible();
    await expect(pages.home.yourFeedTab).toBeVisible();
    await expect(pages.home.banner).toBeHidden(); // banner is unauth-only
  });
});
