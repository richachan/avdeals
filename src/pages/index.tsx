import { useState } from 'react';
//:3
type Listing = {
  title: string;
  link: string;
  price: string;
  site: string;
};

export default function Home() {
  const [query, setQuery] = useState<string>('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const scraperEndpoints = ['/api/headfi', '/api/ebay', '/api/mart'];

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a valid query.');
      return;
    }

    setLoading(true);
    setError('');
    setListings([]);

    try {
      const scraperPromises = scraperEndpoints.map((endpoint) =>
        fetch(`${endpoint}?query=${encodeURIComponent(query)}`)
          .then(async (response) => {
            if (!response.ok) {
              throw new Error(`Error from ${endpoint}`);
            }
            return response.json();
          })
          .catch(() => [])
      );

      const scraperResults = await Promise.all(scraperPromises);
      const combinedListings = scraperResults.flat();

      const sortedListings = combinedListings.sort((a, b) => {
        const priceA = parseFloat(a.price?.replace(/[^0-9.]/g, '') || '0');
        const priceB = parseFloat(b.price?.replace(/[^0-9.]/g, '') || '0');
        return priceA - priceB;
      });

      setListings(sortedListings);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching listings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Title */}
        <h1 className="text-2xl font-bold mb-6 text-center">Deal Finder</h1>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex items-center mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-grow p-2 border border-gray-300 rounded-l-md focus:outline-none"
            placeholder="Search for deals..."
          />
          <button
            onClick={handleSearch}
            className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Error Message */}
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {/* Listings Container */}
        <div className="bg-white shadow-md rounded-lg p-4 max-h-[500px] overflow-y-auto">
          {listings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing, index) => (
                <div
                  key={index}
                  className="bg-gray-200 border border-gray-300 shadow-sm p-4 rounded-md hover:shadow-md transition"
                >
                  <h2 className="text-lg font-bold mb-2">{listing.title}</h2>
                  <p className="text-gray-700 mb-4">
                    {listing.price || 'No price listed'}
                  </p>
                  <a
                    href={listing.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    View Listing
                  </a>
                </div>
              ))}
            </div>
          ) : (
            !loading &&
            !error && (
              <p className="text-center text-gray-500">
                No listings found. Try a different query.
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
