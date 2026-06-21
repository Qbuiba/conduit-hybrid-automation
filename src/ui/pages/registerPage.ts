import { Locator, Page } from '@playwright/test';
import { NewUser } from '../../api/types';
import { BasePage } from './basePage';

/** /register — locators confirmed against frontend/src/components/SignUpForm. */
export class RegisterPage extends BasePage {
  protected readonly path = '/register';
  readonly username: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    super(page);
    this.username = page.getByPlaceholder('Your Name');
    this.email = page.getByPlaceholder('Email');
    this.password = page.getByPlaceholder('Password');
    this.submit = page.getByRole('button', { name: 'Sign up' });
  }

  async register(user: NewUser): Promise<void> {
    await this.goto();
    await this.username.fill(user.username);
    await this.email.fill(user.email);
    await this.password.fill(user.password);
    await this.submit.click();
    await this.page.waitForURL((url) => url.hash === '#/');
  }
}
