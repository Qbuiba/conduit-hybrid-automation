import { APIRequestContext } from '@playwright/test';
import { Comment, CommentEnvelope, CommentsEnvelope } from '../types';
import { authHeader, endpoint } from '../clients/apiClient';

/** Wraps /api/articles/{slug}/comments. */
export class CommentService {
  constructor(private readonly request: APIRequestContext) {}

  /** POST /api/articles/{slug}/comments — seed a comment (auth). */
  async add(slug: string, body: string, token: string): Promise<Comment> {
    const res = await this.request.post(endpoint(`/articles/${slug}/comments`), {
      data: { comment: { body } },
      headers: authHeader(token),
    });
    if (!res.ok()) {
      throw new Error(`add comment failed (${res.status()}): ${await res.text()}`);
    }
    return ((await res.json()) as CommentEnvelope).comment;
  }

  /** GET /api/articles/{slug}/comments — list comments (auth optional). */
  async list(slug: string, token?: string): Promise<Comment[]> {
    const res = await this.request.get(endpoint(`/articles/${slug}/comments`), {
      headers: authHeader(token),
    });
    if (!res.ok()) {
      throw new Error(`list comments failed (${res.status()}): ${await res.text()}`);
    }
    return ((await res.json()) as CommentsEnvelope).comments;
  }

  /** DELETE /api/articles/{slug}/comments/{commentId} — remove a comment (auth, author). */
  async delete(slug: string, commentId: number, token: string): Promise<void> {
    const res = await this.request.delete(endpoint(`/articles/${slug}/comments/${commentId}`), {
      headers: authHeader(token),
    });
    if (!res.ok() && res.status() !== 404) {
      throw new Error(`delete comment failed (${res.status()}): ${await res.text()}`);
    }
  }
}
