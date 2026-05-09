import { useState } from "react";
import {
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
  livePlan,
  hasActiveConversation,
  messages,
  quickPrompts,
  isStreaming,
  onOpenSidebar,
  onOpenPreview,
  onTuneTrip,
  onShareTrip,
  onSaveTrip,
  onExportTrip,
  onPromptSelect,
  onSendMessage,
}) => {
  const destination = livePlan?.destination ?? "New travel chat";
  const isEmptyChat = !hasActiveConversation && !isStreaming && messages.length === 0;
  const [composerText, setComposerText] = useState("");

  return (
    <section className="flex h-[100dvh] min-h-0 w-full max-w-full flex-col overflow-hidden rounded-none border border-slate-200/80 bg-white shadow-sm sm:h-[calc(100vh-1rem)] sm:rounded-xl lg:h-full lg:min-h-0">
      <header className="shrink-0 border-b border-slate-200 bg-white p-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-[#60746f]">
              {livePlan ? "Current itinerary" : "Travel AI"}
            </p>
            <h2 className="mt-0.5 text-[1.28rem] font-semibold leading-tight text-slate-950">
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
              onClick={onTuneTrip}
              disabled={!livePlan || isStreaming}
              className="hidden h-8 w-full place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-[#0f8f83] hover:text-[#0f8f83] focus:outline-none focus:ring-2 focus:ring-[#0f8f83] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-slate-200 disabled:hover:text-slate-600 sm:grid sm:w-8"
            >
              <SlidersHorizontal size={16} />
            </button>
            <button
              type="button"
              title="Share itinerary"
              aria-label="Share itinerary"
              onClick={onShareTrip}
              disabled={!livePlan}
              className="hidden h-8 w-full place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-[#0f8f83] hover:text-[#0f8f83] focus:outline-none focus:ring-2 focus:ring-[#0f8f83] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-slate-200 disabled:hover:text-slate-600 sm:grid sm:w-8"
            >
              <Share2 size={16} />
            </button>
            <button
              type="button"
              onClick={onSaveTrip}
              className="flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md bg-[#0f8f83] px-2.5 text-[0.86rem] font-medium text-white transition hover:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-[#0f8f83]"
            >
              <Star size={15} />
              <span className="hidden min-[390px]:inline">Save trip</span>
              <span className="min-[390px]:hidden">Save</span>
            </button>
            <button
              type="button"
              onClick={onExportTrip}
              disabled={!livePlan}
              className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-slate-950 px-2.5 text-[0.86rem] font-medium text-white transition hover:bg-[#0f8f83] focus:outline-none focus:ring-2 focus:ring-[#0f8f83] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-slate-950 sm:w-auto"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

      </header>

      <div className="flex min-h-0 flex-1 basis-0 flex-col overflow-hidden">
        <div
          style={{ scrollbarGutter: "stable" }}
          className={[
            "planner-scrollbar min-h-0 flex-1 basis-0 overscroll-contain overflow-x-hidden bg-white",
            isEmptyChat ? "overflow-hidden p-3 lg:p-4" : "overflow-y-auto p-2 sm:p-4",
          ].join(" ")}
        >
          <div className="flex w-full max-w-none flex-col gap-3">
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
        <div className="mx-auto grid h-9 w-9 place-items-center rounded-lg bg-[#e8f8f5] text-[#0f8f83]">
          <Sparkles size={18} />
        </div>
        <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-wide text-[#60746f]">
          Start planning
        </p>
        <h3 className="mt-1.5 text-[1.7rem] font-semibold leading-tight text-slate-950">
          Where should we go?
        </h3>
        <p className="mx-auto mt-2 max-w-lg text-[0.88rem] leading-6 text-slate-600">
          Ask for an itinerary, food guide, budget, route, weather, stays, or
          travel tips. The assistant will build the trip workspace after your first
          message.
        </p>

        <div className="mx-auto mt-4 grid max-w-[35rem] gap-2 sm:grid-cols-2">
          {starterPrompts.map(({ title, prompt, description, icon: Icon }) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onDraftSelect(prompt)}
              className="group min-w-0 rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-sm transition hover:border-[#0f8f83] hover:bg-[#fbfdfb] focus:outline-none focus:ring-2 focus:ring-[#0f8f83]"
            >
              <span className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f7faf8] text-[#0f8f83] transition group-hover:bg-[#e8f8f5]">
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.92rem] font-semibold text-slate-950">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-[0.8rem] leading-5 text-slate-500">
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

export default ChatWindow;
