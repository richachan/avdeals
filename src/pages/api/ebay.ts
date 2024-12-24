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


    // Ensure the query is valid
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

        

        await page.waitForSelector('.srp-results.srp-list.clearfix'); // Ensure the listings are loaded

        const elementExists = await page.$$('.s-item__info.clearfix'); 
        if (elementExists.length === 0) {
            console.log('No elements found with the selector ".s-item__info.clearfix');
            await browser.close();
            return res.status(200).json([]); 
        }

        // Grab all listing links and prices on the search results page
        const listingsFromSearch = await page.evaluate(() =>
        {
            const listings: { title: string; link: string; price: string | null | undefined; site: string }[] = [];
            const items = document.querySelectorAll('.s-item__info.clearfix');


            items.forEach(item =>
            {
                const titleElement = item.querySelector('.s-item__title');
                const priceElement = item.querySelector('div.s-item__detail span[class="s-item__price"] ');
                const linkElement = item.querySelector('.s-item__link');

                const title = titleElement ? titleElement.textContent?.trim() : '';
                const link = linkElement ? linkElement.getAttribute('href') : '';
                const price = priceElement ? priceElement.textContent?.trim() : null;
                const site = 'ebay';


                if (title) {
                    const normalizedTitle = title.toUpperCase();
                    //For whatever reason the first 2 grabbed listings are SHOP ON EBAY and they are always $20.00. Nothing to do with the search query.
                    if (!normalizedTitle.includes('SHOP ON EBAY') && !price?.includes('to')) 
                    {
                        listings.push({ title, link, price, site });
                    }
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
