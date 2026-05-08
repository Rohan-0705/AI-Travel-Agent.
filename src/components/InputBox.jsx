import { useEffect, useRef, useState } from "react";
import { Mic, Send, SlidersHorizontal } from "lucide-react";

const InputBox = ({
  quickPrompts,
  input,
  disabled = false,
  onInputChange,
  onPromptSelect,
  onSendMessage,
}) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
    };
  }, []);

  const submitMessage = () => {
    const cleanInput = input.trim();

    if (!cleanInput || disabled) {
      return;
    }

    onSendMessage(cleanInput);
    onInputChange("");
  };

  const handleVoiceInput = () => {
    if (disabled) {
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop?.();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onInputChange(
        input || "Voice input is not supported in this browser. Please type your travel request.",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    const baseInput = input.trim();
    recognitionRef.current = recognition;
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let transcript = "";

      for (const result of event.results) {
        transcript += result[0]?.transcript ?? "";
      }

      onInputChange([baseInput, transcript.trim()].filter(Boolean).join(" "));
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    setIsListening(true);
    recognition.start();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 z-20 shrink-0 overflow-hidden border-t border-slate-200 bg-white/95 p-2 shadow-[0_-10px_24px_rgba(15,23,42,0.08)] backdrop-blur"
    >
      <div className="w-full max-w-none">
        {quickPrompts.length ? (
          <div className="planner-scrollbar mb-2 flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={disabled}
                onClick={() => onPromptSelect(prompt)}
                className="min-h-9 min-w-[11rem] rounded-lg border border-slate-200 bg-[#f7faf8] px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-[#0f8f83] hover:text-[#0f8f83] focus:outline-none focus:ring-2 focus:ring-[#0f8f83] disabled:text-slate-400 sm:min-w-0"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-[#f7faf8] p-1 focus-within:border-[#0f8f83] focus-within:ring-2 focus-within:ring-[#bdeee6]">
          <button
            type="button"
            title={isListening ? "Stop listening" : "Voice input"}
            aria-label={isListening ? "Stop listening" : "Voice input"}
            onClick={handleVoiceInput}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f8f83] ${
              isListening
                ? "bg-[#e8f8f5] text-[#0f8f83]"
                : "text-slate-500 hover:text-[#0f8f83]"
            }`}
          >
            <Mic size={18} />
          </button>
          <textarea
            value={input}
            disabled={disabled}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask for hotels, routes, food, or an itinerary"
            className="h-9 max-h-9 min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-1.5 text-[0.92rem] leading-6 text-slate-950 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            title="Trip filters"
            aria-label="Trip filters"
            className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-white hover:text-[#0f8f83] focus:outline-none focus:ring-2 focus:ring-[#0f8f83] sm:grid"
          >
            <SlidersHorizontal size={18} />
          </button>
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className="flex h-9 shrink-0 items-center gap-2 rounded-lg bg-[#0f8f83] px-3 text-sm font-semibold text-white transition hover:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-[#0f8f83] disabled:bg-slate-300 disabled:text-slate-500"
          >
            <Send size={17} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </form>
  );
};

export default InputBox;
