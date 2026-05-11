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
  const summary = livePlan?.destinationBrief ?? livePlan?.summary ?? activeTrip.summary;
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
  const weatherValue =
    formatWeatherRange(livePlan?.weather) ??
    (livePlan ? "Checked" : activeTrip.signals[0].value);
  const budgetValue =
    getPreviewBudgetValue(livePlan) ??
    (livePlan ? "Estimate ready" : activeTrip.budget);
  const query = route.length ? `${destination} ${route.slice(0, 2).join(" ")}` : activeTrip.mapQuery;
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  const statCards = [
    { label: "Weather", value: weatherValue, icon: CloudSun, tone: "text-[#0f8f83]", surface: "bg-[#f2fbf8]" },
    { label: "Budget", value: budgetValue, icon: WalletCards, tone: "text-[#9a6100]", surface: "bg-[#fffaf0]" },
    { label: "Pace", value: getPreviewPaceValue(livePlan, activeTrip), icon: CalendarClock, tone: "text-[#c2410c]", surface: "bg-[#fff7f4]" },
    { label: "Score", value: `${activeTrip.score}/100`, icon: Star, tone: "text-[#2563eb]", surface: "bg-[#f2f6ff]" },
  ];
  const checkSignals = livePlan?.intent === "food_info"
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
    : activeTrip.signals;

  return (
    <aside
      className={[
        "flex min-h-0 flex-col overflow-hidden border border-slate-200 bg-[#f8faf9] shadow-sm",
        drawer
          ? "h-full max-h-none rounded-none"
          : "max-h-[90vh] rounded-xl lg:h-full lg:max-h-none",
      ].join(" ")}
    >
      <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#38d6c6] text-slate-950">
                <MapPinned size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-[#60746f]">
                  Travel AI preview
                </p>
                <h2 className="mt-0.5 truncate text-[1.04rem] font-semibold text-slate-950">
                  {livePlan ? `${destination} live plan` : activeTrip.name}
                </h2>
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-[0.82rem] leading-5 text-slate-600">
              {summary}
            </p>
          </div>
          <div className="rounded-md bg-[#e8f8f5] px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-[#0f8f83]">
            Live
          </div>
        </div>
      </div>

      <div className="planner-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="h-52 bg-slate-100 sm:h-56 2xl:h-60">
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
        </section>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {statCards.map(({ label, value, icon: Icon, tone, surface }) => (
            <div
              key={label}
              className={`rounded-lg border border-slate-200 ${surface} p-2.5`}
            >
              <div className="flex items-center gap-1.5 text-[0.72rem] font-semibold uppercase tracking-wide text-slate-500">
                <Icon size={14} className={tone} />
                <span>{label}</span>
              </div>
              <p className="mt-1.5 truncate text-[0.98rem] font-semibold text-slate-950">
                {value}
              </p>
            </div>
          ))}
        </div>

        <section className="mt-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-[#60746f]">
                Route snapshot
              </p>
              <h3 className="mt-0.5 text-[0.98rem] font-semibold text-slate-950">
                {route.length} key stops
              </h3>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#e8f8f5] text-[#0f8f83]">
              <Navigation size={16} />
            </div>
          </div>

          <ol className="mt-3 space-y-1.5">
            {route.map((stop, index) => (
              <li key={stop} className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2">
                {index < route.length - 1 ? (
                  <span className="absolute left-[0.84rem] top-7 h-full w-px bg-slate-200" />
                ) : null}
                <span className="relative z-10 grid h-7 w-7 place-items-center rounded-md bg-slate-950 text-[0.74rem] font-semibold text-white">
                  {index + 1}
                </span>
                <span className="min-w-0 rounded-md px-1 py-1 text-[0.9rem] font-medium leading-5 text-slate-700">
                  {stop}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {livePlan?.booking?.actions?.length ? (
          <section className="mt-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <h3 className="text-[0.98rem] font-semibold text-slate-950">
              Booking handoff
            </h3>
            <p className="mt-1.5 text-[0.86rem] leading-5 text-slate-600">
              {livePlan.booking.note}
            </p>
            <div className="mt-3 grid gap-2">
              {livePlan.booking.actions.map((action) => (
                <a
                  key={action.type}
                  href={action.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[0.9rem] font-medium text-slate-700 transition hover:border-[#0f8f83] hover:text-[#0f8f83]"
                >
                  <span>{action.label}</span>
                  <ExternalLink size={14} />
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#0f8f83]" />
            <h3 className="text-[0.98rem] font-semibold text-slate-950">Smart checks</h3>
          </div>
          <div className="mt-3 grid gap-2">
            {checkSignals.map((signal) => (
              <div
                key={signal.label}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-[#fbfdfb] px-2.5 py-2"
              >
                <span className="text-[0.86rem] font-medium text-slate-600">
                  {signal.label}
                </span>
                <span
                  className={`rounded-md px-2 py-1 text-[0.72rem] font-semibold ${
                    toneStyles[signal.tone]
                  }`}
                >
                  {signal.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <h3 className="text-[0.98rem] font-semibold text-slate-950">Stay shortlist</h3>
          <div className="mt-3 space-y-2">
            {stays.map((stay) => (
              <div
                key={stay.name}
                className="rounded-md border border-slate-200 bg-[#fbfdfb] px-2.5 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[0.9rem] font-semibold text-slate-950">
                      {stay.name}
                    </p>
                    <p className="mt-0.5 text-[0.76rem] text-slate-500">{stay.fit}</p>
                  </div>
                  <p className="shrink-0 text-[0.86rem] font-semibold text-[#0f8f83]">
                    {stay.price}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
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
          : "max-h-[90vh] rounded-xl lg:h-auto lg:max-h-none lg:self-start",
      ].join(" ")}
    >
      <div className="shrink-0 border-b border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#38d6c6] text-slate-950">
                <MapPinned size={16} />
              </span>
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-[#60746f]">
                  Travel AI preview
                </p>
                <h2 className="mt-0.5 text-[1.04rem] font-semibold text-slate-950">
                  Ready when you are
                </h2>
              </div>
            </div>
            <p className="mt-2 text-[0.82rem] leading-5 text-slate-600">
              Your map, route, cost, weather, and place shortlist will appear
              here after the first travel request.
            </p>
          </div>
          <div className="rounded-md bg-[#f7faf8] px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
            Idle
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

function formatWeatherRange(weather) {
  const temps = (weather?.samples ?? [])
    .map((sample) => Number(sample.tempC))
    .filter(Number.isFinite);

  if (!temps.length) {
    return null;
  }

  const min = Math.min(...temps);
  const max = Math.max(...temps);

  return min === max ? `${min} C` : `${min}-${max} C`;
}

function getPreviewBudgetValue(livePlan) {
  if (!livePlan) {
    return null;
  }

  if (livePlan.intent === "food_info") {
    return "Food guide";
  }

  if (livePlan.intent && livePlan.intent !== "trip_plan") {
    return livePlan.travelAnswer?.label ?? "Answer";
  }

  return livePlan.cost?.formattedTotal ?? null;
}

function getPreviewPaceValue(livePlan, activeTrip) {
  if (!livePlan || livePlan.intent !== "trip_plan") {
    return activeTrip.pace;
  }

  const days = livePlan.days?.length ?? 0;
  const stops = livePlan.days
    ?.reduce((count, day) => count + (day.places?.length ?? 0), 0) ?? 0;
  const averageStops = days ? stops / days : 0;

  if (averageStops >= 3) {
    return "Full";
  }

  if (averageStops <= 2) {
    return "Easy";
  }

  return "Balanced";
}

export default MapPanel;
