/**
 * Conduit RealWorld API contract types.
 * Source: the published RealWorld API spec (stable across all 100+ implementations).
 * These are known up-front and do NOT depend on inspecting the running app.
 */

export interface NewUser {
  username: string;
  email: string;
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  email: string;
  username: string;
  bio: string | null;
  image: string | null;
  token: string; // JWT
}

export interface Profile {
  username: string;
  bio: string | null;
  image: string | null;
  following: boolean;
  followersCount?: number; // present in TonyMckes' article author payload
}

export interface NewArticle {
  title: string;
  description: string;
  body: string;
  tagList?: string[];
}

export interface Article {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  createdAt: string;
  updatedAt: string;
  favorited: boolean;
  favoritesCount: number;
  author: Profile;
}

export interface Comment {
  id: number;
  createdAt: string;
  updatedAt: string;
  body: string;
  author: Profile;
}

/** Mutable user fields for PUT /api/user (settings). */
export interface UpdateUser {
  username?: string;
  email?: string;
  password?: string;
  bio?: string;
  image?: string;
}

/** Query params for GET /api/articles. */
export interface ArticleQuery {
  author?: string;
  tag?: string;
  favorited?: string;
  limit?: number;
  offset?: number;
}

// API request/response envelopes (Conduit wraps payloads by domain key).
export interface UserEnvelope { user: User; }
export interface NewUserEnvelope { user: NewUser; }
export interface LoginEnvelope { user: LoginCredentials; }
export interface ProfileEnvelope { profile: Profile; }
export interface ArticleEnvelope { article: Article; }
export interface NewArticleEnvelope { article: NewArticle; }
export interface ArticleListEnvelope { articles: Article[]; articlesCount: number; }
export interface CommentEnvelope { comment: Comment; }
export interface CommentsEnvelope { comments: Comment[]; }
export interface TagsEnvelope { tags: string[]; }
