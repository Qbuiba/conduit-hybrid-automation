import { APIRequestContext } from '@playwright/test';
import { Article, ArticleEnvelope, ArticleListEnvelope, ArticleQuery, NewArticle } from '../types';
import { authHeader, endpoint } from '../clients/apiClient';

/** Wraps /api/articles — primary seeding/verification surface for hybrid tests. */
export class ArticleService {
  constructor(private readonly request: APIRequestContext) {}

  /** POST /api/articles — seed an article (auth required). Returns it incl. slug. */
  async create(article: NewArticle, token: string): Promise<Article> {
    const res = await this.request.post(endpoint('/articles'), {
      data: { article },
      headers: authHeader(token),
    });
    if (!res.ok()) {
      throw new Error(`create article failed (${res.status()}): ${await res.text()}`);
    }
    return ((await res.json()) as ArticleEnvelope).article;
  }

  /** GET /api/articles/{slug} — fetch one article (auth optional; affects favorited flag). */
  async get(slug: string, token?: string): Promise<Article> {
    const res = await this.request.get(endpoint(`/articles/${slug}`), {
      headers: authHeader(token),
    });
    if (!res.ok()) {
      throw new Error(`get article failed (${res.status()}): ${await res.text()}`);
    }
    return ((await res.json()) as ArticleEnvelope).article;
  }

  /** PUT /api/articles/{slug} — update an article (auth, author only). */
  async update(slug: string, fields: Partial<NewArticle>, token: string): Promise<Article> {
    const res = await this.request.put(endpoint(`/articles/${slug}`), {
      data: { article: fields },
      headers: authHeader(token),
    });
    if (!res.ok()) {
      throw new Error(`update article failed (${res.status()}): ${await res.text()}`);
    }
    return ((await res.json()) as ArticleEnvelope).article;
  }

  /** GET /api/articles — list with optional filters (auth optional). */
  async list(query: ArticleQuery = {}, token?: string): Promise<ArticleListEnvelope> {
    const res = await this.request.get(endpoint('/articles'), {
      params: query as Record<string, string | number>,
      headers: authHeader(token),
    });
    if (!res.ok()) {
      throw new Error(`list articles failed (${res.status()}): ${await res.text()}`);
    }
    return (await res.json()) as ArticleListEnvelope;
  }

  /** DELETE /api/articles/{slug} — teardown (auth, author only). */
  async delete(slug: string, token: string): Promise<void> {
    const res = await this.request.delete(endpoint(`/articles/${slug}`), {
      headers: authHeader(token),
    });
    if (!res.ok() && res.status() !== 404) {
      throw new Error(`delete article failed (${res.status()}): ${await res.text()}`);
    }
  }
}
