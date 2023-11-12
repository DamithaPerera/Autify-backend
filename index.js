const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const {DateTime} = require('luxon');
const path = require('path');

/**
 * Get content from the url
 * @param url
 * @returns {Promise<null|any>}
 */
async function fetch(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(`Error fetching ${url}: ${error.message}`);
        return null;
    }
}

/**
 * function to save html content to file
 * @param url
 * @param content
 * @returns {Promise<null|*>}
 */
async function saveToFile(url, content) {
    try {
        // generate file name from the url
        const fileName = path.join(__dirname, `${url.replace(/https?:\/\//, '')}.html`);
        // write content to file
        await fs.promises.writeFile(fileName, content);
        // success message log
        console.log(`Saved ${url} to ${fileName}`);
        return fileName;
    } catch (error) {
        // log error if file saving fails
        console.error(`Error saving ${url} to file: ${error.message}`);
        return null;
    }
}

/**
 * extract metadata from html content
 * @param html
 * @returns {{numLinks: (jQuery|number), numImages: (jQuery|number), lastFetch: string}}
 */
function getMetadata(html) {
    const $ = cheerio.load(html);
    const numLinks = $('a').length;
    const numImages = $('img').length;
    const lastFetch = DateTime.utc().toUTC().toString();

    return {numLinks, numImages, lastFetch};
}

/**
 * extract metadata from html
 * @param metadata
 * @param url
 */
function printMetadata(metadata, url) {
    console.log(`site: ${url}`);
    console.log(`num_links: ${metadata.numLinks}`);
    console.log(`images: ${metadata.numImages}`);
    console.log(`last_fetch: ${metadata.lastFetch}`);
}

/**
 * orchestrate the process
 * @returns {Promise<void>}
 */
async function main() {
    // Get command line arguments
    const args = process.argv.slice(2);
    // Check if at least one URL is provided
    if (args.length === 0) {
        console.error('Please provide at least one URL');
        process.exit(1);
    }
    // Check if metadata flag is present
    const metadataFlagIndex = args.indexOf('--metadata');
    const isMetadataRequested = metadataFlagIndex !== -1;
    // Fetch content for each URL concurrently
    await Promise.all(args.map(async (url) => {
        // Fetch HTML content
        const html = await fetch(url);

        // Check if HTML was fetched successfully
        if (!html) {
            console.error(`Failed to fetch HTML from ${url}`);
            return; // Skip to the next iteration
        }

        // Save HTML content to file
        await saveToFile(url, html);

        // Print metadata if requested
        if (isMetadataRequested) {
            const metadata = getMetadata(html);

            // Guard condition: Check if metadata is available
            if (metadata) {
                printMetadata(metadata, url);
            } else {
                console.error(`Failed to retrieve metadata from ${url}`);
            }
        }
    }));
}

// the main function
main();
