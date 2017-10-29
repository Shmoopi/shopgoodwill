'use strict';

/**
 * @fileOverview search.js
 * @author <a href="mailto:shmoopillc@gmail.com">Shmoopi LLC</a>
 */

/* Imports */

// Headless Chrome
const puppeteer = require('puppeteer');
// Winston (Logging)
const winston = require('winston');

/* Constants */

// DOM Element Selectors
// Home Page
const SEARCH_SELECTOR = '#search-text-header';
const SEARCH_BUTTON_SELECTOR = '#searchBottomDeskTop > button';
// Search Results Page
const NUMBER_RESULTS_SELECTOR = '#search-results > div > div:nth-child(1) > nav > p';
const PRODUCT_NUMBER_SELECTOR = '#search-results > div > section > ul.products > li:nth-child(INDEX) > a > span > div.product-data > div.product-number';
const PRODUCT_TITLE_SELECTOR = '#search-results > div > section > ul.products > li:nth-child(INDEX) > a > span > div.product-data > div.title';
const PRODUCT_PRICE_SELECTOR = '#search-results > div > section > ul.products > li:nth-child(INDEX) > a > span > div.product-price > div.price';
const PRODUCT_END_TIME_SELECTOR = '#search-results > div > section > ul.products > li:nth-child(INDEX) > a > span > div.product-price > div.timer.product-countdown-PRODUCTID';
const PRODUCT_IMAGE_SELECTOR = '#search-results > div > section > ul.products > li:nth-child(INDEX) > a > div.image > img';
const PRODUCT_SELECTOR_CLASS = 'product';

// ShopGoodWill shows 40 resuls per page
const ITEMS_PER_PAGE = 40;

// URLS
const HOME_URL = 'https://www.shopgoodwill.com/';
const ITEM_URL = 'https://www.shopgoodwill.com/Item/';

/* Variables */

// Search Count
var search_Count = 0;

/* Main */

// Search class
module.exports = class Search {

    // Constructor
    constructor(browser = undefined, query = undefined, limit = 0) {
        this.browser = browser;
        this.query = query;
        this.limit = limit;
        this.results = {};
    }

    /**
     * Get the Search Results for the query
     * @returns {Object[]} - search results
     */
    async getResults() {

        // Verify the browser
        if (!this.browser) {
            winston.error('Invalid Browser - unable to search');
            return new Error('Invalid Browser - unable to search');
        }

        // Verify the query
        if (!this.query || typeof this.query !== 'string') {
            winston.error('Invalid Search Query - unable to search');
            return new Error('Invalid Search Query - unable to search');
        }

        // Get a new page
        const page = await this.browser.newPage();

        // Go to the home page
        await page.goto(HOME_URL);

        // Search
        this.results = await searchQuery(page, this.query, this.limit);

        // Close the page
        await page.close();

        // Get the results
        return this.results;
    }

}

/**
 * Search function
 * @param {page} page - browser page to do search
 * @param {String} query - query to search for
 * @param {Number} limit - number of items to limit to
 * @returns {Object[]} - search results
 */
async function searchQuery(page, query, limit = 0) {

    // Create the results
    let searchResults = {};

    // Log the search string
    winston.info('Search query: ' + query);
    if (!query || query.length < 1) {
        winston.error('Invalid Search Query - unable to search');
        return new Error('Invalid Search Query - unable to search');
    }

    // Search for things
    await page.type(SEARCH_SELECTOR, query);

    // Click the login button
    await page.click(SEARCH_BUTTON_SELECTOR);

    // Wait for navigation
    await page.waitForNavigation();

    // Now look for search result information //

    // Get the number of search results found overall
    let numberOfSearchItemsOverall = await page.evaluate((sel) => {
        let element = document.querySelector(sel);
        return element ? element.innerText : null;
    }, NUMBER_RESULTS_SELECTOR);

    // Check if we actually received any matches
    if (!numberOfSearchItemsOverall || numberOfSearchItemsOverall.indexOf('No items found') !== -1) {
        winston.info('No results found for search: ' + query);
        searchResults = {
            search: query,
            count: 0,
            items: []
        };
        return searchResults;
    }

    // Format is: "Showing 1–5 of 5 results
    let regexGetNumberBetweenSpaces = / (\d+) /;
    let itemsCountRegexArray = numberOfSearchItemsOverall.match(regexGetNumberBetweenSpaces);
    if (itemsCountRegexArray && itemsCountRegexArray.length > 1) {
        numberOfSearchItemsOverall = itemsCountRegexArray[1];
    } else {
        // Unable to get number of results
        winston.error('Search Failed - unable to identify number of items found');
        return new Error('Search Failed - unable to identify number of items found');
    }

    // Log the number of search results found overall
    winston.debug('Number of search results found overall: ' + numberOfSearchItemsOverall);

    // Limit to the number of search results (if applicable)
    if (Number(limit) > 0 && Number(limit) < Number(numberOfSearchItemsOverall)) {
        // Limit the search results to the max
        numberOfSearchItemsOverall = limit;
        // Log the number of search results limited
        winston.debug('Limiting search results to: ' + numberOfSearchItemsOverall);
    }

    // Get the number of pages
    let numPages = await getNumPages(numberOfSearchItemsOverall);

    // Create the search output array
    let searchOutputArray = [];

    // Zero the count
    search_Count = 0;

    // Go through all the pages with search results on them
    for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
        let resultsForPage = await parseSearchResults(page, pageNumber, limit);
        searchOutputArray = searchOutputArray.concat(resultsForPage);
    }

    // Add to the search results array
    searchResults = {
        search: query,
        count: numberOfSearchItemsOverall,
        items: searchOutputArray
    };

    // Return the results
    return searchResults;
}

/**
 * Parse Search Results function
 * Loads the search pages and parses data
 * @param {page} page - browser page to do search
 * @param {Number} index - current index of the page (e.x. 1 out of 5 pages)
 * @returns {Object[]} - search page results
 */
async function parseSearchResults(page, index, limit = 0) {

    // Output array
    let searchPageResults = [];

    // Check if the current index is 1 - if so, skip this
    if (index != 1) {

        // Get the current URL
        let currentURL = await page.url();

        // Find the page number in the URL
        let currentPageNum = index;
        let urlRegex = currentURL.match(/&p=(\d+)&/);
        if (!urlRegex || urlRegex.length < 2) {
            winston.debug('Parsing Search Results - unable to identify the current page number');
        } else {
            currentPageNum = parseInt(urlRegex[1]) + 1;
        }

        // Change it to the next page number
        let newURL = currentURL.replace(/&p=\d+&/, '&p=' + currentPageNum + '&');

        // Load the new url
        await page.goto(newURL);

    }

    // Get the number of products on the page
    let numberResultsForSearch = await page.evaluate((sel) => {
        return document.getElementsByClassName(sel).length;
    }, PRODUCT_SELECTOR_CLASS);

    // Log the number of search results found on the page
    winston.debug('Number of results on page ' + index + ': ' + numberResultsForSearch);

    // Check if there is a limit to the number of search results
    if (Number(limit) > 0 && Number(numberResultsForSearch) + Number(search_Count) > Number(limit)) {
        // Limit the number of results
        numberResultsForSearch = limit - search_Count;
        // Limit the number of search results found on the page
        winston.debug('Limiting number of results on page ' + index + ' to: ' + numberResultsForSearch);
    }

    // Go through all the products
    for (let i = 1; i <= numberResultsForSearch; i++) {

        // change the index to the next child
        let productNumberSelector = PRODUCT_NUMBER_SELECTOR.replace("INDEX", i);
        let productTitleSelector = PRODUCT_TITLE_SELECTOR.replace("INDEX", i);
        let productPriceSelector = PRODUCT_PRICE_SELECTOR.replace("INDEX", i);
        let productImageSelector = PRODUCT_IMAGE_SELECTOR.replace("INDEX", i);

        // Get the product number -> i.e. "34345388"
        let productNumber = await page.evaluate((sel) => {
            let element = document.querySelector(sel);
            return element ? element.innerText.replace('Product #: ', '') : null;
        }, productNumberSelector);

        // Get the product title -> i.e. "macbook pro"
        let productDescription = await page.evaluate((sel) => {
            let element = document.querySelector(sel);
            return element ? element.innerText : null;
        }, productTitleSelector);
        let productTitle = productDescription.split('\n')[0];
        let productBids = productDescription.split('\n')[1].replace('Bids: ', '');

        // Get the product price -> i.e. "$9.99"
        let productPrice = await page.evaluate((sel) => {
            let element = document.querySelector(sel);
            return element ? element.innerText : null;
        }, productPriceSelector);

        // Get the product end time after the product number is determined
        let productEndTimeSelector = PRODUCT_END_TIME_SELECTOR.replace("INDEX", i).replace("PRODUCTID", productNumber);

        // Get the product end date time
        let productTimeRemaining = await page.evaluate((sel) => {
            let element = document.querySelector(sel);
            return element ? element.innerText : null;
        }, productEndTimeSelector);

        // Get the product time remaining
        let productEndDateTime = await page.evaluate((sel) => {
            return document.querySelector(sel).getAttribute('data-countdown');
        }, productEndTimeSelector);

        // Get the product image url
        let productImageURL = await page.evaluate((sel) => {
            return document.querySelector(sel).getAttribute('src');
        }, productImageSelector);

        // Log the info
        winston.info('ID: ' + productNumber);
        winston.info('Title: ' + productTitle);
        winston.info('Bids: ' + productBids);
        winston.info('Price: ' + productPrice);
        winston.info('End Date/Time: ' + productEndDateTime);
        winston.info('Time Remaining: ' + productTimeRemaining);

        // Search results
        searchPageResults.push({
            id: productNumber,
            title: productTitle,
            bids: productBids,
            price: productPrice,
            end: productEndDateTime,
            remaining: productTimeRemaining,
            url: ITEM_URL + productNumber,
            image: productImageURL
        });

        // Increment the search count
        search_Count++;
    }

    // Return the results
    return searchPageResults;

}

/* Helper Functions */

/**
 * Get Number of Pages function
 * Helper Function
 * Takes the number of search items found for a query and provides the number of pages
 * e.g. 60 items = 60/40 = 1.5 = ceil(1.5) = 2 pages
 * @param {Number} numberOfSearchItemsOverall - number of search items found for a query
 * @returns {Number} - number of pages
 */
async function getNumPages(numberOfSearchItemsOverall) {

    // Get the number of pages as an int
    let numPages = parseInt(numberOfSearchItemsOverall);

    // Get the number of pages based on the number of items
    numPages = Math.ceil(numPages / ITEMS_PER_PAGE);

    // Number of pages
    winston.debug('Number of Pages: ', numPages);

    // Return the number
    return numPages;
}