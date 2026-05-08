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
        <div className="max-w-[92%] rounded-lg bg-slate-950 px-3 py-2 text-[1rem] leading-7 text-white shadow-sm sm:max-w-[min(42rem,82%)] sm:px-4 sm:py-3">
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
      <div className="w-full max-w-[42rem] rounded-lg border border-slate-200 bg-white p-3 text-slate-700 shadow-sm sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-3 sm:mb-3">
          <div className="flex min-w-0 items-center gap-2 text-base font-semibold text-slate-950 sm:text-lg">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#e8f8f5] text-[#0f8f83] sm:h-8 sm:w-8">
              <Bot size={17} />
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
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-[#0f8f83] hover:text-[#0f8f83] focus:outline-none focus:ring-2 focus:ring-[#0f8f83]"
            >
              {isSpeaking ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
          ) : null}
        </div>
        <p className="whitespace-pre-wrap text-[0.98rem] leading-7 sm:text-[1rem]">{message.text}</p>

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
    <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-[#f7faf8] p-3 sm:p-4">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase text-slate-500 sm:text-base">
            <CalendarDays size={14} className="text-[#0f8f83]" />
            <span>Plan</span>
          </div>
          <p className="mt-1 text-base font-semibold text-slate-950 sm:text-lg">
            {plan.days.length} days
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-[#fff9ed] p-3 sm:p-4">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase text-slate-500 sm:text-base">
            <WalletCards size={14} className="text-[#9a6100]" />
            <span>Budget</span>
          </div>
          <p className="mt-1 text-base font-semibold text-slate-950 sm:text-lg">
            {plan.cost?.formattedTotal ?? "Estimate ready"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-[#eef4ff] p-3 sm:p-4">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase text-slate-500 sm:text-base">
            <CloudSun size={14} className="text-[#2563eb]" />
            <span>Weather</span>
          </div>
          <p className="mt-1 text-base font-semibold text-slate-950 sm:text-lg">
            {weatherRange}
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        {plan.days.map((day) => (
          <article
            key={day.day}
            className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-[#f7faf8] p-3 sm:min-h-44 sm:p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold uppercase text-[#0f8f83] sm:text-base">
                {day.day}
              </p>
              <p className="text-sm text-slate-500 sm:text-base">
                {day.places?.length ?? 0} stops
              </p>
            </div>
            <p className="mt-1 text-base font-semibold text-slate-950 sm:text-lg">
              {day.title}
            </p>
            <p className="mt-2 text-[1rem] leading-8 text-slate-600 sm:text-[1.06rem]">
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
                    <p className="mt-1 text-[0.98rem] leading-7 text-slate-700 sm:text-[1.03rem]">
                      {item.activity}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            {day.places?.length ? (
              <div className="mt-auto flex flex-wrap gap-1.5 pt-2 sm:pt-3">
                {day.places.map((place) => (
                  <span
                    key={place.name}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-600 sm:text-base"
                  >
                    <MapPin size={12} className="text-[#0f8f83]" />
                    {place.name}
                  </span>
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
    <div className="rounded-lg border border-slate-200 bg-[#f7faf8] p-3 sm:p-4">
      <p className="text-sm font-semibold uppercase text-[#0f8f83] sm:text-base">
        Booking-ready next steps
      </p>
      <p className="mt-2 text-[1rem] leading-8 text-slate-600 sm:text-[1.05rem]">{booking.note}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {booking.actions.map((action) => (
          <a
            key={action.type}
            href={action.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-base font-semibold text-slate-700 transition hover:border-[#0f8f83] hover:text-[#0f8f83]"
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
    <div className="mt-4 space-y-3">
      <div className="rounded-lg border border-slate-200 bg-[#f7faf8] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase text-slate-500">
          <Info size={15} className="text-[#0f8f83]" />
          <span>{answer.label}</span>
        </div>
        <p className="mt-2 text-[1.02rem] leading-8 text-slate-700 sm:text-[1.08rem]">
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
                <p className="mt-1 text-[1rem] leading-8 text-slate-600 sm:text-[1.05rem]">
                  {item.value}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {answer.bullets?.length ? (
        <ul className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
          {answer.bullets.slice(0, 4).map((bullet) => (
            <li key={bullet} className="flex gap-2 text-[1rem] leading-8 text-slate-700 sm:text-[1.05rem]">
              <CheckCircle2 size={16} className="mt-1.5 shrink-0 text-[#0f8f83]" />
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
    <div className="mt-4 space-y-3">
      <div className="rounded-lg border border-slate-200 bg-[#f7faf8] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase text-slate-500">
          <Utensils size={15} className="text-[#0f8f83]" />
          <span>Local food style</span>
        </div>
        <p className="mt-2 text-[1.02rem] leading-8 text-slate-700 sm:text-[1.08rem]">{guide.style}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold uppercase text-[#0f8f83]">
            Must try
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {guide.mustTry?.slice(0, 8).map((item) => (
              <span
                key={item}
                className="rounded-md border border-slate-200 bg-[#fbfdfb] px-2.5 py-1.5 text-sm font-medium text-slate-700"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold uppercase text-[#0f8f83]">
            Where to eat
          </p>
          <ul className="mt-3 space-y-2">
            {guide.areas?.slice(0, 4).map((area) => (
              <li key={area} className="flex gap-2 text-[1rem] leading-8 text-slate-700 sm:text-[1.05rem]">
                <MapPin size={15} className="mt-1.5 shrink-0 text-[#0f8f83]" />
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-[#fff9ed] p-4">
        <p className="text-sm font-semibold uppercase text-[#9a6100]">
          Budget and tips
        </p>
        <p className="mt-2 text-base font-semibold text-slate-950">
          {guide.budget}
        </p>
        <ul className="mt-3 space-y-2">
          {guide.tips?.slice(0, 3).map((tip) => (
            <li key={tip} className="text-[1rem] leading-8 text-slate-700 sm:text-[1.05rem]">
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
