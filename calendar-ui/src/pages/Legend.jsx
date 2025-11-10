import React from "react";

/**
 * Legend-komponentti kalenterilähteen värin ja nimen näyttämiseen
 * @param {string} color - Värikoodi (hex)
 * @param {string} label - Näytettävä teksti
 */
export default function Legend({ color, label }) {
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <span style={{ width: 12, height: 12, background: color, borderRadius: 2 }} />
      {label}
    </span>
  );
}