import { Locator, Page } from '@playwright/test';
import { BasePage } from './basePage';

/** /settings — locators confirmed against frontend/src/components/SettingsForm. */
export class SettingsPage extends BasePage {
  protected readonly path = '/settings';
  readonly image: Locator;
  readonly username: Locator;
  readonly bio: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly update: Locator;

  constructor(page: Page) {
    super(page);
    this.image = page.getByPlaceholder('URL of profile picture');
    this.username = page.getByPlaceholder('Your Name');
    this.bio = page.getByPlaceholder('Short bio about you');
    this.email = page.getByPlaceholder('Email');
    this.password = page.getByPlaceholder('Password');
    this.update = page.getByRole('button', { name: 'Update Settings' });
  }

  async updateBio(bio: string): Promise<void> {
    await this.goto();
    await this.bio.fill(bio);
    await this.update.click();
  }
}
