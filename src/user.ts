import { Page } from "puppeteer";

/**
 * Represents a user who's page is open in the browser.
 * Currently the actively signed in user is not guaranteed to work.
 */
export class User {
    private info:
        | {
              username: string;
              name: string | null;
              private: boolean;
              verified: boolean;

              avatarUrl: string;
              bio: string | null;
              pronouns: string | null;

              posts: number;
              followers: number;
              following: number;
          }
        | undefined;

    /**
     * @param username The user's username.
     * @param page The puppeteer browser page.
     */
    constructor(
        private username: string,
        private page: Page,
    ) {}

    /**
     * @returns The username of the account, undefined if data has not been loaded.
     */
    getUsername(): string | undefined {
        return this.info?.username;
    }

    /**
     * @returns The account's name, null if not set, undefined if data has not been loaded.
     */
    getName(): string | null | undefined {
        return this.info?.name;
    }

    /**
     * @returns True/false the account is private/not, undefined if data has not been loaded.
     */
    isPrivate(): boolean | undefined {
        return this.info?.private;
    }

    /**
     * @returns True/false the account is verified/not, undefined if data has not been loaded.
     */
    isVerified(): boolean | undefined {
        return this.info?.verified;
    }

    /**
     * @returns The url of the avatar, undefined if data has not been loaded.
     */
    getAvatarUrl(): string | undefined {
        return this.info?.avatarUrl;
    }

    getBio(): string | null | undefined {
        return this.info?.bio;
    }

    getPronouns(): string | null | undefined {
        return this.info?.pronouns;
    }

    getPostCount(): number | undefined {
        return this.info?.posts;
    }

    getFollowerCount(): number | undefined {
        return this.info?.followers;
    }

    getFollowingCount(): number | undefined {
        return this.info?.following;
    }

    /**
     * This function finds the user's info and caches it. If it is cached, then
     * is just returns the cached value. The user's info concerns the information
     * about their account (ex: name, follower count, pronouns, etc.).
     *
     * @returns User's info
     */
    async loadInfo() {
        // load user info
        await this.page.waitForSelector(`header img[alt$="profile picture"]`, {
            timeout: 5000,
        });

        // get profile picture
        const raw = await this.page.evaluate(() => {
            // find name
            // the first one should be the name if it exists
            const candidates = Array.from(
                document.querySelectorAll('header span[dir="auto"]'),
            );
            const nameEl = candidates.find((span) => {
                if (span.closest("h2")) return false; // avoid username
                if (span.closest("a")) return false; // avoid stats

                // must not have child span
                if (span.querySelector("span")) return false;
                // ignore posts section if selected accidentally
                if (span.textContent.includes(" posts")) return false;

                return true;
            });

            // find the pronouns
            // if the pronouns are set, then the parent of the name element will
            // have two children
            let pronouns = null;
            if ((nameEl?.parentElement?.childElementCount ?? 0) == 2) {
                pronouns =
                    nameEl?.parentElement?.lastChild?.textContent ?? null;
            }

            // try to see if the account is private
            // nonprivate accounts have a tablist (posts, reels, reposts, etc)
            // if we can find this then its not private
            const isPrivate =
                document.querySelectorAll('main div[role="tablist"]').length ==
                0;

            // find the bio
            const bioEl = document.querySelector(
                'header div[role="button"] span[dir="auto"]',
            );
            let bio = null;
            if (bioEl) {
                // mutate to avoid the <a> tags and convert <br> tags to \n
                const clone = bioEl.cloneNode(true) as Element;
                clone.querySelectorAll("a").forEach((a) => {
                    a.replaceWith(document.createTextNode(a.textContent ?? ""));
                });

                clone.querySelectorAll("br").forEach((br) => {
                    br.replaceWith(document.createTextNode("\n"));
                });

                bio = clone.textContent;
                clone.remove();
            }

            // find posts
            const allSpans = Array.from(
                document.querySelectorAll("header span"),
            );
            const postEl = allSpans.find(
                (span) =>
                    span.textContent.includes("posts") &&
                    !span.closest("a") && // posts is not clickable
                    span.querySelector("span"), // must have child span
            )?.firstChild;

            // find followers and following
            // if the account is private then the methodology is different
            let followerEl = null;
            let followingEl = null;
            if (isPrivate) {
                const anchors = Array.from(
                    document.querySelectorAll('header a[href="#"]'),
                );

                followerEl = anchors.find((el) =>
                    el.textContent?.includes("followers"),
                );
                followingEl = anchors.find((el) =>
                    el.textContent?.includes("following"),
                );
            } else {
                followerEl = document.querySelector(
                    'header a[href$="/followers/"]',
                );
                followingEl = document.querySelector(
                    'header a[href$="/following/"]',
                );
            }
            followerEl = followerEl?.querySelector("span[title]");
            followingEl = followingEl?.querySelector("span span");

            return {
                username:
                    document.querySelector("header h2")?.textContent ?? null,
                name: nameEl?.textContent.trim() ?? null,
                private: isPrivate,
                verified:
                    document.querySelector(
                        'header svg[aria-label="Verified"',
                    ) != null,

                avatarUrl:
                    (
                        document.querySelector(
                            'header img[alt$="profile picture"]',
                        ) as HTMLImageElement
                    )?.src ?? "",
                bio,
                pronouns,

                postText: postEl?.textContent ?? null,
                followerText: followerEl?.getAttribute("title"),
                followingText: followingEl?.textContent,
            };
        });

        this.info = {
            username: raw.username ?? this.username,
            name: raw.name,
            private: raw.private,
            verified: raw.verified,

            avatarUrl: raw.avatarUrl,
            bio: raw.bio,
            pronouns: raw.pronouns,

            posts: this.cleanNum(raw.postText),
            followers: this.cleanNum(raw.followerText),
            following: this.cleanNum(raw.followingText),
        };
    }

    /**
     * Reload the page and get refresh information.
     */
    async reload() {
        await this.page.reload();
        this.loadInfo();
    }

    /**
     * Parse counts on Instagram, which usually come including commas.
     *
     * @param num String to try to remove commas from
     * @returns Number parsed from string, -1 if not able to parse
     */
    private cleanNum(num: string | null | undefined): number {
        if (!num) {
            return -1;
        }

        const clean = num.replace(/,/g, "").trim(); // Remove commas
        return parseInt(clean) || -1;
    }
}
