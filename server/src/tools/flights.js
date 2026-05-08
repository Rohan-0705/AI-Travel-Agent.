export async function searchFlights({
  origin,
  destination,
  departureDate,
  returnDate,
  travelers = 1,
}) {
  if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
    return mockFlights({ origin, destination, departureDate, returnDate, travelers });
  }

  if (!origin || !destination || !departureDate) {
    return {
      source: "Amadeus Self-Service",
      message: "Origin, destination, and YYYY-MM-DD departureDate are required for live flight search.",
      offers: [],
    };
  }

  const token = await getAmadeusToken();
  const url = new URL("https://test.api.amadeus.com/v2/shopping/flight-offers");
  url.searchParams.set("originLocationCode", origin);
  url.searchParams.set("destinationLocationCode", destination);
  url.searchParams.set("departureDate", departureDate);
  url.searchParams.set("adults", String(travelers));
  url.searchParams.set("max", "5");

  if (returnDate) {
    url.searchParams.set("returnDate", returnDate);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Amadeus flight request failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    source: "Amadeus Flight Offers Search",
    origin,
    destination,
    departureDate,
    returnDate,
    offers: (data.data ?? []).slice(0, 5).map((offer) => ({
      price: `${offer.price?.currency ?? ""} ${offer.price?.grandTotal ?? ""}`.trim(),
      itineraries: offer.itineraries?.map((itinerary) => ({
        duration: itinerary.duration,
        segments: itinerary.segments?.map((segment) => ({
          carrier: segment.carrierCode,
          flight: segment.number,
          from: segment.departure?.iataCode,
          to: segment.arrival?.iataCode,
          departure: segment.departure?.at,
          arrival: segment.arrival?.at,
        })),
      })),
    })),
  };
}

async function getAmadeusToken() {
  const response = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.AMADEUS_CLIENT_ID,
      client_secret: process.env.AMADEUS_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error(`Amadeus auth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

function mockFlights({ origin, destination, departureDate, returnDate, travelers }) {
  return {
    source: "Mock flight fallback",
    origin,
    destination,
    departureDate,
    returnDate,
    travelers,
    message: "Add AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET for live flight offers.",
    offers: [
      {
        price: "INR 12,400",
        itineraries: [
          {
            duration: "PT2H35M",
            segments: [
              {
                carrier: "6E",
                flight: "demo",
                from: origin || "DEL",
                to: destination || "GOI",
                departure: departureDate || "demo date",
                arrival: "same day",
              },
            ],
          },
        ],
      },
    ],
  };
}
