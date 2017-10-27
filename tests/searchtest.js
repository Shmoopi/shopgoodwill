'use strict'

/* Imports */

// Search
const search = require('../src/search');

// Test Search

async function main() {
    // Create the search object
    let newSearch = new search('item', 1);

    console.log('New Search: ' + newSearch)

    // Get the output
    let results = await newSearch.getResults();

    console.log('Results: ' + results);
}

main();