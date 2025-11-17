/**
 * calendarUtils.js - Apufunktiot kalenterisovellukselle
 *
 * Sisältää utility-funktiot profiilien ja käyttäjätietojen hallintaan
 * sekä tapahtumien värittämiseen.
 */

// Oletusväripaletti kalenterilähteille
export const DEFAULT_COLORS = ["var(--pcolor)", "var(--scolor)", "#f39c12", "#9b59b6", "#e74c3c"];

/**
 * Hakee aktiivisen käyttäjänimen localStoragesta
 * @returns {string} Käyttäjänimi tai tyhjä merkkijono jos ei löydy
 */
export function getUsername() {
  try {
    const auth = JSON.parse(localStorage.getItem("auth") || "{}");
    return auth?.user?.username || "";
  } catch (error) {
    console.warn("Virhe käyttäjänimen haussa localStoragesta:", error);
    return "";
  }
}

/**
 * Hakee aktiivisen profiilin tiedot localStoragesta
 * @returns {Object|null} Profiili-objekti tai null jos ei löydy
 */
export function getActiveProfile() {
  try {
    const profiles = JSON.parse(localStorage.getItem("profiles") || "[]");
    const activeId = localStorage.getItem("activeProfile");
    if (!activeId) return null;
    return profiles.find(p => String(p.id) === String(activeId)) || null;
  } catch (error) {
    console.warn("Virhe aktiivisen profiilin haussa localStoragesta:", error);
    return null;
  }
}

/**
 * Hakee kaikki profiilit localStoragesta
 * @returns {Array} Profiilien taulukko
 */
export function getAllProfiles() {
  try {
    return JSON.parse(localStorage.getItem("profiles") || "[]");
  } catch (error) {
    console.warn("Virhe profiilien haussa localStoragesta:", error);
    return [];
  }
}

/**
 * Lisää värin tapahtumiin FullCalendaria varten
 * @param {Array} events - Tapahtumien taulukko
 * @param {string} color - Värikoodi tapahtumille
 * @returns {Array} Värilliset tapahtumat
 */
export function colorize(events, color) {
  const list = Array.isArray(events) ? events : [];
  return list.map((e) => ({ ...e, backgroundColor: color, borderColor: color }));
}