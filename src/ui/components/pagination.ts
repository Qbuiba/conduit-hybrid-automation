import { Page } from '@playwright/test';

/** Reusable pagination control on feed/profile lists. */
export class Pagination {
  constructor(private readonly page: Page) {
    // TODO: assign locators via codegen.
  }
}
