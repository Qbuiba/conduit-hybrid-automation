import { APIRequestContext } from '@playwright/test';
import { UpdateUser, User, UserEnvelope } from '../types';
import { authHeader, endpoint } from '../clients/apiClient';

/** Wraps /api/user (current user + settings update). */
export class UserService {
  constructor(private readonly request: APIRequestContext) {}

  /** GET /api/user — the currently authenticated user. */
  async current(token: string): Promise<User> {
    const res = await this.request.get(endpoint('/user'), { headers: authHeader(token) });
    if (!res.ok()) {
      throw new Error(`current user failed (${res.status()}): ${await res.text()}`);
    }
    return ((await res.json()) as UserEnvelope).user;
  }

  /** PUT /api/user — update settings (bio, image, email, etc.). */
  async update(fields: UpdateUser, token: string): Promise<User> {
    const res = await this.request.put(endpoint('/user'), {
      data: { user: fields },
      headers: authHeader(token),
    });
    if (!res.ok()) {
      throw new Error(`update user failed (${res.status()}): ${await res.text()}`);
    }
    return ((await res.json()) as UserEnvelope).user;
  }
}
