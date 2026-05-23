export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-16 h-16 mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-white/60 text-sm mb-6 max-w-xs text-center">{message}</p>
      <button
        onClick={onRetry}
        className="px-6 py-2.5 rounded-full bg-white/10 text-white text-sm font-semibold
                   hover:bg-white/20 transition-all duration-200 border border-white/10"
      >
        Try again
      </button>
    </div>
  );
}
