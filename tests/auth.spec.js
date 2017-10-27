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
    this.timeout(30000);

    // It should fail due to missing page
    it('Should fail due to missing page', async() => {

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

        // Get a new page
        const page = await browser.newPage();

        // Get the output
        let output = await auth.login(page);

        // Expectation
        expect(output).to.be.instanceOf(Error);

    });

    // It should succeed due to valid creds
    it('Should succeed with valid creds', async() => {

        // Launch the browser
        const browser = await puppeteer.launch({
            headless: true
        });

        // Get a new page
        const page = await browser.newPage();

        // Require path
        const path = require('path');
        let credsPath = path.join(__dirname, '..', 'src', 'creds.js');

        // Get the output
        let output = await auth.login(page, credsPath);

        // Expectation
        expect(output).to.not.be.instanceOf(Error);
        expect(output).to.be.undefined;

    });

});