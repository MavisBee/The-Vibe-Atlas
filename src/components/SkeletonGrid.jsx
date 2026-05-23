export default function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 w-full">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="aspect-[3/2] rounded-2xl skeleton-shimmer" />
      ))}
    </div>
  );
}
