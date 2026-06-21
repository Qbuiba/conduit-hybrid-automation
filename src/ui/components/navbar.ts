import { Locator, Page } from '@playwright/test';

/**
 * Shared top navigation. Auth state changes its links:
 *  - unauthenticated: Home, Login, Sign up
 *  - authenticated:   Home, New Article, <username dropdown> (Profile/Settings/Logout)
 * Confirmed against frontend/src/components/Navbar + DropdownMenu.
 */
export class Navbar {
  readonly home: Locator;
  readonly login: Locator;
  readonly signUp: Locator;
  readonly newArticle: Locator;
  readonly userMenu: Locator;   // username dropdown toggle (a div, not a link)
  readonly logoutLink: Locator;

  constructor(private readonly page: Page) {
    this.home = page.getByRole('link', { name: 'Home' });
    this.login = page.getByRole('link', { name: 'Login' });
    this.signUp = page.getByRole('link', { name: 'Sign up' });
    this.newArticle = page.getByRole('link', { name: 'New Article' });
    this.userMenu = page.locator('.dropdown-toggle');
    this.logoutLink = page.getByRole('link', { name: 'Logout' });
  }

  async logout(): Promise<void> {
    await this.userMenu.click();
    await this.logoutLink.click();
  }
}
