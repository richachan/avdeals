import { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';

//Cache to store and return the same results for the same query
const cache = new Map;

//clear cache every hour
setInterval(() => {
    console.log('Clearing the cache...');
    cache.clear();
}, 3600000);

//Handler that scrapes HeadFi listings with multitab processing
export default async function handler(req: NextApiRequest, res: NextApiResponse) 
{
    const { query } = req.query;

    //Ensure the query is valid
    if (typeof query !== 'string' || query.trim() === '') 
    {
        return res.status(400).json({ error: 'Invalid query' });
    }

    if (cache.has(query)) 
    {
        console.log(`Query match in cache!: ${query}`);
        return res.status(200).json(cache.get(query)); // Return cached result
    }

    const searchUrl = `https://www.head-fi.org/search/39110786/?q=${encodeURIComponent(query)}&t=hfc_listing&c[categories][0]=1&c[child_categories]=1&o=date`;
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try 
    {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

        await page.waitForSelector('.block-row'); //Ensure the listings are loaded

        //no results
        const elementExists = await page.$$('.block-row'); 
        if (elementExists.length === 0) {
            console.log('No elements found with the selector ".block-row".');
            await browser.close();
            return res.status(200).json([]); 
        }

        //Grab all listing links and prices on the search results page
        const listingsFromSearch = await page.evaluate(() =>
             {
            const listings = [];
            const items = document.querySelectorAll('.block-row');

            items.forEach(item => {
                const titleElement = item.querySelector('.contentRow-title a');
                const priceElement = item.querySelector('.contentRow-extra dd');

                const flairElement = item.querySelector('span.label.label--primary');

                const title = titleElement ? titleElement.textContent?.trim() : '';
                const link = titleElement ? `https://www.head-fi.org${titleElement.getAttribute('href')}` : '';
                const price = priceElement ? priceElement.textContent?.trim() : null;
                const flair = flairElement ? flairElement.textContent?.trim() : null;
                const site = 'headfi';

                if (title && link  && !flair?.toUpperCase().includes('TRADE') && !flair?.toUpperCase().includes('WANT TO BUY')) 
                {
                    listings.push({ title, link, price, site });
                }
            });

            return listings;
        });

        //opens each listing page and checks if the listing is still available as that information is not available on the search results page
        const processListing = async (listing: { title: string; link: string; price: string; site: string}) => {
            try {
                const { link, title, price, site} = listing;

                //Open the listing page and check if the title includes "SOLD" and other keywords
                const listingPage = await browser.newPage();
                await listingPage.goto(link, { waitUntil: 'domcontentloaded' });

                const listingTitle = await listingPage.evaluate(() => 
                {
                    const titleElement = document.querySelector('.p-title-value');
                    return titleElement ? titleElement.textContent?.trim() : null;
                });

                await listingPage.close();

                if (listingTitle) {
                    const title = listingTitle.toUpperCase(); //normalize titles for comparison
                    if (
                        !title.includes('SOLD') &&
                        !title.includes('PURCHASED') &&
                        !title.includes('CLOSED') &&
                        !title.includes('TRADED') &&
                        title.includes(query.toUpperCase()) &&
                        !price.startsWith('0.00') //WTB or WTT listings have a price of 0.00 and can easily be filtered out with this check
                    ) {
                        return { title, link, price, site};
                    }
                }
                return null; //Return null for invalid listings

            } catch (error) {
                console.error(`Error processing listing ${listing.link}:`, error);
                return null;
            }
        };

        //Process all listings concurrently with a limited number of tabs
        const maxConcurrency = 10; // Number of concurrent tabs Next Step: rotating proxies or plugin to avoid detection
        const results = []; 
        for (let i = 0; i < listingsFromSearch.length; i += maxConcurrency) {
            const chunk = listingsFromSearch.slice(i, i + maxConcurrency);
            const chunkResults = await Promise.all(chunk.map(listing => processListing(listing)));
            results.push(...chunkResults.filter(Boolean)); // Filter out null results
        }
        await browser.close(); 

        //Cache the results for the query
        cache.set(query, results);
        
        res.status(200).json(results);
    } catch (error) {
        console.error('Scraping error:', error);
        await browser.close();
        res.status(500).json({ error: 'Failed to retrieve listings' });
    }
    
}
