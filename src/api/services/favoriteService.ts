import { APIRequestContext } from '@playwright/test';
import { Article, ArticleEnvelope } from '../types';
import { authHeader, endpoint } from '../clients/apiClient';

/** Wraps /api/articles/{slug}/favorite (POST favorite, DELETE unfavorite). */
export class FavoriteService {
  constructor(private readonly request: APIRequestContext) {}

  /** POST /api/articles/{slug}/favorite — increment favorites. */
  async favorite(slug: string, token: string): Promise<Article> {
    const res = await this.request.post(endpoint(`/articles/${slug}/favorite`), {
      headers: authHeader(token),
    });
    if (!res.ok()) {
      throw new Error(`favorite failed (${res.status()}): ${await res.text()}`);
    }
    return ((await res.json()) as ArticleEnvelope).article;
  }

  /** DELETE /api/articles/{slug}/favorite — decrement favorites. */
  async unfavorite(slug: string, token: string): Promise<Article> {
    const res = await this.request.delete(endpoint(`/articles/${slug}/favorite`), {
      headers: authHeader(token),
    });
    if (!res.ok()) {
      throw new Error(`unfavorite failed (${res.status()}): ${await res.text()}`);
    }
    return ((await res.json()) as ArticleEnvelope).article;
  }
}
