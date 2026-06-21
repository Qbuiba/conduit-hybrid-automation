import { Locator, Page } from '@playwright/test';
import { BasePage } from './basePage';

/** / — banner (unauth), feed toggle, article previews, popular tags. */
export class HomePage extends BasePage {
  protected readonly path = '/';
  readonly banner: Locator;       // shown only when unauthenticated
  readonly globalFeedTab: Locator;
  readonly yourFeedTab: Locator;  // shown only when authenticated
  readonly popularTags: Locator;

  constructor(private readonly homePage: Page) {
    super(homePage);
    this.banner = homePage.getByRole('heading', { name: 'conduit', level: 1 });
    // Feed tabs render as <button class="nav-link">, not links.
    this.globalFeedTab = homePage.getByRole('button', { name: 'Global Feed' });
    this.yourFeedTab = homePage.getByRole('button', { name: 'Your Feed' });
    this.popularTags = homePage.locator('.sidebar .tag-list');
  }

  /** An article preview by its title (rendered as an H1 inside a preview link). */
  preview(title: string): Locator {
    return this.homePage.locator('.article-preview', { hasText: title });
  }

  /** A popular-tag pill by name. */
  tagPill(name: string): Locator {
    return this.homePage.locator('.sidebar .tag-pill', { hasText: name });
  }
}
