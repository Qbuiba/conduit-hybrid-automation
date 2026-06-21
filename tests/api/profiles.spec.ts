import { test, expect } from '../../fixtures';
import { generateDynamicUser } from '../../src/utils/dataGen';

test.describe('Profiles API', () => {
  test('follow then unfollow toggles the following flag', async ({ services }) => {
    const author = await services.auth.register(generateDynamicUser());
    const follower = await services.auth.register(generateDynamicUser());

    const followed = await services.profiles.follow(author.username, follower.token);
    expect(followed.following).toBe(true);

    const profile = await services.profiles.get(author.username, follower.token);
    expect(profile.following).toBe(true);

    const unfollowed = await services.profiles.unfollow(author.username, follower.token);
    expect(unfollowed.following).toBe(false);
  });
});
