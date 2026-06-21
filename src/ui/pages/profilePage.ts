import { Page } from '@playwright/test';
import { BasePage } from './basePage';

/** /profile/{username} — author profile, their articles / favorited tabs. */
export class ProfilePage extends BasePage {
  protected readonly path = '/profile';

  constructor(page: Page) {
    super(page);
    // TODO: assign locators via codegen.
  }
}
