// Wraps matching substrings in <mark> for visual highlighting. Splits on
// individual query words (not the whole phrase) so partial/reordered
// matches still get highlighted, consistent with how the search itself works.
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function HighlightedText({ text, query, className }) {
  if (!text) return null;
  if (!query || !query.trim()) return <span className={className}>{text}</span>;

  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegExp);
  if (words.length === 0) return <span className={className}>{text}</span>;

  const pattern = new RegExp(`(${words.join("|")})`, "gi");
  const parts = text.split(pattern);
  // split() with a single capturing group alternates: even indices are
  // plain text, odd indices are always the captured match - using this
  // instead of re-running pattern.test() per part, since a global regex's
  // .test() mutates lastIndex and gives wrong results across repeated calls.

  return (
    <span className={className}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          // eslint-disable-next-line react/no-array-index-key
          <mark key={index} className="rounded-sm bg-amber-200 px-0.5 text-inherit dark:bg-amber-500/40">
            {part}
          </mark>
        ) : (
          // eslint-disable-next-line react/no-array-index-key
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
}
