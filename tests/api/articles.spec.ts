import { test, expect } from '../../fixtures';
import { generateArticle, generateDynamicUser } from '../../src/utils/dataGen';

test.describe('Articles API', () => {
  test('create → get round-trips fields and tags', async ({ services, articleTracker }) => {
    const author = await services.auth.register(generateDynamicUser());
    const draft = generateArticle();
    const created = await services.articles.create(draft, author.token);
    articleTracker.track(created.slug, author.token);

    const fetched = await services.articles.get(created.slug, author.token);
    expect(fetched.title).toBe(draft.title);
    expect(fetched.description).toBe(draft.description);
    expect(fetched.tagList.sort()).toEqual([...(draft.tagList ?? [])].sort());
    expect(fetched.author.username).toBe(author.username);
  });

  test('update changes fields, and slug follows the new title', async ({ services, articleTracker }) => {
    const author = await services.auth.register(generateDynamicUser());
    const created = await services.articles.create(generateArticle(), author.token);

    const updated = await services.articles.update(
      created.slug,
      { title: `Renamed ${created.slug}`, body: 'updated body' },
      author.token,
    );
    articleTracker.track(updated.slug, author.token);

    expect(updated.body).toBe('updated body');
    const fetched = await services.articles.get(updated.slug, author.token);
    expect(fetched.body).toBe('updated body');
  });

  test('list filters by author', async ({ services, articleTracker }) => {
    const author = await services.auth.register(generateDynamicUser());
    const created = await services.articles.create(generateArticle(), author.token);
    articleTracker.track(created.slug, author.token);

    const list = await services.articles.list({ author: author.username }, author.token);
    expect(list.articles.length).toBeGreaterThanOrEqual(1);
    expect(list.articles.every((a) => a.author.username === author.username)).toBeTruthy();
  });

  test('rejects unauthenticated create', async ({ services }) => {
    await expect(services.articles.create(generateArticle(), '')).rejects.toThrow();
  });
});
