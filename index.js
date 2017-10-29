#!/usr/bin/env node

'use strict';

/**
 * @fileOverview ShopGoodWill.com CLI
 * @author <a href="mailto:shmoopillc@gmail.com">Shmoopi LLC</a>
 * @version 0.0.1
 * @example
 * shopgoodwill search "something 1" "something 2"
 * @example
 * shopgoodwill bid now -p 1.00 "id1"
 * @example
 * shopgoodwill bid later -r 6 -p 1.00 "id1"
 */

/* Imports */

// Headless Chrome
const puppeteer = require('puppeteer');
// Commander (CLI)
const program = require('commander');
// Winston (Logging)
const winston = require('winston');

// Auth
const auth = require('./src/auth');
// Search
const search = require('./src/search');

/* Constants */


/* Variables */

// Global Params
let headless_Mode = true;
let should_Authenticate = false;

// Search Params
let search_Array = [];
let search_Limit = 0;

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
        .option('-f, --file <path>', '.txt file separating search queries by newlines')
        .option('-l, --limit <number>', 'number of search results to show')
        .action(cli_Search);

    // Parse CLI Options
    cli_Parse();

}

/**
 * CLI Parse Options
 * Parses all of the CLI Options
 */
function cli_Parse() {

    // Only allow cli_Parse to run once
    cli_Parse = function () {};

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
                winston.level = 'debug';
                headless_Mode = false;
                break;
        }
    } else {
        winston.level = 'error';
    }

    // Check if authentication is enabled
    if (program.credentials || program.authenticate) {
        should_Authenticate = true;
    }

}

/**
 * CLI Search Action
 * Starts a search with all of the search action flags from the CLI
 * @param {Array} query - array of query strings
 * @param {Object} options - options object that contains references to option flags
 */
function cli_Search(query, options) {

    // Run CLI Parse
    cli_Parse();

    // Check if search has the required options
    // * Require at least one search query if search argument is provided
    // * Require a search query file if no query is provided
    if ((!query || query.length < 1) && (!options.file || options.file.length < 1)) {
        program.help();
        return;
    }
    // Check what items to search for (either by file input or CLI)
    if (options.file) {
        search_Array = fs.readFileSync(options.file).toString().split("\n");
    } else {
        search_Array = query;
    }
    // Double check the search items array has at least one item
    if (search_Array.length < 1) {
        program.help();
        return;
    }
    // Check the number of items to limit to
    if (options.limit) {
        search_Limit = options.limit;
    }

    // Run a new search
    newSearch();

}

/**
 * Main Search function
 * Starts a new search and uses the search command input to query
 */
async function newSearch() {

    // Launch the browser
    const browser = await puppeteer.launch({
        headless: headless_Mode
    });

    // Check if the user wants to authenticate
    if (should_Authenticate) {
        // Authenticate the user and get the results
        let didAuthenticate = await auth.login(browser, program.credentials);
        console.log('Authentication successful?: ' + didAuthenticate);
    }

    // Create the output results array
    let search_Output_Array = [];

    // Go through the search array
    for (let index in search_Array) {

        // Check the search array to verify no null index was accessed
        if (!search_Array[index] || search_Array[index].length < 1) {
            winston.error('Search query array index null: ' + index);
            continue;
        }

        // Create a new search object
        let current_Search = new search(browser, search_Array[index], search_Limit);

        // Get the search results async
        let current_Search_Results = await current_Search.getResults();

        // Add the search results to the output array
        search_Output_Array.push(current_Search_Results);

    }

    // Check if the CLI flags want the output in the console or in a file
    if (!program.output || program.output.length < 1) {
        console.log(JSON.stringify(search_Output_Array, null, 4));
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
                        console.log(JSON.stringify(search_Output_Array, null, 4));
                    }
                });
        }
        if (shouldWrite) {
            fs.writeFile(program.output, JSON.stringify(search_Output_Array, null, 4), function (err) {
                if (err) {
                    return console.log(err);
                }
                console.log('Saved output to: ' + program.output);
            });
        }
    }

    // Close the browser
    browser.close();
}

/* Main */

/**
 * Start the app
 */
cli();