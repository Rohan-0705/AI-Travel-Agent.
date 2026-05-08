import {
  CalendarClock,
  CloudSun,
  Compass,
  ExternalLink,
  MapPinned,
  Navigation,
  ShieldCheck,
  Star,
  WalletCards,
} from "lucide-react";

const toneStyles = {
  teal: "bg-[#e8f8f5] text-[#0f8f83]",
  amber: "bg-[#fff4da] text-[#9a6100]",
  coral: "bg-[#fff0ed] text-[#c2410c]",
};

const MapPanel = ({
  activeTrip,
  livePlan,
  hasActiveConversation = true,
  drawer = false,
}) => {
  if (!hasActiveConversation) {
    return <EmptyMapPanel drawer={drawer} />;
  }

  const destination = livePlan?.destination ?? activeTrip.destination;
  const summary = livePlan?.summary ?? activeTrip.summary;
  const foodItems = livePlan?.foodGuide?.mustTry ?? [];
  const directItems = livePlan?.travelAnswer?.items?.map((item) => item.label) ?? [];
  const route = livePlan?.intent === "food_info" && foodItems.length
    ? foodItems.slice(0, 5)
    : livePlan?.intent && livePlan.intent !== "trip_plan" && directItems.length
    ? directItems.slice(0, 5)
    : livePlan?.places?.length
    ? livePlan.places.slice(0, 5).map((place) => place.name)
    : activeTrip.route;
  const stays = livePlan?.places?.length
    ? livePlan.places.slice(0, 2).map((place) => ({
        name: place.name,
        fit: place.type ?? "Point of interest",
        price: place.rating ? `${place.rating}/5` : "Save",
      }))
    : activeTrip.stays;
  const weatherValue = livePlan?.weather?.samples?.[0]?.tempC
    ? `${livePlan.weather.samples[0].tempC} C`
    : activeTrip.signals[0].value;
  const budgetValue = livePlan?.intent && livePlan.intent !== "trip_plan"
    ? livePlan.travelAnswer?.label ?? (livePlan.intent === "food_info" ? "Food guide" : "Answer")
    : livePlan?.cost?.formattedTotal ?? activeTrip.budget;
  const query = route.length ? `${destination} ${route.slice(0, 2).join(" ")}` : activeTrip.mapQuery;
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;

  return (
    <aside
      className={[
        "planner-scrollbar flex min-h-0 flex-col overflow-y-auto border border-slate-900/10 bg-white shadow-sm",
        drawer
          ? "h-full max-h-none rounded-none"
          : "max-h-[90vh] rounded-xl lg:h-[calc(100vh-2rem)] lg:max-h-none",
      ].join(" ")}
    >
      <div className="border-b border-slate-200 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-[#60746f]">
              Map view
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              {livePlan ? `${destination} live plan` : activeTrip.name}
            </h2>
            <p className="mt-1.5 text-[0.92rem] leading-6 text-slate-600">
              {summary}
            </p>
          </div>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-950 text-white">
            <MapPinned size={18} />
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <div className="h-56 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:h-64 2xl:h-72">
          <iframe
            title={`${activeTrip.destination} map`}
            width="100%"
            height="100%"
            src={mapSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="block border-0"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-slate-200 bg-[#f7faf8] p-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <CloudSun size={15} className="text-[#0f8f83]" />
              <span>Weather</span>
            </div>
            <p className="mt-1.5 text-base font-semibold text-slate-950">
              {weatherValue}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-[#fff9ed] p-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <WalletCards size={15} className="text-[#9a6100]" />
              <span>Budget</span>
            </div>
            <p className="mt-1.5 text-base font-semibold text-slate-950">
              {budgetValue}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-[#fff6f3] p-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <CalendarClock size={15} className="text-[#c2410c]" />
              <span>Pace</span>
            </div>
            <p className="mt-1.5 text-base font-semibold text-slate-950">
              {activeTrip.pace}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-[#eef4ff] p-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Star size={15} className="text-[#2563eb]" />
              <span>Score</span>
            </div>
            <p className="mt-1.5 text-base font-semibold text-slate-950">
              {activeTrip.score}/100
            </p>
          </div>
        </div>
      </div>

      <section className="border-t border-slate-200 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-[#60746f]">
              Route snapshot
            </p>
            <h3 className="mt-1 text-base font-semibold text-slate-950">
              {route.length} key stops
            </h3>
          </div>
          <Navigation size={17} className="text-[#0f8f83]" />
        </div>

        <ol className="mt-3 space-y-2">
          {route.map((stop, index) => (
            <li key={stop} className="flex items-start gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-950 text-xs font-semibold text-white">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 text-[0.92rem] font-medium leading-6 text-slate-700">
                {stop}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {livePlan?.booking?.actions?.length ? (
        <section className="border-t border-slate-200 p-3 sm:p-4">
          <h3 className="text-base font-semibold text-slate-950">
            Booking handoff
          </h3>
          <p className="mt-1.5 text-[0.92rem] leading-6 text-slate-600">
            {livePlan.booking.note}
          </p>
          <div className="mt-3 grid gap-2">
            {livePlan.booking.actions.map((action) => (
              <a
                key={action.type}
                href={action.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-[0.96rem] font-semibold text-slate-700 transition hover:border-[#0f8f83] hover:text-[#0f8f83]"
              >
                <span>{action.label}</span>
                <ExternalLink size={15} />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="border-t border-slate-200 p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-[#0f8f83]" />
          <h3 className="text-base font-semibold text-slate-950">Smart checks</h3>
        </div>
        <div className="mt-3 grid gap-2">
          {(livePlan?.intent === "food_info"
            ? [
                { label: "Food profile", value: livePlan.foodGuide?.source?.includes("Curated") ? "Curated" : "Guide", tone: "teal" },
                { label: "Must try", value: `${livePlan.foodGuide?.mustTry?.length ?? 0} items`, tone: "amber" },
                { label: "Budget", value: "Local estimate", tone: "coral" },
              ]
            : livePlan?.intent && livePlan.intent !== "trip_plan"
            ? [
                { label: "Answer type", value: livePlan.travelAnswer?.label ?? "Travel", tone: "teal" },
                { label: "Details", value: `${livePlan.travelAnswer?.items?.length ?? livePlan.travelAnswer?.bullets?.length ?? 0} items`, tone: "amber" },
                { label: "Mode", value: "Direct", tone: "coral" },
              ]
            : livePlan
            ? [
                { label: "Weather", value: livePlan.weather?.source?.includes("Mock") ? "Demo" : "Live", tone: "teal" },
                { label: "Places", value: livePlan.places?.length ? `${livePlan.places.length} found` : "Demo", tone: "amber" },
                { label: "Flights", value: livePlan.flights?.offers?.length ? `${livePlan.flights.offers.length} offers` : "Optional", tone: "coral" },
              ]
            : activeTrip.signals
          ).map((signal) => (
            <div
              key={signal.label}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-2.5"
            >
              <span className="text-[0.96rem] font-medium text-slate-600">
                {signal.label}
              </span>
              <span
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  toneStyles[signal.tone]
                }`}
              >
                {signal.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 p-3 sm:p-4">
        <h3 className="text-base font-semibold text-slate-950">Stay shortlist</h3>
        <div className="mt-3 space-y-2">
          {stays.map((stay) => (
            <div
              key={stay.name}
              className="rounded-lg border border-slate-200 bg-[#fbfdfb] p-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[0.96rem] font-semibold text-slate-950">
                    {stay.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{stay.fit}</p>
                </div>
                <p className="shrink-0 text-[0.96rem] font-semibold text-[#0f8f83]">
                  {stay.price}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
};

const EmptyMapPanel = ({ drawer = false }) => {
  return (
    <aside
      className={[
        "flex min-h-0 flex-col overflow-hidden border border-slate-900/10 bg-white shadow-sm",
        drawer
          ? "h-full max-h-none rounded-none"
          : "max-h-[90vh] rounded-xl lg:h-[calc(100vh-2rem)] lg:max-h-none",
      ].join(" ")}
    >
      <div className="shrink-0 border-b border-slate-200 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-[#60746f]">
              Trip preview
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              Ready when you are
            </h2>
            <p className="mt-1.5 text-[0.92rem] leading-6 text-slate-600">
              Your map, route, cost, weather, and place shortlist will appear
              here after the first travel request.
            </p>
          </div>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-950 text-white">
            <MapPinned size={18} />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-3 sm:p-4">
        <div className="grid min-h-[12rem] place-items-center rounded-lg border border-dashed border-slate-300 bg-[#f7faf8] p-3 text-center sm:min-h-[13rem]">
          <div>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white text-[#0f8f83] shadow-sm">
              <Compass size={23} />
            </div>
            <h3 className="mt-3 text-base font-semibold text-slate-950">
              No destination selected yet
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-[0.95rem] leading-6 text-slate-600">
              Try "Plan Goa for 3 days" or "Mumbai food guide" to build a live
              travel workspace.
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { label: "Map", value: "Waiting", icon: MapPinned },
            { label: "Route", value: "After search", icon: Navigation },
            { label: "Budget", value: "After search", icon: WalletCards },
            { label: "Checks", value: "After search", icon: ShieldCheck },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2.5"
            >
              <span className="flex min-w-0 items-center gap-2 text-[0.92rem] font-medium text-slate-600">
                <Icon size={15} className="text-[#0f8f83]" />
                {label}
              </span>
              <span className="shrink-0 rounded-md bg-[#f7faf8] px-2 py-1 text-[0.7rem] font-semibold text-slate-500">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default MapPanel;
