import { test, expect } from '../../fixtures';
import { generateArticle, generateDynamicUser } from '../../src/utils/dataGen';
import { injectSession } from '../../src/utils/state';

/**
 * Hybrid flow: API setup → UI action → API verify. The canonical demonstration
 * of the framework. Self-contained: registers its own isolated user via API and
 * injects the session (no UI login), so it is parallel-safe and not coupled to
 * the shared setup user.
 */

// Start unauthenticated; we inject our own isolated session below.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Publish article (hybrid)', () => {
  test('publishes via UI and verifies via API', async ({ context, pages, services, articleTracker }) => {
    // API setup: isolated user.
    const user = await services.auth.register(generateDynamicUser());
    await injectSession(context, user);

    // UI action: author publishes through the editor.
    const draft = generateArticle();
    const slug = await pages.editor.publishArticle(draft);
    articleTracker.track(slug, user.token);

    // API verify: the backend persisted exactly what the UI submitted.
    const persisted = await services.articles.get(slug, user.token);
    expect(persisted.title).toBe(draft.title);
    expect(persisted.body).toBe(draft.body);
    expect(persisted.author.username).toBe(user.username);

    // UI sanity: the published article page renders the title.
    await expect(pages.article.heading(draft.title)).toBeVisible();
  });
});
