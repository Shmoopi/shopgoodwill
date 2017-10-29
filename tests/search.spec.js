'use strict'

/* Imports */

// Headless Chrome
const puppeteer = require('puppeteer');
// Expect
const expect = require('chai').expect;
// Search
const search = require('../src/search');

// Test Search
describe('search', function () {
    // Set the timeout for the search tests to 30 seconds
    this.timeout(30000);

    // It should fail due to a missing browser
    it('Should fail due to a missing browser', async() => {

        // Create the search object
        let newSearch = new search();

        // Get the output
        let output = await newSearch.getResults();

        // Expectation
        expect(output).to.be.instanceOf(Error);

    });

    // It should fail due to a missing query
    it('Should fail due to a missing search query', async() => {

        // Launch the browser
        const browser = await puppeteer.launch({
            headless: true
        });

        // Create the search object
        let newSearch = new search(browser);

        // Get the output
        let output = await newSearch.getResults();

        // Expectation
        expect(output).to.be.instanceOf(Error);

        // Close the browser
        await browser.close();

    });

    // It should find no items
    it('Should find no items', async() => {

        // Launch the browser
        const browser = await puppeteer.launch({
            headless: true
        });

        // Create the search object
        let newSearch = new search(browser, 'kjdslkfjdlskjd', 1);

        // Get the output
        let output = await newSearch.getResults();

        // Expectations
        expect(output).to.not.be.instanceOf(Error);
        expect(output).to.be.instanceOf(Object);
        expect(output).to.have.all.keys('search', 'count', 'items');
        expect(output.count).to.equal(0);
        expect(output.search).to.equal('kjdslkfjdlskjd');
        expect(output.items).to.be.an('array').that.is.empty;

        // Close the browser
        await browser.close();

    });

    // It should find some items
    it('Should find some items', async() => {

        // Launch the browser
        const browser = await puppeteer.launch({
            headless: true
        });

        // Create the search object
        let newSearch = new search(browser, 'item');

        // Get the output
        let output = await newSearch.getResults();

        // Expectations
        expect(output).to.not.be.instanceOf(Error);
        expect(output).to.be.instanceOf(Object);
        expect(output).to.have.all.keys('search', 'count', 'items');
        expect(output.search).to.equal('item');
        expect(output.items).to.be.an('array').that.is.not.empty;

        // Close the browser
        await browser.close();

    });

    // It should find a limited number of items
    it('Should find a limited number of items', async() => {

        // Launch the browser
        const browser = await puppeteer.launch({
            headless: true
        });

        // Create the search object
        let newSearch = new search(browser, 'item', 4);

        // Get the output
        let output = await newSearch.getResults();

        // Expectations
        expect(output).to.not.be.instanceOf(Error);
        expect(output).to.be.instanceOf(Object);
        expect(output).to.have.all.keys('search', 'count', 'items');
        expect(output.search).to.equal('item');
        expect(output.count).to.equal(4);
        expect(output.items).to.have.lengthOf(4);

        // Close the browser
        await browser.close();

    });

    // It should find valid items
    it('Should find valid items', async() => {

        // Launch the browser
        const browser = await puppeteer.launch({
            headless: true
        });

        // Create the search object
        let newSearch = new search(browser, 'item', 4);

        // Get the output
        let output = await newSearch.getResults();

        // Expectations
        expect(output).to.not.be.instanceOf(Error);
        expect(output).to.be.instanceOf(Object);
        expect(output).to.have.all.keys('search', 'count', 'items');
        expect(output.search).to.equal('item');
        expect(output.count).to.equal(41);
        expect(output.items).to.have.lengthOf(41);

        // Validate item object
        for (let index in output.items) {
            expect(output.items[index]).to.have.all.keys('id', 'title', 'bids', 'price', 'end', 'remaining', 'url', 'image');
        }
        expect(output.items[0].id).to.have.lengthOf.within(1, 9); // Not recommended
        expect(output.items[0].title).to.have.lengthOf.at.least(1); // Not recommended
        expect(output.items[0].bids).to.have.lengthOf.at.least(1); // Not recommended
        expect(output.items[0].price).to.have.string('$');
        expect(output.items[0].end).to.match(/^[0-3]?[0-9].[0-3]?[0-9].(?:[0-9]{2})?[0-9]{2}/);
        expect(output.items[0].remaining).to.have.lengthOf.at.least(1); // Not recommended
        expect(output.items[0].url).to.have.string('https://');
        expect(output.items[0].image).to.have.string('https://');

        // Close the browser
        await browser.close();

    });

});