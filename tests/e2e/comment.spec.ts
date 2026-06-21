import { test, expect } from '../../fixtures';
import { generateArticle, generateComment } from '../../src/utils/dataGen';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Comment on article (hybrid)', () => {
  test('adds a comment via UI and verifies via API', async ({ context, facade, services, pages, articleTracker }) => {
    const user = await facade.signInViaApi(context);
    const article = await services.articles.create(generateArticle(), user.token);
    articleTracker.track(article.slug, user.token);

    await pages.article.gotoArticle(article.slug);
    const body = generateComment();
    await pages.article.addComment(body);

    // UI shows it, and the API confirms persistence.
    await expect(pages.article.comment(body)).toBeVisible();
    const comments = await services.comments.list(article.slug, user.token);
    expect(comments.map((c) => c.body)).toContain(body);
  });
});
