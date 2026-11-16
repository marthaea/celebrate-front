import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Luganda wording for the main parts of the site, keyed by the English text.
// Anything not listed here stays in English. These are first-draft translations and
// should be checked by a fluent Luganda speaker before launch.
const LUGANDA = {
  // Navigation
  "Services": "Obuweereza", "Offers": "Ebisaliddwako", "For vendors": "Abasuubuzi", "Account": "Akawunti",
  "Bookings": "Emikolo gyange", "My plan": "Enteekateeka yange", "Budget": "Embalirira", "Search": "Noonya",
  "My plan ": "Enteekateeka yange ", "Budget planner": "Embalirira y'omukolo", "List my business": "Wandiisa bizinensi yange",
  // Home
  "Tukusanyukidde. Every event service, one grand total.": "Tukusanyukidde. Buli kya mukolo, omugatte gumu.",
  "Plan my event": "Teekateeka omukolo gwange", "Plan by budget": "Teekateeka ng'osinziira ku ssente",
  "Try a sample kwanjula": "Gezaako okwanjula okw'ekyokulabirako",
  "Tukusanyukidde · Welcome": "Tukusanyukidde",
  "Every event service. One platform. One grand total. Choose your venue, tents, food, sound and more from trusted vendors across Uganda, and see the full cost before you pay.":
    "Buli kya mukolo. Omukutu gumu. Omugatte gumu. Londa ekifo, weema, emmere, amaloboozi n'ebirala okuva mu basuubuzi abeesigika mu Uganda yonna, olabe ssente zonna nga tonnasasula.",
  "What are we celebrating?": "Tujaguza ki?", "Kwanjula": "Okwanjula", "Wedding": "Embaga", "Graduation": "Amatikkira", "Party": "Akabaga",
  "Everything for the day": "Byonna eby'olunaku", "All services": "Obuweereza bwonna",
  "Offers this week": "Ebisaliddwako wiiki eno", "All offers": "Byonna ebisaliddwako",
  "One number. Every detail.": "Omuwendo gumu. Buli kantu.",
  "Choose your services": "Londa obuweereza", "Tell us the details": "Tubuulire ebikwata ku mukolo",
  "See your grand total": "Laba omugatte gwonna", "Pay your way": "Sasula nga bw'oyagala", "See my plan": "Laba enteekateeka yange",
  // Categories and filters
  "Venues": "Ebifo", "Tents": "Weema", "Tents and seats": "Weema n'entebe", "Catering": "Emmere", "Cakes": "Keeki",
  "Sound": "Amaloboozi", "Media and sound": "Ebyuma n'amaloboozi", "Photos": "Ebifaananyi", "Photography": "Okukuba ebifaananyi",
  "Cakes and pastries": "Keeki n'ebirala ebiwooma", "Drinks": "Ebyokunywa", "Drinks and cocktails": "Ebyokunywa", "Attire": "Engoye", "Dresses and attire": "Engoye z'omukolo",
  "MCs": "Ba MC", "Games": "Emizannyo", "All": "Byonna", "Under 500k": "Wansi wa 500k", "Top rated": "Ebisinga okusiimibwa",
  // Actions and labels
  "Add to my plan": "Teeka mu nteekateeka", "Remove from my plan": "Ggya mu nteekateeka", "View my plan": "Laba enteekateeka yange",
  "What is included": "Ebirimu", "Pay now": "Sasula kati", "Grand total": "Omugatte gwonna", "Continue": "Weeyongereyo",
  "Log in": "Yingira", "Your name": "Erinnya lyo", "Number of guests": "Omuwendo gw'abagenyi", "Event date": "Olunaku lw'omukolo",
  "District": "Disitulikiti", "Event type": "Ekika ky'omukolo", "Tents needed": "Weema ezeetaagisa", "Chairs": "Entebe",
  "Your budget": "Embalirira yo", "days to go": "ennaku ezisigadde", "Share on WhatsApp": "Gabana ku WhatsApp",
  "Loading": "Linda katono", "Back to home": "Ddayo awaka", "Your events": "Emikolo gyo", "Compare": "Geraageranya",
  "Browse services": "Laba obuweereza", "Use this plan": "Kozesa enteekateeka eno", "Remove": "Ggyamu", "Add more": "Yongerako",
  "Your plan is empty": "Enteekateeka yo njereere", "Thank you": "Webale", "Who handles setup?": "Ani ateekateeka?",
  "Choose how to pay": "Londa engeri y'okusasula", "Your plan": "Enteekateeka yo", "Track your vendors": "Goberera abasuubuzi bo",
};

const LangContext = createContext({ lang: "en", setLang: () => {}, t: (text) => text });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem("celebrate.lang") === "lg" ? "lg" : "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("celebrate.lang", lang);
    } catch {
      // The choice still holds for this visit.
    }
  }, [lang]);

  const setLang = useCallback((next) => setLangState(next === "lg" ? "lg" : "en"), []);
  const t = useCallback((text) => (lang === "lg" ? LUGANDA[text] ?? text : text), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
/** Returns t("English text"), which gives the Luganda wording when Luganda is chosen. */
export const useT = () => useContext(LangContext).t;
