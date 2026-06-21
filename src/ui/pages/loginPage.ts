import { Locator, Page } from '@playwright/test';
import { BasePage } from './basePage';

/** /login — locators confirmed against frontend/src/components/LoginForm. */
export class LoginPage extends BasePage {
  protected readonly path = '/login';
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    super(page);
    this.email = page.getByPlaceholder('Email');
    this.password = page.getByPlaceholder('Password');
    this.submit = page.getByRole('button', { name: 'Login' });
  }

  async login(email: string, password: string): Promise<void> {
    await this.goto();
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
    await this.page.waitForURL((url) => url.hash === '#/');
  }
}
