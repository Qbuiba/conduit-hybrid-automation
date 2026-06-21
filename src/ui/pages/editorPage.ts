import { expect, Locator, Page } from '@playwright/test';
import { UI_BASE_URL } from '../../../playwright.config';
import { NewArticle } from '../../api/types';
import { BasePage } from './basePage';

/**
 * /editor (create) and /editor/{slug} (edit) — locators confirmed against
 * frontend/src/components/ArticleEditorForm. Requires an authenticated session.
 */
export class EditorPage extends BasePage {
  protected readonly path = '/editor';
  readonly title: Locator;
  readonly description: Locator;
  readonly body: Locator;
  readonly tags: Locator;
  readonly publish: Locator;   // "Publish Article" (create)
  readonly update: Locator;    // "Update Article" (edit)

  constructor(page: Page) {
    super(page);
    this.title = page.getByPlaceholder('Article Title');
    this.description = page.getByPlaceholder("What's this article about?");
    this.body = page.getByPlaceholder('Write your article (in markdown)');
    this.tags = page.getByPlaceholder('Enter tags');
    this.publish = page.getByRole('button', { name: 'Publish Article' });
    this.update = page.getByRole('button', { name: 'Update Article' });
  }

  async gotoEdit(slug: string): Promise<void> {
    await this.page.goto(`${UI_BASE_URL}/#${this.path}/${slug}`);
  }

  /** Fill + publish a new article; returns the resulting slug parsed from the URL. */
  async publishArticle(article: NewArticle): Promise<string> {
    await this.goto();
    await this.fill(article);
    await this.publish.click();
    await this.page.waitForURL(/\/article\/.+/);
    return this.page.url().split('/article/')[1];
  }

  /**
   * Submit edits assuming we are ALREADY on the editor (reached via the article's
   * "Edit Article" link, which prefills from router state and skips the
   * getArticle() fetch — avoiding the StrictMode double-fetch clobber).
   * Returns the (possibly new) slug.
   */
  async submitUpdate(fields: Partial<NewArticle>): Promise<string> {
    await this.title.waitFor();
    await expect(this.title).not.toHaveValue('');
    if (fields.title !== undefined) await this.title.fill(fields.title);
    if (fields.description !== undefined) await this.description.fill(fields.description);
    if (fields.body !== undefined) await this.body.fill(fields.body);
    await this.update.click();
    await this.page.waitForURL(/\/article\/.+/);
    return this.page.url().split('/article/')[1];
  }

  private async fill(article: NewArticle): Promise<void> {
    await this.title.fill(article.title);
    await this.description.fill(article.description);
    await this.body.fill(article.body);
    if (article.tagList?.length) {
      // Editor splits tags on ',' or ' '.
      await this.tags.fill(article.tagList.join(' '));
    }
  }
}
