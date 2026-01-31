import puppeteer, { Browser, Page } from "puppeteer";
import { Auth, Opts } from "./types.js";
import { User } from "./user.js";
import { Post } from "./post.js";

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
        private opts: Opts,
    ) {}

    /**
     * Launches the browser and authenticates the account.
     */
    async launch() {
        this.browser = await puppeteer.launch({
            headless: this.opts.headless,
            // strict args help with some basic bot detection
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        await this.authenticate();
    }

    /**
     * Signs the account into Instagram.
     */
    private async authenticate() {
        if (!this.isInit()) {
            return;
        }

        const page = await this.page(
            "https://www.instagram.com/accounts/login/",
        );

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
        if (!this.isInit() || !this.authenticated) {
            return null;
        }

        const page = await this.page(`https://www.instagram.com/${username}`);

        const user = new User(username, page);
        await user.loadInfo();

        return user;
    }

    /**
     * Gets a page instance that represents a post's page on Instagram.
     *
     * @param post_id The id of the post.
     * @returns null if the browser has not been launched or not authenticated,
     *          otherwise return the post object.
     */
    async getPost(post_id: string): Promise<Post | null> {
        if (!this.isInit() || !this.authenticated) {
            return null;
        }

        const page = await this.page(`https://www.instagram.com/p/${post_id}`);

        const post = new Post(post_id, page);
        await post.load();

        return post;
    }

    /**
     * Close the browser instance.
     * Any future method calls on this class will likely break.
     */
    async close() {
        await this.browser?.close();
    }

    /**
     * Creates a new browser page.
     *
     * @returns The puppeteer page object.
     */
    private async page(url: string): Promise<Page> {
        const page = await this.browser!.newPage();
        await page.setViewport({ height: 1024, width: 1080 });
        await page.goto(url, {
            waitUntil: "networkidle2",
        });

        return page;
    }

    /**
     * @returns if the browser has been opened yet.
     */
    private isInit(): boolean {
        return this.browser != null;
    }
}
