import { test as base, APIRequestContext } from '@playwright/test';
import { createApiContext } from '../src/api/clients/apiClient';
import { AuthService } from '../src/api/services/authService';
import { ArticleService } from '../src/api/services/articleService';
import { CommentService } from '../src/api/services/commentService';
import { FavoriteService } from '../src/api/services/favoriteService';
import { ProfileService } from '../src/api/services/profileService';
import { TagService } from '../src/api/services/tagService';
import { UserService } from '../src/api/services/userService';
import { AppFacade } from '../src/api/facade';
import { LoginPage } from '../src/ui/pages/loginPage';
import { RegisterPage } from '../src/ui/pages/registerPage';
import { EditorPage } from '../src/ui/pages/editorPage';
import { ArticlePage } from '../src/ui/pages/articlePage';
import { HomePage } from '../src/ui/pages/homePage';
import { SettingsPage } from '../src/ui/pages/settingsPage';
import { Navbar } from '../src/ui/components/navbar';

/** All API services, sharing one request context (baseURL-independent). */
export interface Services {
  auth: AuthService;
  articles: ArticleService;
  comments: CommentService;
  favorites: FavoriteService;
  profiles: ProfileService;
  tags: TagService;
  users: UserService;
}

/** All Page Objects + shared components. */
export interface Pages {
  login: LoginPage;
  register: RegisterPage;
  editor: EditorPage;
  article: ArticlePage;
  home: HomePage;
  settings: SettingsPage;
  navbar: Navbar;
}

/**
 * Tracks articles created during a test so they are torn down in reverse order.
 * Each entry carries the author's token, since deletion is author-only.
 */
export class ArticleTracker {
  private readonly items: Array<{ slug: string; token: string }> = [];
  constructor(private readonly articles: ArticleService) {}

  track(slug: string, token: string): void {
    this.items.push({ slug, token });
  }

  async cleanup(): Promise<void> {
    for (const { slug, token } of this.items.reverse()) {
      await this.articles.delete(slug, token).catch(() => { /* already gone — ignore */ });
    }
  }
}

type Fixtures = {
  apiContext: APIRequestContext;
  services: Services;
  facade: AppFacade;
  pages: Pages;
  articleTracker: ArticleTracker;
};

export const test = base.extend<Fixtures>({
  apiContext: async ({}, use) => {
    const ctx = await createApiContext();
    await use(ctx);
    await ctx.dispose();
  },

  services: async ({ apiContext }, use) => {
    await use({
      auth: new AuthService(apiContext),
      articles: new ArticleService(apiContext),
      comments: new CommentService(apiContext),
      favorites: new FavoriteService(apiContext),
      profiles: new ProfileService(apiContext),
      tags: new TagService(apiContext),
      users: new UserService(apiContext),
    });
  },

  facade: async ({ services }, use) => {
    await use(new AppFacade(services.auth, services.articles));
  },

  pages: async ({ page }, use) => {
    await use({
      login: new LoginPage(page),
      register: new RegisterPage(page),
      editor: new EditorPage(page),
      article: new ArticlePage(page),
      home: new HomePage(page),
      settings: new SettingsPage(page),
      navbar: new Navbar(page),
    });
  },

  articleTracker: async ({ services }, use) => {
    const tracker = new ArticleTracker(services.articles);
    await use(tracker);
    await tracker.cleanup();
  },
});

export { expect } from '@playwright/test';
