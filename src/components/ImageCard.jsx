export default function ImageCard({ url, alt, index }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white/5 shadow-lg transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl hover:shadow-black/40">
      <img
        src={url}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
        <span className="text-xs font-medium text-white/80 bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
          {alt}
        </span>
      </div>
    </div>
  );
}
