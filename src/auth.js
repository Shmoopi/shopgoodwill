'use strict';

/**
 * @fileOverview search.js
 * @author <a href="mailto:shmoopillc@gmail.com">Shmoopi LLC</a>
 */

/* Imports */

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
const LOGIN_FAILED_SELECTOR = '#login-form > div:nth-child(3) > span';

// URL's
const SIGNIN_URL = 'https://www.shopgoodwill.com/SignIn';

/* Main */

/**
 * Login function
 * Logs into shopgoodwill.com with either a credentials file or prompts the user to authenticate over CLI
 * @param {page} page - browser page to do login
 * @return {error} - returns an error if authentication fails
 */
async function login(page = undefined, credentials = undefined) {

    // Check the page
    if (!page) {
        winston.error('Invalid Page Provided - unable to log in');
        return new Error('Invalid Page Provided - unable to log in');
    }

    // Check if credentials come from a file or if we need to authenticate
    if (credentials && fs.existsSync(credentials)) {

        // Import the credentials file
        creds = require(credentials);

    } else {

        // Prompt the user to authenticate
        let answers = await inquirer.prompt(
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
            ]);

        creds = {
            username: answers.username1,
            password: answers.password1
        }

    }

    // Go to the login page
    await page.goto(SIGNIN_URL);

    // Put in the username and password
    await page.type(USERNAME_SELECTOR, creds.username);

    await page.type(PASSWORD_SELECTOR, creds.password);

    // Click the login button
    await page.click(LOGIN_BUTTON_SELECTOR);

    // Wait for navigation
    await page.waitForNavigation();

    // Verify login successful

    // Make sure a login error didn't occur
    let verifyLogin = await page.evaluate((sel) => {
        let element = document.querySelector(sel);
        return element ? element.innerText : null;
    }, LOGIN_FAILED_SELECTOR);

    // Check if we actually received any matches
    if (verifyLogin) {
        winston.error('Invalid credentials - unable to log in');
        return new Error('Invalid credentials - unable to log in');
    }

}

/* Public Exports */
module.exports = {
    login: login
}