import { test, expect } from '../../fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Favorite article (hybrid)', () => {
  test("favorites another user's article via UI and verifies via API", async ({ context, facade, services, pages, articleTracker }) => {
    // API setup: an article authored by someone else.
    const { author, article } = await facade.publishArticleAs();
    articleTracker.track(article.slug, author.token);

    // A different user favorites it through the UI.
    const reader = await facade.signInViaApi(context);
    await pages.article.gotoArticle(article.slug);
    await pages.article.favorite.click();
    await expect(pages.article.favorite).toContainText('( 1 )');

    // API verify.
    const fetched = await services.articles.get(article.slug, reader.token);
    expect(fetched.favorited).toBe(true);
    expect(fetched.favoritesCount).toBe(1);
  });
});
