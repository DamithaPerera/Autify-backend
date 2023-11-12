const {promises: fsPromises} = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const {DateTime} = require('luxon');
const path = require('path');
const urlModule = require('url');

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
 * @returns {Promise<string|null>}
 */
async function saveToFile(url, content) {
    try {
        // Create a folder for each site to store assets
        const siteFolder = path.join(__dirname, `${url.replace(/https?:\/\//, '')}`);
        await fsPromises.mkdir(siteFolder, {recursive: true});

        // generate file name for the HTML file
        const fileName = path.join(siteFolder, 'index.html');
        // write HTML content to file
        await fsPromises.writeFile(fileName, content);

        // Parse the HTML content using Cheerio
        const $ = cheerio.load(content);

        // Download and save linked assets (stylesheets, images, scripts, etc.)
        const assetPromises = [];

        $('link[rel="stylesheet"], script, img').each((index, element) => {
            const assetUrl = $(element).attr('href') || $(element).attr('src');
            if (assetUrl) {
                const absoluteAssetUrl = urlModule.resolve(url, assetUrl);
                const assetFileName = path.join(siteFolder, path.basename(absoluteAssetUrl));
                assetPromises.push(
                    axios.get(absoluteAssetUrl, {responseType: 'arraybuffer'})
                        .then((response) => fsPromises.writeFile(assetFileName, response.data))
                        .catch((error) => {
                            console.error(`Error saving asset ${assetUrl}: ${error.message}`);
                            return null; // Reject the promise with null in case of an error
                        })
                );
            }
        });

        await Promise.all(assetPromises);

        // success message log
        console.log(`Saved ${url} to ${fileName} with assets`);
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
async function main(urls) {
    // Check if at least one URL is provided
    if (urls.length === 0) {
        console.error('Please provide at least one URL');
        process.exit(1);
    }
    // Check if metadata flag is present
    const metadataFlagIndex = urls.indexOf('--metadata');
    const isMetadataRequested = metadataFlagIndex !== -1;

    // Fetch content for each URL concurrently
    await Promise.all(urls.map(async (url) => {
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

// If the script is run from the command line, call main with command line arguments
if (require.main === module) {
    const args = process.argv.slice(2);
    main(args);
}

module.exports = {
    fetch,
    saveToFile,
    getMetadata,
    printMetadata,
    main,
};

