const TypingIndicator = ({ label = "Planning" }) => {
  return (
    <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
      <span className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3">
        <span className="h-1.5 w-1.5 rounded-sm bg-[#0f8f83] animate-bounce" />
        <span className="h-1.5 w-1.5 rounded-sm bg-[#ffb657] animate-bounce [animation-delay:120ms]" />
        <span className="h-1.5 w-1.5 rounded-sm bg-[#ff6b6b] animate-bounce [animation-delay:240ms]" />
      </span>
      <span>{label}</span>
    </div>
  );
};

export default TypingIndicator;
