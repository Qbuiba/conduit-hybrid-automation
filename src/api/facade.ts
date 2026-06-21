import { BrowserContext } from '@playwright/test';
import { Article, NewArticle, User } from './types';
import { AuthService } from './services/authService';
import { ArticleService } from './services/articleService';
import { injectSession } from '../utils/state';
import { generateArticle, generateDynamicUser } from '../utils/dataGen';

/**
 * Facade — high-level helpers combining multiple low-level actions into one
 * call, so test scripts read as intent ("give me a logged-in author with a
 * published article") rather than plumbing.
 */
export class AppFacade {
  constructor(
    private readonly auth: AuthService,
    private readonly articles: ArticleService,
  ) {}

  /** Register a fresh isolated user via API. */
  async registerUser(): Promise<User> {
    return this.auth.register(generateDynamicUser());
  }

  /**
   * Register a user, log their session into the browser (no UI login), and
   * return the user. The single most common setup for an authenticated UI test.
   */
  async signInViaApi(context: BrowserContext): Promise<User> {
    const user = await this.registerUser();
    await injectSession(context, user);
    return user;
  }

  /**
   * Produce a published article authored by a brand-new user, entirely via API —
   * ideal as the "given" for hybrid tests that then act as a *different* user.
   */
  async publishArticleAs(overrides: Partial<NewArticle> = {}): Promise<{ author: User; article: Article }> {
    const author = await this.registerUser();
    const article = await this.articles.create(generateArticle(overrides), author.token);
    return { author, article };
  }
}
