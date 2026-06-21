import { test, expect } from '../../fixtures';
import { generateDynamicUser } from '../../src/utils/dataGen';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Registration (UI)', () => {
  test('registers via the form and lands authenticated', async ({ pages }) => {
    await pages.register.register(generateDynamicUser());
    await expect(pages.navbar.newArticle).toBeVisible();
  });
});
