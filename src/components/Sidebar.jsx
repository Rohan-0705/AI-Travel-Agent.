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
        "flex min-h-0 flex-col overflow-hidden border border-slate-900/10 bg-[#101820] text-white shadow-sm",
        drawer
          ? "h-full max-h-none rounded-none"
          : "max-h-[48vh] rounded-none sm:rounded-xl lg:h-[calc(100vh-1.5rem)] lg:max-h-none",
      ].join(" ")}
    >
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#38d6c6] text-slate-950">
            <Compass size={22} strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <p className="text-[0.92rem] font-semibold uppercase text-[#92a5a0]">
              Travel AI
            </p>
            <h1 className="truncate text-xl font-semibold">Travel Planner</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={onNewChat}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white text-base font-semibold text-slate-950 transition hover:bg-[#38d6c6] focus:outline-none focus:ring-2 focus:ring-[#38d6c6] focus:ring-offset-2 focus:ring-offset-[#101820]"
        >
          <Plus size={18} />
          <span>New chat</span>
        </button>
      </div>

      <nav className="planner-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        <section>
          <div className="mb-3 flex items-center gap-2 text-[0.92rem] font-semibold uppercase text-[#92a5a0]">
            <Star size={15} className="text-[#38d6c6]" />
            <span>Saved chats</span>
          </div>

          <div className="space-y-2">
            {savedTrips.length ? (
              savedTrips.slice(0, 12).map((trip) => (
                <div
                  key={trip.id}
                  className="group flex w-full items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-2 transition hover:border-[#38d6c6] hover:bg-white/10"
                >
                  <button
                    type="button"
                    onClick={() => onSelectSavedTrip?.(trip)}
                    className="min-w-0 flex-1 rounded-md p-1 text-left focus:outline-none focus:ring-2 focus:ring-[#38d6c6]"
                  >
                    <span className="line-clamp-2 text-base font-semibold text-white">
                      {trip.title}
                    </span>
                    <span className="mt-1 block text-[0.95rem] text-[#aebfba]">
                      {trip.destination || `${trip.days} days`} - saved
                    </span>
                  </button>
                  <button
                    type="button"
                    title="Delete saved chat"
                    aria-label={`Delete ${trip.title}`}
                    onClick={() => onDeleteSavedTrip?.(trip)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[#aebfba] opacity-100 transition hover:bg-red-500/15 hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-300 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-[0.95rem] leading-7 text-[#7f918c]">
                Saved chats appear here after you press Save trip.
              </p>
            )}
          </div>
        </section>

        <section className="mt-6 border-t border-white/10 pt-5">
          <div className="mb-3 flex items-center gap-2 text-[0.92rem] font-semibold uppercase text-[#92a5a0]">
            <History size={15} className="text-[#38d6c6]" />
            <span>Search history</span>
          </div>

          <div className="space-y-2">
            {searchHistory.length ? (
              searchHistory.slice(0, 16).map((item) => (
                <div
                  key={item.id}
                  className="group flex w-full items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-2 transition hover:border-[#38d6c6] hover:bg-white/10"
                >
                  <button
                    type="button"
                    onClick={() => onSelectHistory?.(item)}
                    className="min-w-0 flex-1 rounded-md p-1 text-left focus:outline-none focus:ring-2 focus:ring-[#38d6c6]"
                  >
                    <span className="line-clamp-2 text-base font-medium text-white">
                      {item.message}
                    </span>
                    <span className="mt-1 block text-[0.95rem] text-[#aebfba]">
                      {item.destination || "Travel search"}
                    </span>
                  </button>
                  <button
                    type="button"
                    title="Delete search"
                    aria-label={`Delete ${item.message}`}
                    onClick={() => onDeleteHistory?.(item)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[#aebfba] opacity-100 transition hover:bg-red-500/15 hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-300 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-[0.95rem] leading-7 text-[#7f918c]">
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
