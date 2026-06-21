import { test, expect } from '../../fixtures';
import { generateArticle } from '../../src/utils/dataGen';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Edit article (hybrid)', () => {
  test('edits via UI and verifies via API', async ({ context, facade, services, pages, articleTracker }) => {
    // API setup: an authenticated author with a published article.
    const user = await facade.signInViaApi(context);
    const created = await services.articles.create(generateArticle(), user.token);

    // UI action: reach the editor via the article's "Edit Article" link (passes
    // router state, so the form prefills without a clobbering re-fetch), then edit.
    await pages.article.gotoArticle(created.slug);
    await pages.article.editLink.click();
    const newTitle = `Edited ${created.slug}`;
    const newSlug = await pages.editor.submitUpdate({ title: newTitle, body: 'edited body' });
    articleTracker.track(newSlug, user.token);

    // API verify: backend reflects the UI edit.
    const persisted = await services.articles.get(newSlug, user.token);
    expect(persisted.title).toBe(newTitle);
    expect(persisted.body).toBe('edited body');
  });
});
