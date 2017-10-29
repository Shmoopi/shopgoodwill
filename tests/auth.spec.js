'use strict'

/* Imports */

// Headless Chrome
const puppeteer = require('puppeteer');
// Expect
const expect = require('chai').expect;
// Auth
const auth = require('../src/auth');

// Test Authentication
describe('auth', function () {
    // Set the timeout for the search tests to 30 seconds
    this.timeout(30000);

    // It should fail due to missing browser
    it('Should fail due to missing browser', async() => {

        // Get the output
        let output = await auth.login();

        // Expectation
        expect(output).to.be.instanceOf(Error);

    });

    // It should fail due to invalid creds - REQUIRES INPUT
    it('Should fail due to invalid creds', async() => {

        // Launch the browser
        const browser = await puppeteer.launch({
            headless: true
        });

        // Get the output
        let output = await auth.login(browser);

        // Expectation
        expect(output).to.be.instanceOf(Error);

        // Close the browser
        await browser.close();

    });

    // It should succeed due to valid creds
    it('Should succeed with valid creds', async() => {

        // Launch the browser
        const browser = await puppeteer.launch({
            headless: true
        });

        // Require path
        const path = require('path');
        let credsPath = path.join(__dirname, '..', 'src', 'creds.js');

        // Get the output
        let output = await auth.login(browser, credsPath);

        // Expectation
        expect(output).to.not.be.instanceOf(Error);
        expect(output).to.be.undefined;

        // Close the browser
        await browser.close();

    });

});