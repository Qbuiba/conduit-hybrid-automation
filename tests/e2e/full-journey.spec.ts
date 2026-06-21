import { test, expect } from '../../fixtures';
import { generateArticle, generateComment, generateDynamicUser } from '../../src/utils/dataGen';

/**
 * A single continuous browser journey with NO API auth shortcuts:
 * a brand-new user signs up, publishes an article, and posts a comment —
 * every step driven through the real UI. Persistence is then verified via the API.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Full user journey (pure UI)', () => {
  test('signs up, publishes an article, and comments — all via the browser', async ({ services, pages, articleTracker }) => {
    const user = generateDynamicUser();

    // 1. SIGN UP through the registration form.
    await pages.register.register(user);
    await expect(pages.navbar.newArticle).toBeVisible(); // now authenticated

    // 2. PUBLISH an article through the editor.
    const draft = generateArticle();
    const slug = await pages.editor.publishArticle(draft);

    // Obtain a token via API purely for verification + teardown (not for auth in the flow).
    const session = await services.auth.login({ email: user.email, password: user.password });
    articleTracker.track(slug, session.token);

    // 3. POST A COMMENT through the article page.
    await pages.article.gotoArticle(slug);
    const comment = generateComment();
    await pages.article.addComment(comment);
    await expect(pages.article.comment(comment)).toBeVisible();

    // VERIFY via API (reads back through the backend → database).
    const persisted = await services.articles.get(slug, session.token);
    expect(persisted.title).toBe(draft.title);
    expect(persisted.author.username).toBe(user.username);

    const comments = await services.comments.list(slug, session.token);
    expect(comments.map((c) => c.body)).toContain(comment);
  });
});
