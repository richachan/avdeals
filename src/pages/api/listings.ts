import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  //Mock data for headphone listings
  const allListings = [
    { id: 1, name: "Sennheiser HD600", price: 299 },
    { id: 2, name: "Audio-Technica ATH-M50x", price: 149 },
    { id: 3, name: "Grado SR80e", price: 99 },
    { id: 4, name: "Bose QuietComfort 35 II", price: 249 },
    { id: 5, name: "Sony WH-1000XM4", price: 349 },
    { id: 6, name: "Sennheiser HD650", price: 399 },
  ];

  res.status(200).json(allListings);
}
