#!/usr/bin/env node

'use strict';

/* Imports */

// Headless Chrome
const puppeteer = require('puppeteer');

/* Constants */

// bidding.js
export default class {

    // Constructor
    constructor(itemID = "00000000", shouldBidNow = false, bidAmount = "0.00", bidTime = 10) {

        /**
         * @param {boolean} itemID - Should the bid be placed now?
         * @default "00000000"
         */
        this.itemID = itemID;

        /**
         * @param {boolean} shouldbidnow - Should the bid be placed now?
         * @default false
         */
        this.shouldBidNow = shouldBidNow;

        /**
         * @param {boolean} bidAmount - Bid amount to be placed
         * @default "0.00"
         */
        this.bidAmount = bidAmount;

        /**
         * @param {number} bidTime - Time (in seconds) remaining on the item when the bid should be placed
         * @default 10 seconds from the end of the auction
         */
        this.bidTime = bidTime;

    }

    /* Functions */

    /**
     * Accept the bid terms and bid (now or later)
     */
    acceptBid(browser, page, credentials) {

        // Verify the browser and the page
        if (!browser || !page || !credentials) {
            console.log("No browser, or page, or credentials passed");
            return;
        }

        // Figure out when the bid should be placed
        if (this.shouldBidNow) {
            // Bid now
        } else {
            // Bid later
        }

    }

    /**
     * Bid
     */
    bid(browser, page, credentials) {
        // Login

        // Load the item page

        // Type the bid

        // Accept the bid

        // Accept the popup

    }

}