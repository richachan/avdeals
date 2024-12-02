import Image from "next/image";
import {useEffect, useState} from "react";

type Listing = {
  id: number;
  name: string;
  price: number;
  site: string;
}

  
export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  //gets the listings from the api and sorts them by price
  useEffect(() => {
    fetch('/api/listings')
      .then(response => response.json())
      .then(data => {
        const ascending = data.sort((a: Listing, b: Listing) => a.price - b.price)
        setListings(ascending); //ascending contains the listings sorted by ascending
      })
  }, []); //empty array means this effect will only run once
        

  //A derived list that filters listings based on searchQuery
  const filtered = listings.filter((x) => x.name.toLowerCase()
    .includes(searchQuery.toLowerCase()));

  return (
    <div>
      <h1>Used Audio Deal Finder</h1>
      <p>
        Made by Richtard
      </p>

      <div style = {{textAlign: 'center'}}>
        <h2>Search for any headphone or IEM!</h2>
        <input
          type="text"
          placeholder={"Search"}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          />
      <section>
        <h2>Results</h2>
        <ul style={{ listStyleType: 'none' }}>
          {filtered.map((x) => //x is the current listing in the list
            <li key={x.id}>
              {x.name} - ${x.price} 
            </li>
          )}
        </ul>
      </section>
      </div>
    </div>
  );
}
