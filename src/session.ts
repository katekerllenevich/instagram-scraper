import puppeteer, { Browser, Page } from "puppeteer";
import { Auth, Opts } from "./types.js";
import { User } from "./user.js";

/**
 * Represents a logged in user in their own web browser.
 */
export class InstagramSession {
    private browser: Browser | null = null;
    private authenticated: boolean = false;

    /**
     * Create a new session.
     * 
     * @param auth The authentication options for the account.
     * @param opts Settings for the scraper.
     */
    constructor(
        private auth: Auth,
        private opts: Opts = {
            headless: true,
        },
    ) {}

    /**
     * Launches the browser.
     */
    async launch() {
        this.browser = await puppeteer.launch({
            headless: this.opts.headless,
            // strict args help with some basic bot detection
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
    }

    /**
     * Signs the account into Instagram.
     */
    async authenticate() {
        if (!this.isInit()) {
            return;
        }

        const page = await this.page();
        await page.goto("https://www.instagram.com/accounts/login/", {
            waitUntil: "networkidle2",
        });

        // fill in email
        const emailSelector = 'input[name="email"]';
        await page.waitForSelector(emailSelector, { timeout: 5000 });
        await page.type(emailSelector, this.auth.email, { delay: 50 });

        // fill in password
        const passSelector = 'input[name="pass"]';
        await page.type(passSelector, this.auth.password, { delay: 50 });

        // this is more tricky -- we need to find the login button
        // currently this is just a div acting as a button
        const loginXPath = '//div[@role="button"][contains(., "Log in")]';
        const loginSelector = await page.waitForSelector(
            `xpath/${loginXPath}`,
            { timeout: 5000 },
        );
        await loginSelector!.click();

        await page.waitForNavigation({ waitUntil: "networkidle2" });

        // TODO: instagram doesn't always immediately sign in, sometimes
        // another button has to be pressed

        await page.close();
        this.authenticated = true;
    }

    /**
     * Gets a user instance that represents a user's page on Instagram.
     * 
     * @param username The username of the user.
     * @returns null if the browser has not been launched or not authenticated,
     *          otherwise return the user object.
     */
    async getUser(username: string): Promise<User | null> {
        if (!this.isInit() || !this.authenticate) {
            return null;
        }

        const page = await this.page();
        await page.goto(`https://www.instagram.com/${username}`, {
            waitUntil: "networkidle2",
        });

        return new User(username, page);
    }

    /**
     * Creates a new browser page.
     * 
     * @returns The puppeteer page object.
     */
    private async page(): Promise<Page> {
        const page = await this.browser!.newPage();
        await page.setViewport({ height: 1024, width: 1080 });
        return page;
    }

    /**
     * @returns if the browser has been opened yet.
     */
    private isInit(): boolean {
        return this.browser != null;
    }
}
