import { APIRequestContext, request } from '@playwright/test';
import { API_BASE_URL } from '../../../playwright.config';

/**
 * API client helpers.
 *
 * Services are constructed WITH an APIRequestContext (dependency injection) and
 * build ABSOLUTE URLs via `endpoint()` — so they are decoupled from whatever
 * baseURL the test project happens to use (UI tests run on :3000, API on :3001).
 * Auth is passed per-call (`authHeader(token)`), not baked into the context.
 */

/** Absolute URL for an API path, e.g. endpoint('/users/login'). */
export function endpoint(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/** Conduit auth header — note `Token`, not `Bearer`. */
export function authHeader(token?: string): Record<string, string> {
  return token ? { Authorization: `Token ${token}` } : {};
}

/**
 * Standalone APIRequestContext for code with no `request` fixture (the setup
 * project). Caller should `.dispose()` it. JSON content-type by default.
 */
export async function createApiContext(): Promise<APIRequestContext> {
  return request.newContext({
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  });
}
