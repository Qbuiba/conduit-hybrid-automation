import { Page } from '@playwright/test';
import { UI_BASE_URL } from '../../../playwright.config';

/** Shared base for all Page Objects. Holds the Page and common navigation. */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Path relative to UI_BASE_URL, e.g. '/login'. Overridden per page. */
  protected abstract readonly path: string;

  // The Conduit frontend uses a HASH router, so routes live under `/#`.
  async goto(): Promise<void> {
    await this.page.goto(`${UI_BASE_URL}/#${this.path}`);
  }
}
