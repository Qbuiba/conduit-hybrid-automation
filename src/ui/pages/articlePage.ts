import { Locator, Page } from '@playwright/test';
import { UI_BASE_URL } from '../../../playwright.config';
import { BasePage } from './basePage';

/**
 * /article/{slug} — read article, comments, favorite/follow.
 * Author sees Edit/Delete; non-author sees Follow + Favorite.
 */
export class ArticlePage extends BasePage {
  protected readonly path = '/article';
  readonly commentBox: Locator;
  readonly postComment: Locator;
  readonly favorite: Locator;   // non-author only
  readonly follow: Locator;     // non-author only
  readonly editLink: Locator;   // author only
  readonly deleteButton: Locator; // author only

  constructor(page: Page) {
    super(page);
    this.commentBox = page.getByPlaceholder('Write a comment...');
    this.postComment = page.getByRole('button', { name: 'Post Comment' });
    this.favorite = page.getByRole('button', { name: /Favorite/ }).first();
    this.follow = page.getByRole('button', { name: /Follow/ }).first();
    this.editLink = page.getByRole('link', { name: 'Edit Article' }).first();
    this.deleteButton = page.getByRole('button', { name: 'Delete Article' }).first();
  }

  async gotoArticle(slug: string): Promise<void> {
    await this.page.goto(`${UI_BASE_URL}/#${this.path}/${slug}`);
    // The page renders before its getArticle() XHR resolves, so author/comment
    // data is briefly absent. Wait for the fetch to settle before interacting.
    await this.page.waitForLoadState('networkidle');
  }

  /** The article title is rendered as the page H1. */
  heading(title: string): Locator {
    return this.page.getByRole('heading', { name: title, level: 1 });
  }

  /** A comment body rendered in the comment feed. */
  comment(body: string): Locator {
    return this.page.locator('.card-text', { hasText: body });
  }

  async addComment(body: string): Promise<void> {
    await this.commentBox.fill(body);
    await this.postComment.click();
  }

  /** Current favorites count, parsed from the Favorite button's "( N )" suffix. */
  async favoritesCount(): Promise<number> {
    const text = (await this.favorite.textContent()) ?? '';
    const match = text.match(/\(\s*(\d+)\s*\)/);
    return match ? Number(match[1]) : 0;
  }
}
