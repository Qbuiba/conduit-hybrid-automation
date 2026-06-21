import { randomUUID } from 'node:crypto';
import { NewArticle, NewUser } from '../api/types';

/**
 * Dynamic data generation. Uniqueness comes from a UUID slice so parallel
 * workers never collide on email/username in the shared DB.
 */

function uid(): string {
  return randomUUID().slice(0, 8);
}

/** Unique user payload — avoids DB collisions during parallel execution. */
export function generateDynamicUser(): NewUser {
  const id = uid();
  return {
    username: `user_${id}`,
    email: `user_${id}@conduit.test`,
    password: `Pw_${id}!aA1`,
  };
}

/**
 * Article payload with a unique title (slug derives from title in Conduit).
 * NB: the backend silently drops tags of length <= 2, so keep generated tags long.
 */
export function generateArticle(overrides: Partial<NewArticle> = {}): NewArticle {
  const id = uid();
  return {
    title: `Test Article ${id}`,
    description: `Description ${id}`,
    body: `Body content for article ${id}.`,
    tagList: ['automation', 'playwright'],
    ...overrides,
  };
}

/** Unique comment body. */
export function generateComment(): string {
  return `Great article — comment ${uid()}`;
}

/** Unique bio string for settings tests. */
export function generateBio(): string {
  return `Bio updated at ${uid()}`;
}
