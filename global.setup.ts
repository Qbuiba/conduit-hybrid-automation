import { test as setup } from '@playwright/test';
import { STORAGE_STATE, UI_BASE_URL } from './playwright.config';
import { createApiContext } from './src/api/clients/apiClient';
import { AuthService } from './src/api/services/authService';
import { generateDynamicUser } from './src/utils/dataGen';
import { AUTH_STORAGE_KEY, buildLoggedUser } from './src/utils/state';

/**
 * Setup project — runs ONCE before UI/e2e tests (see playwright.config.ts).
 * Registers a user via API (fast, no UI), then writes an authenticated
 * storageState the `chromium` project reuses, so UI tests start logged in.
 */
setup('authenticate', async ({ page }) => {
  const api = await createApiContext();
  const user = await new AuthService(api).register(generateDynamicUser());
  await api.dispose();

  // localStorage is origin-scoped — navigate to the app origin before setting it.
  await page.goto(UI_BASE_URL);
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, value),
    [AUTH_STORAGE_KEY, buildLoggedUser(user)] as const,
  );

  await page.context().storageState({ path: STORAGE_STATE });
});
