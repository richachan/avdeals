import { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';

setInterval(() => 
  {
      console.log('Clearing the cache...');
      cache.clear();
  }
  , 3600000);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query } = req.query;

  if (typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ error: 'Invalid query' });
  }

  const maxListings = 20;
  const searchUrl = `https://www.reddit.com/r/AVexchange/search/?q=${encodeURIComponent(query)}&sort=new&type=link`;
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="post-container"]'); // Ensure content loads

    const listings = await page.evaluate((maxListings) => {
      const results = [];
      let count = 0;

      document.querySelectorAll('[data-testid="post-container"]').forEach((post) => {
        if (count >= maxListings) return;

        const titleElement = post.querySelector('h3');
        const linkElement = post.querySelector('a[data-click-id="body"]');

        const title = titleElement ? titleElement.textContent.trim() : '';
        const link = linkElement ? `https://www.reddit.com${linkElement.getAttribute('href')}` : '';

        if (title.toUpperCase().includes('[WTS]') && link) {
          results.push({ title, link });
          count++;
        }
      });

      return results;
    }, maxListings);

    await browser.close();
    res.status(200).json(listings);
  } catch (error) {
    console.error('Scraping error:', error);
    await browser.close();
    res.status(500).json({ error: 'Failed to retrieve listings' });
  }
}
