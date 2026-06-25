import { test, expect } from '../../fixtures';
import { generateArticle, generateDynamicUser } from '../../src/utils/dataGen';

// DEMO spec — exists only to exercise the AI self-healing debug loop in CI.
// The failure is a deliberate TEST defect (an assertion against a hardcoded title
// that can never match the dynamically-generated one). Expected self-healing
// outcome: the AI classifies this as TEST-DEFECT (the API round-trips correctly —
// the test's expectation is wrong), fixes the assertion, and re-runs to green.
test.describe('AI debug-loop demo', () => {
  test('created article round-trips its title', async ({ services, articleTracker }) => {
    const author = await services.auth.register(generateDynamicUser());
    const draft = generateArticle();
    const created = await services.articles.create(draft, author.token);
    articleTracker.track(created.slug, author.token);

    const fetched = await services.articles.get(created.slug, author.token);
    // ❌ BUG (test defect): the title is generated per-run, so this hardcoded
    //    value never matches. Correct assertion is `toBe(draft.title)`.
    expect(fetched.title).toBe('THIS_TITLE_IS_WRONG_ON_PURPOSE');
  });
});
