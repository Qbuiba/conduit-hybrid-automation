import { APIRequestContext } from '@playwright/test';
import { TagsEnvelope } from '../types';
import { endpoint } from '../clients/apiClient';

/** Wraps /api/tags. */
export class TagService {
  constructor(private readonly request: APIRequestContext) {}

  /** GET /api/tags — fetch tags to drive parameterized UI filtering tests. */
  async list(): Promise<string[]> {
    const res = await this.request.get(endpoint('/tags'));
    if (!res.ok()) {
      throw new Error(`list tags failed (${res.status()}): ${await res.text()}`);
    }
    return ((await res.json()) as TagsEnvelope).tags;
  }
}
