import { test, expect } from '../../fixtures';
import { generateBio } from '../../src/utils/dataGen';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Settings (UI)', () => {
  test('updates bio via the settings form and persists it (verified via API)', async ({ context, facade, services, pages }) => {
    const user = await facade.signInViaApi(context);
    const bio = generateBio();

    await pages.settings.updateBio(bio);

    await expect.poll(async () => (await services.users.current(user.token)).bio).toBe(bio);
  });

  test('logs out from the user menu', async ({ context, facade, pages }) => {
    await facade.signInViaApi(context);
    await pages.home.goto();

    await pages.navbar.logout();
    await expect(pages.navbar.signUp).toBeVisible();
  });
});
