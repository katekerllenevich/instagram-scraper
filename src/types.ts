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
