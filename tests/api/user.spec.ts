import { test, expect } from '../../fixtures';
import { generateBio, generateDynamicUser } from '../../src/utils/dataGen';

test.describe('User settings API', () => {
  test('updates bio and current() reflects it', async ({ services }) => {
    const u = generateDynamicUser();
    const user = await services.auth.register(u);
    const bio = generateBio();

    // NB: backend always re-hashes password on update, so a password field is
    // required to avoid a 500 (see ARCHITECTURE notes on the updateUser quirk).
    const updated = await services.users.update({ bio, password: u.password }, user.token);
    expect(updated.bio).toBe(bio);

    const current = await services.users.current(user.token);
    expect(current.bio).toBe(bio);
  });
});
