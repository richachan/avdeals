//US Audio Mart
import { NextApiRequest, NextApiResponse } from 'next';
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
        return res.status(200).json(cache.get(query)); //Return cached result
    }

    const searchUrl = `https://www.usaudiomart.com/search.php?show_other_marts=N&show_msrp=N&keywords=${encodeURIComponent(query)}&type=ALL+SALE+ADS&type=ALL+SALE+ADS&cat_id=&price_min=&price_max=&province=&titlesearch=on&zipcode=&radius=100`;
    const browser = await puppeteer.launch({ 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
        ],
    });
    
    const page = await browser.newPage();
    
    //Spoofer
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    //Foo plugins
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3],
        });
    });
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );
    
    try 
    {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
        const html = await page.content();
        console.log(html);

        await page.waitForSelector('table.adverttable tbody tr.ad'); // Ensure the listings are loaded
       
        //Grab all listing links and prices on the search results page
        const listingsFromSearch = await page.evaluate(() =>
             {
            const listings = [];
            const items = document.querySelectorAll('.ad');

            items.forEach(item => {
                const titleElement = item.querySelector('.ad a');
                const priceElement = item.querySelector('.rightCell');

                const title = titleElement ? titleElement.textContent?.trim() : '';
                const link = titleElement ? titleElement.getAttribute('href') : '';
                const price = priceElement ? priceElement.textContent?.trim() : null;
                const site = 'usaudiomart';

                if(title) {
                    const normalizedTitle = title.toUpperCase();
                    if (!normalizedTitle.includes('SOLD')) {
                        listings.push({ title, link, price, site });
                    }
                }
            });
            return listings;
            page.close();
        }); 
        cache.set(query, listingsFromSearch);
        
        res.status(200).json(listingsFromSearch);
    }
    catch (error) {
        console.error('Scraping error:', error);
        await browser.close();
        res.status(500).json({ error: 'Failed to retrieve listings' });
    }
}
