const MOODS = [
  { id: "calm", label: "Calm", color: "bg-calm", ring: "ring-calm" },
  { id: "loud", label: "Loud", color: "bg-loud", ring: "ring-loud" },
  { id: "warm", label: "Warm", color: "bg-warm", ring: "ring-warm" },
  { id: "lonely", label: "Lonely", color: "bg-lonely", ring: "ring-lonely" },
  { id: "bright", label: "Bright", color: "bg-bright", ring: "ring-bright" },
];

export default function MoodBar({ activeMood, onSelect, disabled }) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {MOODS.map((mood) => {
        const isActive = activeMood === mood.id;
        return (
          <button
            key={mood.id}
            onClick={() => onSelect(mood.id)}
            disabled={disabled && !isActive}
            className={`
              relative px-6 py-3 rounded-full text-sm font-semibold
              transition-all duration-300 ease-out
              ${isActive
                ? `${mood.color} text-black ring-2 ${mood.ring} ring-offset-2 ring-offset-[#0a0a0f] scale-105 shadow-lg`
                : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {mood.label}
          </button>
        );
      })}
    </div>
  );
}
