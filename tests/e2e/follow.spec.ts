import { test, expect } from '../../fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Follow author (hybrid)', () => {
  test('follows an author via UI and verifies via API', async ({ context, facade, services, pages, articleTracker }) => {
    const { author, article } = await facade.publishArticleAs();
    articleTracker.track(article.slug, author.token);

    const reader = await facade.signInViaApi(context);
    await pages.article.gotoArticle(article.slug);

    // Click follow; this app's FollowButton doesn't reliably re-render to
    // "Unfollow", so verify the effect via the API (the source of truth).
    await pages.article.follow.click();
    await expect
      .poll(async () => (await services.profiles.get(author.username, reader.token)).following, { timeout: 10_000 })
      .toBe(true);
  });
});
