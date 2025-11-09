import Legend from "./Legend.jsx";

/**
 * SourceCheckboxes - Kalenterilähteiden näkyvyysvalintojen komponentti
 *
 * Hallinnoi kalenterilähteiden näyttämistä/piilottamista checkboxien avulla
 */
export default function SourceCheckboxes({ sources, setSources }) {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
      {sources.map((s, i) => (
        <label key={i} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={s.checked}
            onChange={(e) => setSources((prev) => prev.map((p, idx) => (idx === i ? { ...p, checked: e.target.checked } : p)))}
          />
          <Legend color={s.color} label={`${s.label}${s.url ? "" : " (demo)"}`} />
        </label>
      ))}
    </div>
  );
}