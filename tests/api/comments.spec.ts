import { test, expect } from '../../fixtures';
import { generateArticle, generateComment, generateDynamicUser } from '../../src/utils/dataGen';

test.describe('Comments API', () => {
  test('add → list → delete', async ({ services, articleTracker }) => {
    const author = await services.auth.register(generateDynamicUser());
    const article = await services.articles.create(generateArticle(), author.token);
    articleTracker.track(article.slug, author.token);

    const body = generateComment();
    const added = await services.comments.add(article.slug, body, author.token);
    expect(added.body).toBe(body);

    const list = await services.comments.list(article.slug, author.token);
    expect(list.map((c) => c.body)).toContain(body);

    await services.comments.delete(article.slug, added.id, author.token);
    const after = await services.comments.list(article.slug, author.token);
    expect(after.map((c) => c.body)).not.toContain(body);
  });
});
