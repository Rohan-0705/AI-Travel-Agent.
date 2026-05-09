import { useState } from "react";
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  CloudSun,
  ExternalLink,
  Info,
  MapPin,
  Utensils,
  UserRound,
  Volume2,
  VolumeX,
  WalletCards,
} from "lucide-react";

const MessageBubble = ({ message }) => {
  const isUser = message.role === "user";
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[92%] rounded-lg bg-slate-950 px-3 py-2 text-[0.95rem] leading-6 text-white shadow-sm sm:max-w-[min(38rem,82%)]">
          <div className="mb-1 flex items-center justify-end gap-2 text-sm font-semibold text-[#b7c9c4] sm:mb-2 sm:text-base">
            <span>You</span>
            <UserRound size={15} />
          </div>
          <p>{message.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-[1rem] font-semibold text-slate-950">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#e8f8f5] text-[#0f8f83]">
              <Bot size={16} />
            </span>
            <span className="truncate">{message.title ?? "Travel AI"}</span>
          </div>
          {!message.isStreaming ? (
            <button
              type="button"
              title={isSpeaking ? "Stop voice" : "Read answer aloud"}
              aria-label={isSpeaking ? "Stop voice" : "Read answer aloud"}
              onClick={() => toggleSpeech({
                text: message.text,
                isSpeaking,
                setIsSpeaking,
              })}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:border-[#0f8f83] hover:text-[#0f8f83] focus:outline-none focus:ring-2 focus:ring-[#0f8f83]"
            >
              {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          ) : null}
        </div>
        <p className="whitespace-pre-wrap text-[0.94rem] leading-6">{message.text}</p>

        {message.structuredPlan ? (
          <StructuredPlan plan={message.structuredPlan} />
        ) : null}

        {message.isStreaming ? (
          <p className="mt-3 text-base font-semibold text-[#0f8f83]">
            Streaming live...
          </p>
        ) : null}

        {message.highlights?.length ? (
          <ul className="mt-4 space-y-2">
            {message.highlights.map((highlight) => (
              <li
                key={highlight}
                className="flex items-start gap-2 text-[1rem] leading-8 text-slate-700 sm:text-[1.06rem]"
              >
                <CheckCircle2
                  size={17}
                  className="mt-1 shrink-0 text-[#0f8f83]"
                />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
};

const StructuredPlan = ({ plan }) => {
  if (plan.intent === "food_info") {
    return (
      <div className="mt-3 space-y-3 sm:mt-4">
        <FoodGuide guide={plan.foodGuide} />
      </div>
    );
  }

  if (plan.intent !== "trip_plan") {
    return (
      <div className="mt-3 space-y-3 sm:mt-4">
        <TravelAnswerCard answer={plan.travelAnswer} />
      </div>
    );
  }

  const weatherSamples = plan.weather?.samples ?? [];
  const temps = weatherSamples
    .map((sample) => sample.tempC)
    .filter(Number.isFinite);
  const weatherRange = temps.length
    ? `${Math.min(...temps)}-${Math.max(...temps)} C`
    : "Checked";

  return (
      <div className="mt-3 space-y-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-[#f7faf8] p-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
            <CalendarDays size={14} className="text-[#0f8f83]" />
            <span>Plan</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {plan.days.length} days
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-[#fff9ed] p-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
            <WalletCards size={14} className="text-[#9a6100]" />
            <span>Budget</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {plan.cost?.formattedTotal ?? "Estimate ready"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-[#eef4ff] p-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
            <CloudSun size={14} className="text-[#2563eb]" />
            <span>Weather</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {weatherRange}
          </p>
        </div>
      </div>

      {plan.destinationBrief ? (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#60746f]">
            <Info size={14} className="text-[#0f8f83]" />
            <span>Destination brief</span>
          </div>
          <p className="mt-2 text-[0.92rem] leading-6 text-slate-700">
            {plan.destinationBrief}
          </p>
        </div>
      ) : null}

      <div className="grid gap-2">
        {plan.days.map((day) => (
          <article
            key={day.day}
            className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-[#f7faf8] p-3 sm:min-h-32"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-[#0f8f83]">
                {day.day}
              </p>
              <p className="text-xs text-slate-500">
                {day.places?.length ?? 0} stops
              </p>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {day.title}
            </p>
            <p className="mt-1.5 text-[0.94rem] leading-6 text-slate-600">
              {day.description}
            </p>
            {day.schedule?.length ? (
              <div className="mt-2 grid gap-1.5 sm:mt-3 sm:gap-2">
                {day.schedule.map((item) => (
                  <div
                    key={`${day.day}-${item.time}`}
                    className="rounded-md border border-slate-200 bg-white/80 p-2"
                  >
                    <p className="text-sm font-semibold uppercase text-slate-500">
                      {item.time}
                    </p>
                    <p className="mt-1 text-[0.92rem] leading-6 text-slate-700">
                      {item.activity}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            {day.places?.length ? (
              <div className="mt-auto grid gap-2 pt-2 sm:grid-cols-2 sm:pt-3 xl:grid-cols-3">
                {day.places.map((place) => (
                  <div
                    key={place.name}
                    className="rounded-md border border-slate-200 bg-white p-2"
                  >
                    <div className="flex items-start gap-1.5">
                      <MapPin size={13} className="mt-0.5 shrink-0 text-[#0f8f83]" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-5 text-slate-950">
                          {place.name}
                        </p>
                        {place.famousFor ? (
                          <p className="mt-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-[#0f8f83]">
                            {place.famousFor}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {place.brief ? (
                      <p className="mt-1.5 text-[0.78rem] leading-5 text-slate-600">
                        {place.brief}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <BookingHandoff booking={plan.booking} />
    </div>
  );
};

const BookingHandoff = ({ booking }) => {
  if (!booking?.actions?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-[#f7faf8] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#0f8f83]">
        Booking-ready next steps
      </p>
      <p className="mt-2 text-[0.9rem] leading-6 text-slate-600">{booking.note}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {booking.actions.map((action) => (
          <a
            key={action.type}
            href={action.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[0.86rem] font-medium text-slate-700 transition hover:border-[#0f8f83] hover:text-[#0f8f83]"
          >
            <span>{action.label}</span>
            <ExternalLink size={14} />
          </a>
        ))}
      </div>
    </div>
  );
};

const TravelAnswerCard = ({ answer }) => {
  if (!answer) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-lg border border-slate-200 bg-[#f7faf8] p-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Info size={15} className="text-[#0f8f83]" />
          <span>{answer.label}</span>
        </div>
        <p className="mt-2 text-[0.9rem] leading-6 text-slate-700">
          {answer.summary}
        </p>
      </div>

      {answer.items?.length ? (
        <div className="grid gap-2">
          {answer.items.slice(0, 6).map((item) => (
            <div
              key={`${item.label}-${item.value}`}
              className="rounded-lg border border-slate-200 bg-white p-3"
            >
              <p className="text-base font-semibold text-slate-950">
                {item.label}
              </p>
              {item.value ? (
                <p className="mt-1 text-[0.9rem] leading-6 text-slate-600">
                  {item.value}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {answer.bullets?.length ? (
        <ul className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
          {answer.bullets.slice(0, 4).map((bullet) => (
            <li key={bullet} className="flex gap-2 text-[0.9rem] leading-6 text-slate-700">
              <CheckCircle2 size={15} className="mt-1 shrink-0 text-[#0f8f83]" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

const FoodGuide = ({ guide }) => {
  if (!guide) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-lg border border-slate-200 bg-[#f7faf8] p-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Utensils size={15} className="text-[#0f8f83]" />
          <span>Local food style</span>
        </div>
        <p className="mt-2 text-[0.9rem] leading-6 text-slate-700">{guide.style}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0f8f83]">
            Must try
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {guide.mustTry?.slice(0, 8).map((item) => (
              <span
                key={item}
                className="rounded-md border border-slate-200 bg-[#fbfdfb] px-2.5 py-1.5 text-[0.82rem] font-medium text-slate-700"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0f8f83]">
            Where to eat
          </p>
          <ul className="mt-3 space-y-2">
            {guide.areas?.slice(0, 4).map((area) => (
              <li key={area} className="flex gap-2 text-[0.9rem] leading-6 text-slate-700">
                <MapPin size={14} className="mt-1 shrink-0 text-[#0f8f83]" />
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-[#fff9ed] p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#9a6100]">
          Budget and tips
        </p>
        <p className="mt-2 text-[0.92rem] font-semibold text-slate-950">
          {guide.budget}
        </p>
        <ul className="mt-3 space-y-2">
          {guide.tips?.slice(0, 3).map((tip) => (
            <li key={tip} className="text-[0.9rem] leading-6 text-slate-700">
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

function toggleSpeech({ text, isSpeaking, setIsSpeaking }) {
  if (!("speechSynthesis" in window)) {
    return;
  }

  if (isSpeaking) {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(stripMarkdown(text));
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.onend = () => setIsSpeaking(false);
  utterance.onerror = () => setIsSpeaking(false);
  setIsSpeaking(true);
  window.speechSynthesis.speak(utterance);
}

function stripMarkdown(value = "") {
  return String(value)
    .replace(/[#*_>`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default MessageBubble;
