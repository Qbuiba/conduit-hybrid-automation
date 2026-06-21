import { test, expect } from '../../fixtures';
import { generateArticle, generateDynamicUser } from '../../src/utils/dataGen';

test.describe('Favorites API', () => {
  test('favorite increments, unfavorite decrements', async ({ services, articleTracker }) => {
    const author = await services.auth.register(generateDynamicUser());
    const reader = await services.auth.register(generateDynamicUser());
    const article = await services.articles.create(generateArticle(), author.token);
    articleTracker.track(article.slug, author.token);

    const fav = await services.favorites.favorite(article.slug, reader.token);
    expect(fav.favorited).toBe(true);
    expect(fav.favoritesCount).toBe(1);

    const unfav = await services.favorites.unfavorite(article.slug, reader.token);
    expect(unfav.favorited).toBe(false);
    expect(unfav.favoritesCount).toBe(0);
  });
});
