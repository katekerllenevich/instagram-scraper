import { InstagramSession } from "./session.js";
import { Auth, Opts } from "./types.js";

export type { Auth, Opts } from "./types.js";
export { InstagramSession } from "./session.js";
export { User } from "./user.js";

/**
 * Creates and initializaes new session of Instagram.
 *
 * @param auth The account to login with.
 * @param opts The options of the account to use.
 * @returns A new InstagramSession.
 */
export async function newSession(
    auth: Auth,
    opts: Opts = {
        headless: true,
    },
) {
    const session = new InstagramSession(auth, opts);
    await session.launch();

    return session;
}
