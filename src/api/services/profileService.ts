import { APIRequestContext } from '@playwright/test';
import { Profile, ProfileEnvelope } from '../types';
import { authHeader, endpoint } from '../clients/apiClient';

/** Wraps /api/profiles/{username} (+ follow/unfollow). */
export class ProfileService {
  constructor(private readonly request: APIRequestContext) {}

  /** GET /api/profiles/{username} — verify profile data vs. the UI dashboard. */
  async get(username: string, token?: string): Promise<Profile> {
    const res = await this.request.get(endpoint(`/profiles/${username}`), {
      headers: authHeader(token),
    });
    if (!res.ok()) {
      throw new Error(`get profile failed (${res.status()}): ${await res.text()}`);
    }
    return ((await res.json()) as ProfileEnvelope).profile;
  }

  /** POST /api/profiles/{username}/follow (auth). */
  async follow(username: string, token: string): Promise<Profile> {
    const res = await this.request.post(endpoint(`/profiles/${username}/follow`), {
      headers: authHeader(token),
    });
    if (!res.ok()) {
      throw new Error(`follow failed (${res.status()}): ${await res.text()}`);
    }
    return ((await res.json()) as ProfileEnvelope).profile;
  }

  /** DELETE /api/profiles/{username}/follow (auth). */
  async unfollow(username: string, token: string): Promise<Profile> {
    const res = await this.request.delete(endpoint(`/profiles/${username}/follow`), {
      headers: authHeader(token),
    });
    if (!res.ok()) {
      throw new Error(`unfollow failed (${res.status()}): ${await res.text()}`);
    }
    return ((await res.json()) as ProfileEnvelope).profile;
  }
}
