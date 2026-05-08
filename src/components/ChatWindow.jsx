import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Compass,
  Download,
  MapPin,
  PanelLeft,
  Route,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Utensils,
  WalletCards,
} from "lucide-react";
import MessageBubble from "./MessageBubble";
import InputBox from "./InputBox";
import TypingIndicator from "./TypingIndicator";

const ChatWindow = ({
  activeTrip,
  livePlan,
  hasActiveConversation,
  messages,
  quickPrompts,
  isStreaming,
  onTripSettingsChange,
  onOpenSidebar,
  onOpenPreview,
  onSaveTrip,
  onPromptSelect,
  onSendMessage,
}) => {
  const destination = livePlan?.destination ?? "New travel chat";
  const dates = activeTrip.dates;
  const daysPlanned = livePlan?.intent === "trip_plan"
    ? livePlan.days?.length || activeTrip.days
    : activeTrip.days;
  const isEmptyChat = !hasActiveConversation && !isStreaming && messages.length === 0;
  const [composerText, setComposerText] = useState("");

  return (
    <section className="flex h-[100dvh] min-h-0 w-full max-w-full flex-col overflow-hidden rounded-none border border-slate-900/10 bg-white shadow-sm sm:h-[calc(100vh-1rem)] sm:rounded-xl lg:h-[calc(100vh-1rem)]">
      <header className="shrink-0 border-b border-slate-200 bg-[#fbfdfb] p-2.5 lg:p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-[#60746f] sm:text-sm">
              {livePlan ? "Current itinerary" : "Travel AI"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold leading-tight text-slate-950 sm:text-[1.7rem]">
              {destination}
            </h2>
          </div>

          <div className="grid grid-cols-[2.75rem_2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2 sm:flex">
            <button
              type="button"
              title="Open saved chats"
              aria-label="Open saved chats"
              onClick={onOpenSidebar}
              className="grid h-11 w-full place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-[#0f8f83] hover:text-[#0f8f83] focus:outline-none focus:ring-2 focus:ring-[#0f8f83] sm:h-10 sm:w-10 lg:hidden"
            >
              <PanelLeft size={18} />
            </button>
            <button
              type="button"
              title="Open trip preview"
              aria-label="Open trip preview"
              onClick={onOpenPreview}
              className="grid h-11 w-full place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-[#0f8f83] hover:text-[#0f8f83] focus:outline-none focus:ring-2 focus:ring-[#0f8f83] sm:h-10 sm:w-10 lg:hidden"
            >
              <Route size={18} />
            </button>
            <button
              type="button"
              title="Tune filters"
              aria-label="Tune filters"
              className="hidden h-10 w-full place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-[#0f8f83] hover:text-[#0f8f83] focus:outline-none focus:ring-2 focus:ring-[#0f8f83] sm:grid sm:w-10"
            >
              <SlidersHorizontal size={18} />
            </button>
            <button
              type="button"
              title="Share itinerary"
              aria-label="Share itinerary"
              className="hidden h-10 w-full place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-[#0f8f83] hover:text-[#0f8f83] focus:outline-none focus:ring-2 focus:ring-[#0f8f83] sm:grid sm:w-10"
            >
              <Share2 size={18} />
            </button>
            <button
              type="button"
              onClick={onSaveTrip}
              className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg bg-[#0f8f83] px-2 text-sm font-semibold text-white transition hover:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-[#0f8f83] sm:h-10 sm:px-3 sm:text-base"
            >
              <Star size={17} />
              <span className="hidden min-[390px]:inline">Save trip</span>
              <span className="min-[390px]:hidden">Save</span>
            </button>
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-2 text-sm font-semibold text-white transition hover:bg-[#0f8f83] focus:outline-none focus:ring-2 focus:ring-[#0f8f83] sm:h-10 sm:w-auto sm:px-3 sm:text-base"
            >
              <Download size={17} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        <div
          className={`mt-2 grid gap-2 ${
            livePlan
              ? "md:grid-cols-[minmax(250px,1fr)_minmax(150px,0.55fr)]"
              : ""
          }`}
        >
          <section className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm lg:p-2.5">
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e8f8f5] text-[#0f8f83]">
                <CalendarDays size={17} />
              </span>
              <CalendarPicker
                startValue={activeTrip.selectedStartDate}
                endValue={activeTrip.selectedEndDate}
                suggested={dates}
                onChange={onTripSettingsChange}
              />
            </div>
          </section>

          {livePlan ? (
            <section className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm lg:p-2.5">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#eef4ff] text-[#2563eb]">
                  <CalendarDays size={17} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Days planned
                  </p>
                  <p className="mt-0.5 text-2xl font-semibold leading-tight text-slate-950">
                    {daysPlanned}
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    itinerary days
                  </p>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={[
            "planner-scrollbar min-h-0 flex-1 overflow-x-hidden bg-[#f7faf8]",
            isEmptyChat ? "overflow-hidden p-3 lg:p-4" : "overflow-y-auto p-2 sm:p-4 xl:p-5",
          ].join(" ")}
        >
          <div className="flex w-full max-w-none flex-col gap-3 sm:gap-5">
            {isEmptyChat ? (
              <EmptyTravelState onDraftSelect={setComposerText} />
            ) : null}
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isStreaming ? (
              <TypingIndicator label="Streaming agent response" />
            ) : hasActiveConversation && messages.length ? (
              <TypingIndicator label={`${destination} route checks synced`} />
            ) : null}
          </div>
        </div>
        <div className="shrink-0">
          <InputBox
            quickPrompts={quickPrompts}
            input={composerText}
            disabled={isStreaming}
            onInputChange={setComposerText}
            onPromptSelect={onPromptSelect}
            onSendMessage={onSendMessage}
          />
        </div>
      </div>
    </section>
  );
};

const starterPrompts = [
  {
    title: "Plan a trip",
    prompt: "Plan a 3-day trip to ",
    description: "Build a day-wise itinerary",
    icon: MapPin,
  },
  {
    title: "Food guide",
    prompt: "What food should I try in ",
    description: "Find local dishes and food areas",
    icon: Utensils,
  },
  {
    title: "Budget trip",
    prompt: "Plan an affordable trip to ",
    description: "Lower-cost stay and transport",
    icon: WalletCards,
  },
  {
    title: "Best places",
    prompt: "Best places to visit in ",
    description: "Attractions worth saving",
    icon: Compass,
  },
];

const EmptyTravelState = ({ onDraftSelect }) => {
  return (
    <div className="flex min-h-0 items-center justify-center">
      <section className="w-full max-w-xl min-w-0 px-1 text-center">
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#e8f8f5] text-[#0f8f83] shadow-sm">
          <Sparkles size={20} />
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#60746f]">
          Start planning
        </p>
        <h3 className="mt-1.5 text-2xl font-semibold leading-tight text-slate-950 lg:text-3xl">
          Where should we go?
        </h3>
        <p className="mx-auto mt-2 max-w-lg text-[0.9rem] leading-6 text-slate-600">
          Ask for an itinerary, food guide, budget, route, weather, stays, or
          travel tips. The assistant will build the trip workspace after your first
          message.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {starterPrompts.map(({ title, prompt, description, icon: Icon }) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onDraftSelect(prompt)}
              className="group min-w-0 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-[#0f8f83] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0f8f83]"
            >
              <span className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#f7faf8] text-[#0f8f83] transition group-hover:bg-[#e8f8f5]">
                  <Icon size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.98rem] font-semibold text-slate-950">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-[0.86rem] leading-5 text-slate-500">
                    {description}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

const CalendarPicker = ({ startValue, endValue, suggested, onChange }) => {
  const pickerRef = useRef(null);
  const startDate = parseIsoDate(startValue);
  const endDate = parseIsoDate(endValue);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(startDate ?? new Date()),
  );
  const monthDays = useMemo(
    () => buildCalendarDays(visibleMonth, startValue, endValue),
    [visibleMonth, startValue, endValue],
  );

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (pickerRef.current?.contains(event.target)) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const monthLabel = visibleMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const displayDate = startDate
    ? `${formatDisplayDate(startDate)}${endDate ? ` - ${formatDisplayDate(endDate)}` : ""}`
    : "Choose travel dates";
  const helperText = startDate && !endDate
    ? "Now select end date"
    : startDate && endDate
      ? `${calculateInclusiveDays(startValue, endValue)} itinerary days`
      : `Suggested: ${suggested}`;

  const handleDateSelect = (isoDate) => {
    if (!startValue || (startValue && endValue)) {
      onChange({
        travelStartDate: isoDate,
        travelEndDate: "",
        travelDate: isoDate,
      });
      return;
    }

    if (isoDate < startValue) {
      onChange({
        travelStartDate: isoDate,
        travelEndDate: startValue,
        travelDate: isoDate,
      });
      setIsOpen(false);
      return;
    }

    onChange({
      travelStartDate: startValue,
      travelEndDate: isoDate,
      travelDate: startValue,
    });
    setIsOpen(false);
  };

  return (
    <div ref={pickerRef} className="relative min-w-0 flex-1">
      <p className="text-xs font-semibold uppercase text-slate-500">
        Travel dates
      </p>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => {
          if (!isOpen) {
            setVisibleMonth(startOfMonth(startDate ?? new Date()));
          }

          setIsOpen((current) => !current);
        }}
        className="mt-1 flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-[#f7faf8] px-3 py-1.5 text-left transition hover:border-[#0f8f83] focus:border-[#0f8f83] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#bdeee6]"
      >
        <span>
          <span className="block text-base font-semibold leading-5 text-slate-950">
            {displayDate}
          </span>
          <span className="block text-xs font-medium leading-5 text-slate-500">
            {helperText}
          </span>
        </span>
        <CalendarDays size={18} className="shrink-0 text-[#0f8f83]" />
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label="Choose travel date range"
          className="fixed left-3 right-3 top-28 z-50 rounded-xl border border-slate-200 bg-white p-3 shadow-xl sm:absolute sm:left-0 sm:right-auto sm:top-[calc(100%+0.75rem)] sm:w-[25rem]"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
              className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 transition hover:border-[#0f8f83] hover:text-[#0f8f83] focus:outline-none focus:ring-2 focus:ring-[#0f8f83]"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <p className="text-base font-semibold text-slate-950">
                {monthLabel}
              </p>
              <p className="text-xs font-medium text-slate-500">
                {startValue && !endValue ? "Select end date" : "Select start date"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
              className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 transition hover:border-[#0f8f83] hover:text-[#0f8f83] focus:outline-none focus:ring-2 focus:ring-[#0f8f83]"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-slate-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {monthDays.map((day) => (
              <button
                key={day.iso}
                type="button"
                onClick={() => handleDateSelect(day.iso)}
                className={[
                  "grid h-10 place-items-center rounded-md text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#0f8f83]",
                  day.isStart || day.isEnd
                    ? "bg-[#0f8f83] text-white shadow-sm"
                    : day.isInRange
                      ? "bg-[#e8f8f5] text-[#0f8f83]"
                      : day.isToday
                        ? "border border-[#0f8f83] bg-white text-[#0f8f83]"
                        : day.inMonth
                          ? "text-slate-700 hover:bg-[#e8f8f5] hover:text-[#0f8f83]"
                          : "text-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                {day.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={() => {
                onChange({
                  travelStartDate: "",
                  travelEndDate: "",
                  travelDate: "",
                });
                setIsOpen(false);
              }}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleDateSelect(toIsoDate(new Date()))}
              className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0f8f83]"
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

function formatDisplayDate(date) {
  return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function buildCalendarDays(monthDate, startIso, endIso) {
  const monthStart = startOfMonth(monthDate);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const todayIso = toIsoDate(new Date());

  return Array.from({ length: 42 }, (_item, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const iso = toIsoDate(date);

    return {
      iso,
      label: String(date.getDate()),
      inMonth: date.getMonth() === monthStart.getMonth(),
      isToday: iso === todayIso,
      isStart: iso === startIso,
      isEnd: iso === endIso,
      isInRange: Boolean(startIso && endIso && iso > startIso && iso < endIso),
    };
  });
}

function addMonths(date, offset) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function parseIsoDate(value) {
  if (!value) {
    return null;
  }

  const [year, month, day] = String(value).split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function calculateInclusiveDays(startIso, endIso) {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);

  if (!start || !end) {
    return 0;
  }

  const diff = Math.round((end - start) / 86400000) + 1;

  return Math.max(diff, 1);
}

export default ChatWindow;
