'use strict'

/* Imports */

// Expect
const expect = require('chai').expect;
// Search
const search = require('../src/search');

// Test Search
describe('search', function () {

    // It should find something
    it('Should find some items', async() => {

        // Create the search object
        let newSearch = new search('item', 1);

        // Get the output
        let results = await newSearch.getResults();

        // Expectation
        expect(output).to.be.instanceOf(Error);

    });

});