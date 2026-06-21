import { Page } from '@playwright/test';

/** Shared footer. */
export class Footer {
  constructor(private readonly page: Page) {
    // TODO: assign locators via codegen.
  }
}
