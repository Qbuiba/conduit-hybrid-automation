import { APIRequestContext } from '@playwright/test';
import { LoginCredentials, NewUser, User, UserEnvelope } from '../types';
import { endpoint } from '../clients/apiClient';

/** Wraps /api/users and /api/users/login. */
export class AuthService {
  constructor(private readonly request: APIRequestContext) {}

  /** POST /api/users — register a new user. Returns the created user incl. JWT. */
  async register(user: NewUser): Promise<User> {
    const res = await this.request.post(endpoint('/users'), { data: { user } });
    if (!res.ok()) {
      throw new Error(`register failed (${res.status()}): ${await res.text()}`);
    }
    return ((await res.json()) as UserEnvelope).user;
  }

  /** POST /api/users/login — authenticate, returns user incl. JWT. */
  async login(creds: LoginCredentials): Promise<User> {
    const res = await this.request.post(endpoint('/users/login'), { data: { user: creds } });
    if (!res.ok()) {
      throw new Error(`login failed (${res.status()}): ${await res.text()}`);
    }
    return ((await res.json()) as UserEnvelope).user;
  }
}
