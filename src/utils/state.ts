import { BrowserContext, Page } from '@playwright/test';
import { User } from '../api/types';

/**
 * Session/JWT helpers for bypassing the UI login.
 *
 * CONFIRMED against the TonyMckes frontend (src/services/userLogin.js +
 * context/AuthContext.jsx): the app stores ONE localStorage key, `loggedUser`,
 * holding a JSON object — NOT a bare token. Shape:
 *
 *   loggedUser = {
 *     headers: { Authorization: "Token <jwt>" },
 *     isAuth: true,
 *     loggedUser: <User incl. token>
 *   }
 */
export const AUTH_STORAGE_KEY = 'loggedUser';

/** Build the exact object the app persists, from a registered/logged-in User. */
export function buildLoggedUser(user: User): string {
  return JSON.stringify({
    headers: { Authorization: `Token ${user.token}` },
    isAuth: true,
    loggedUser: user,
  });
}

/**
 * Inject an authenticated session into localStorage before navigation, so the
 * app boots logged in. Reserved for tests needing a FRESH isolated user mid-test;
 * the shared user comes from the setup project's storageState.
 */
export async function injectSession(context: BrowserContext, user: User): Promise<void> {
  await context.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [AUTH_STORAGE_KEY, buildLoggedUser(user)] as const,
  );
}

/** Read the persisted session back out (assertion/debug helper). */
export async function readSession(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), AUTH_STORAGE_KEY);
}
