// session.ts
export interface Auth {
    email: string;
    password: string;
}

export interface Opts {
    /**
     * If the puppeteer browser is headless or not, defaults to true.
     */
    headless: boolean;
}

// user.ts
export interface UserInfo {
    username: string;
    name: string | null;
    private: boolean;

    photoUrl: string;
    bio: string | null;
    pronouns: string | null;

    posts: number;
    followers: number;
    following: number;
}
