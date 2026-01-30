import { Page } from "puppeteer";

/**
 * Represents a post who's page is open in the browser.
 */
export class Post {
    /**
     * 
     * @param post_id The post's id.
     * @param page The puppeteer browser page.
     */
    constructor(
        private post_id: string,
        private page: Page,
    ) {}

    /**
     * Close the post's page.
     * Any future method calls on this class will likely break.
     */
    async close() {
        await this.page?.close();
    }
}
