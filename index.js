#!/usr/bin/env node

'use strict';

/**
 * @fileOverview ShopGoodWill.com CLI
 * @author <a href="mailto:shmoopillc@gmail.com">Shmoopi LLC</a>
 * @version 0.0.1
 * @example
 * shopgoodwill search "something 1" "something 2"
 */

/* Imports */

// Headless Chrome
const puppeteer = require('puppeteer');
// Commander (CLI)
const program = require('commander');
// Inquirer (Input)
const inquirer = require('inquirer');
// Winston (Logging)
const winston = require('winston');
// Credentials
let creds;
// Filesystem
const fs = require('fs');

/* Constants */

// DOM Element Selectors
// Login Page
const USERNAME_SELECTOR = '#Username';
const PASSWORD_SELECTOR = '#Password';
const LOGIN_BUTTON_SELECTOR = '#login-submit';
const LOGIN_FAILED_SELECTOR = '#login-form > div:nth-child(2) > span';
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

/* Variables */

// Search Params
let search_Filepath = '';
let search_Array = [];

// URLS
const HOME_URL = 'https://www.shopgoodwill.com/';
const SIGNIN_URL = 'https://www.shopgoodwill.com/SignIn';
const ITEM_URL = 'https://www.shopgoodwill.com/Item/';

/* Functions */

/**
 * CLI Setup and EntryPoint
 */
function cli() {

    // Increase verbosity
    function increaseVerbosity(v, total) {
        return total + 1;
    }

    // CLI
    program
        .version('0.0.1')
        .description('shopgoodwill.com CLI - search and bid')
        .option('-o, --output <path>', 'output path - default prints JSON to console')
        .option('-c, --credentials <path>', 'path to credentials to log into shopgoodwill.com')
        .option('-a, --authenticate', 'prompt to authenticate into shopgoodwill.com')
        .option('-v, --verbose', 'verbose logging', increaseVerbosity, 0)

    program
        .command('search [query...]')
        .description('search queries quoted and separated by a space (i.e. "item 1" "item 2" "item 3")')
        .option('-f, --file <path>', '.txt file separating search queries by nelines')
        .action((query, options) => {

            // Check if search has the required options
            if ((!query || query.length < 1) && (!options.file || options.file.length < 1)) {
                program.help();
                return;
            }
            if (options.file) {
                search_Filepath = options.file;
            } else {
                search_Array = query;
            }

            // Run a new search
            newSearch();
        });

    // Parse the arguments
    program.parse(process.argv);

    // Check the program.args
    let noCommands = program.args.length === 0;

    // Check if no commands were issued
    if (noCommands) {
        // Display usage
        program.help();
    }

    // Set up logging
    //
    // Configure CLI output on the default logger
    //
    winston.cli();
    if (program.verbose && program.verbose > 0) {
        switch (program.verbose) {
            case 1:
                winston.level = 'info';
                break;
            case 2:
                winston.level = 'debug';
                break;
            default:
                winston.level = 'info';
                break;
        }
    } else {
        winston.level = 'error';
    }

}

/**
 * Main Search function
 * Starts a new search and uses the search command input to query
 */
async function newSearch() {

    // Launch the browser
    const browser = await puppeteer.launch({
        headless: true
    });

    // Get a new page
    const page = await browser.newPage();

    // Login - if needed
    let ableToLogin = await login(page);
    if (ableToLogin instanceof Error) {
        process.exit(1);
    }

    // Search
    let searchResults = await search(page);

    // Output search results
    await outputSearchResults(searchResults);

    // Close the browser
    browser.close();
}

/**
 * Login function
 * (if input requires)
 * required if user is bidding
 * @param {page} page - browser page to do login
 * @return {error} - returns an error if authentication fails
 */
async function login(page) {

    // Check if the cli user wants to log in
    if (program.credentials && fs.existsSync(program.credentials)) {
        // Import the credentials file
        creds = require(program.credentials);
        // Login
    } else if (program.authenticate) {
        await inquirer.prompt(
                [{
                        type: 'input',
                        name: 'username1',
                        message: 'Enter your shopgoodwill.com username:'
                    },
                    {
                        type: 'password',
                        message: 'Enter your shopgoodwill.com password:',
                        name: 'password1'
                    }
                ])
            .then(function (answers) {
                creds = {
                    username: answers.username1,
                    password: answers.password1
                }
            });
    } else {
        // Don't login

        // Go to the home page
        await page.goto(HOME_URL);

        return;
    }

    // Go to the login page
    await page.goto(SIGNIN_URL);

    // Put in the username and password
    await page.click(USERNAME_SELECTOR);
    await page.type(creds.username);

    await page.click(PASSWORD_SELECTOR);
    await page.type(creds.password);

    // Click the login button
    await page.click(LOGIN_BUTTON_SELECTOR);

    // Wait for navigation
    await page.waitForNavigation();

    //TODO: Verify login successful
    // Make sure the login error didn't occur
    let verifyLogin = await page.evaluate((sel) => {
        let element = document.querySelector(sel);
        return element ? element.innerText : null;
    }, LOGIN_FAILED_SELECTOR);

    // Check if we actually received any matches
    if (verifyLogin) {
        winston.error('Invalid credentials - unable to log in');
        return new Error('Invalid credentials - unable to log in')
    }
}

/**
 * Search function
 * Uses search queries from CLI or file path
 * @param {page} page - browser page to do search
 * @returns {Object[]} - search results
 */
async function search(page) {

    // Create the results
    let searchResults = [];

    // Check if search is going to be from contents of a file or array of words
    let array = [];
    if (search_Filepath.length > 0) {
        array = fs.readFileSync(search_Filepath).toString().split("\n");
    } else {
        array = search_Array;
    }
    // Go through the array
    for (let i in array) {

        // Log the search string
        winston.info('Search query: ' + array[i]);
        if (!array[i] || array[i].length < 1) {
            continue;
        }

        // Search for things
        await page.click(SEARCH_SELECTOR);
        await page.type(array[i]);

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
            winston.info('No results found for search: ' + array[i]);
            searchResults.push({
                search: array[i],
                count: 0,
                items: []
            });
            continue;
        }

        // Format is: "Showing 1–5 of 5 results
        let regexGetNumberBetweenSpaces = / (\d+) /;
        numberOfSearchItemsOverall = numberOfSearchItemsOverall.match(regexGetNumberBetweenSpaces)[1];

        // Log the number of search results found overall
        winston.debug('Number of search results found overall: ' + numberOfSearchItemsOverall);

        // Get the number of pages
        let numPages = await getNumPages(numberOfSearchItemsOverall);

        // Create the search output array
        let searchOutputArray = [];

        // Go through all the pages with search results on them
        for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
            let resultsForPage = await parseSearchResults(page, pageNumber);
            searchOutputArray = searchOutputArray.concat(resultsForPage);
        }

        // Add to the search results array
        searchResults.push({
            search: array[i],
            count: numberOfSearchItemsOverall,
            items: searchOutputArray
        });

    }

    return searchResults;
}

/**
 * Parse Search Results function
 * Loads the search pages and parses data
 * @param {page} page - browser page to do search
 * @returns {Object[]} - search page results
 */
async function parseSearchResults(page, index) {

    // Output array
    let searchPageResults = [];

    // Check if the current index is 1 - if so, skip this
    if (index != 1) {

        // Get the current URL
        let currentURL = await page.url();

        // Find the page number in the URL
        let urlRegex = currentURL.match(/&p=(\d+)&/);
        let currentPageNum = parseInt(urlRegex[1]);

        // Change it to the next page number
        newURL = currentURL.replace('&p=' + currentPageNum + '&');

        // Load the new url
        await page.goto(newURL);

    }

    // Get the number of products on the page
    let numberResultsForSearch = await page.evaluate((sel) => {
        return document.getElementsByClassName(sel).length;
    }, PRODUCT_SELECTOR_CLASS);

    // Log the number of search results found on the page
    winston.debug('Number of results on page ' + index + ': ' + numberResultsForSearch);

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
    }

    // Return the results
    return searchPageResults;

}

/**
 * Output Search Results function
 * Outputs the combined search results for all queries and all products from the queries
 * @param {Object[]} searchResults - results from the search
 */
async function outputSearchResults(searchResults) {

    // Check if the CLI flags want the output in the console or in a file
    if (!program.output || program.output.length < 1) {
        console.log(JSON.stringify(searchResults));
    } else {
        let shouldWrite = true;
        if (fs.existsSync(program.output)) {
            await inquirer.prompt(
                    [{
                        type: 'list',
                        name: 'yesno',
                        message: 'File: ' + program.output + ' already exists.  Overwrite?',
                        choices: ['Yes', 'No']
                    }])
                .then(function (answers) {
                    if (answers.yesno != "Yes") {
                        shouldWrite = false;
                        console.log('Not saving output to: ' + program.output);
                        console.log(JSON.stringify(searchResults));
                    }
                });
        }
        if (shouldWrite) {
            fs.writeFile(program.output, JSON.stringify(searchResults), function (err) {
                if (err) {
                    return console.log(err);
                }
                console.log('Saved output to: ' + program.output);
            });
        }
    }

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

    // ShopGoodWill shows 40 resuls per page
    numPages = Math.ceil(numPages / 40);

    // Number of pages
    winston.debug('Number of Pages: ', numPages);

    // Return the number
    return numPages;
}

/* Main */

/**
 * Start the app
 */
cli();