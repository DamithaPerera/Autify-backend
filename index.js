const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const { DateTime } = require('luxon');
const path = require('path');

async function fetch(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(`Error fetching ${url}: ${error.message}`);
        return null;
    }
}

async function saveToFile(url, content) {
    try {
        const fileName = path.join(__dirname, `${url.replace(/https?:\/\//, '')}.html`);
        await fs.promises.writeFile(fileName, content);
        console.log(`Saved ${url} to ${fileName}`);
        return fileName;
    } catch (error) {
        console.error(`Error saving ${url} to file: ${error.message}`);
        return null;
    }
}

function getMetadata(html) {
    const $ = cheerio.load(html);
    const numLinks = $('a').length;
    const numImages = $('img').length;
    const lastFetch = DateTime.utc().toUTC().toString();

    return { numLinks, numImages, lastFetch };
}

function printMetadata(metadata, url) {
    console.log(`site: ${url}`);
    console.log(`num_links: ${metadata.numLinks}`);
    console.log(`images: ${metadata.numImages}`);
    console.log(`last_fetch: ${metadata.lastFetch}`);
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('Please provide at least one URL');
        process.exit(1);
    }

    const metadataFlagIndex = args.indexOf('--metadata');
    const isMetadataRequested = metadataFlagIndex !== -1;

    await Promise.all(args.map(async (url) => {
        const html = await fetch(url);

        if (html) {
            await saveToFile(url, html);

            if (isMetadataRequested) {
                const metadata = getMetadata(html);
                printMetadata(metadata, url);
            }
        }
    }));
}

main();
