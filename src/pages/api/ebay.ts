import { NextApiRequest, NextApiResponse } from 'next';
import { list } from 'postcss';
import puppeteer from 'puppeteer';

//Cache to store and return the same results for the same query
const cache = new Map;

//clear cache every hour
setInterval(() => 
{
    console.log('Clearing the cache...');
    cache.clear();
}
, 3600000);

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

    const searchUrl = `https://www.ebay.com/sch/112529/i.html?_from=R40&_nkw=${encodeURIComponent(query)}&_sop=15&LH_BIN=1&_oac=1`;
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try
    {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.block-row'); //Ensure the listings are loaded

        //Grab all listing links and prices on the search results page
        const listingsFromSearch = await page.evaluate(() =>
             {
            const listings = [];
            const items = document.querySelectorAll('.srp-results.srp-list.clearfix');

            items.forEach(item => {
                const titleElement = item.querySelector('div.s-item__title span[role="heading"]');
            

                
                const title = titleElement ? titleElement.textContent?.trim() : '';
       
                if (title) 
                {
                    listings.push({ title });
                }
            });

            return listings;
        });

        cache.set(query, listingsFromSearch);
        
        res.status(200).json(listingsFromSearch);
    } catch (error) {
        console.error('Scraping error:', error);
        await browser.close();
        res.status(500).json({ error: 'Failed to retrieve listings' });
    }
}
