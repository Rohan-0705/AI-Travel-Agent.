import { Compass, History, Plus, Star, Trash2 } from "lucide-react";

const Sidebar = ({
  savedTrips = [],
  searchHistory = [],
  drawer = false,
  onNewChat,
  onDeleteSavedTrip,
  onDeleteHistory,
  onSelectSavedTrip,
  onSelectHistory,
}) => {
  return (
    <aside
      className={[
        "flex min-h-0 flex-col overflow-hidden border border-slate-900/10 bg-[#0f171d] text-white shadow-sm",
        drawer
          ? "h-full max-h-none rounded-none"
          : "max-h-[48vh] rounded-none sm:rounded-xl lg:h-full lg:max-h-none",
      ].join(" ")}
    >
      <div className="border-b border-white/10 p-2.5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#38d6c6] text-slate-950">
            <Compass size={17} strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-[#9fb0ac]">
              Travel AI
            </p>
            <h1 className="truncate text-[0.95rem] font-semibold">Travel Planner</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={onNewChat}
          className="mt-2.5 flex h-9 w-full items-center justify-start gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-[0.9rem] font-medium text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#38d6c6] focus:ring-offset-2 focus:ring-offset-[#0f171d]"
        >
          <Plus size={16} />
          <span>New chat</span>
        </button>
      </div>

      <nav className="planner-scrollbar min-h-0 flex-1 overflow-y-auto p-2.5">
        <section>
          <div className="mb-1.5 flex items-center gap-2 px-1 text-[0.72rem] font-semibold uppercase tracking-wide text-[#9fb0ac]">
            <Star size={13} className="text-[#38d6c6]" />
            <span>Saved chats</span>
          </div>

          <div className="space-y-1">
            {savedTrips.length ? (
              savedTrips.slice(0, 12).map((trip) => (
                <div
                  key={trip.id}
                  className="group flex w-full items-start gap-1.5 rounded-md border border-transparent p-1.5 transition hover:border-white/10 hover:bg-white/7"
                >
                  <button
                    type="button"
                    onClick={() => onSelectSavedTrip?.(trip)}
                    className="min-w-0 flex-1 rounded-md px-1 py-0.5 text-left focus:outline-none focus:ring-2 focus:ring-[#38d6c6]"
                  >
                    <span className="line-clamp-2 text-[0.86rem] font-medium leading-5 text-white">
                      {trip.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[0.76rem] text-[#9fb0ac]">
                      {trip.destination || `${trip.days} days`} - saved
                    </span>
                  </button>
                  <button
                    type="button"
                    title="Delete saved chat"
                    aria-label={`Delete ${trip.title}`}
                    onClick={() => onDeleteSavedTrip?.(trip)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#9fb0ac] opacity-100 transition hover:bg-red-500/15 hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-300 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <p className="px-1.5 py-2 text-[0.82rem] leading-5 text-[#7f918c]">
                Saved chats appear here after you press Save trip.
              </p>
            )}
          </div>
        </section>

        <section className="mt-4 border-t border-white/10 pt-3">
          <div className="mb-1.5 flex items-center gap-2 px-1 text-[0.72rem] font-semibold uppercase tracking-wide text-[#9fb0ac]">
            <History size={13} className="text-[#38d6c6]" />
            <span>Search history</span>
          </div>

          <div className="space-y-1">
            {searchHistory.length ? (
              searchHistory.slice(0, 16).map((item) => (
                <div
                  key={item.id}
                  className="group flex w-full items-start gap-1.5 rounded-md border border-transparent p-1.5 transition hover:border-white/10 hover:bg-white/7"
                >
                  <button
                    type="button"
                    onClick={() => onSelectHistory?.(item)}
                    className="min-w-0 flex-1 rounded-md px-1 py-0.5 text-left focus:outline-none focus:ring-2 focus:ring-[#38d6c6]"
                  >
                    <span className="line-clamp-2 text-[0.86rem] font-medium leading-5 text-white">
                      {item.message}
                    </span>
                    <span className="mt-0.5 block truncate text-[0.76rem] text-[#9fb0ac]">
                      {item.destination || "Travel search"}
                    </span>
                  </button>
                  <button
                    type="button"
                    title="Delete search"
                    aria-label={`Delete ${item.message}`}
                    onClick={() => onDeleteHistory?.(item)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#9fb0ac] opacity-100 transition hover:bg-red-500/15 hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-300 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <p className="px-1.5 py-2 text-[0.82rem] leading-5 text-[#7f918c]">
                Your searches will be saved here.
              </p>
            )}
          </div>
        </section>
      </nav>
    </aside>
  );
};

export default Sidebar;
