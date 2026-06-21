import { test, expect } from '../../fixtures';
import { generateArticle, generateDynamicUser } from '../../src/utils/dataGen';

test.describe('Tags API', () => {
  test('a tag (>2 chars) becomes available via /api/tags', async ({ services, articleTracker }) => {
    const author = await services.auth.register(generateDynamicUser());
    const tag = `pwtag${Date.now().toString(36)}`; // unique, well over 2 chars
    const article = await services.articles.create(generateArticle({ tagList: [tag] }), author.token);
    articleTracker.track(article.slug, author.token);

    expect(await services.tags.list()).toContain(tag);
  });

  test('tags of length <= 2 are silently dropped (backend quirk)', async ({ services, articleTracker }) => {
    const author = await services.auth.register(generateDynamicUser());
    const article = await services.articles.create(generateArticle({ tagList: ['ab'] }), author.token);
    articleTracker.track(article.slug, author.token);

    // Source of truth is GET (the create response echoes the input regardless).
    const fetched = await services.articles.get(article.slug, author.token);
    expect(fetched.tagList).not.toContain('ab');
  });
});
