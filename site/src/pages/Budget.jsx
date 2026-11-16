import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, useLoad } from "../../../src/api.js";
import { money } from "../../../src/format.js";
import { usePlan } from "../../../src/plan.jsx";
import { smallestBudget, suggest, totalOf } from "../budget.js";
import { more } from "../extra.js";
import { useT } from "../i18n.jsx";
import { ErrorNote, Loading, PageHead } from "../components.jsx";

const QUICK = [5000000, 10000000, 20000000, 40000000];
const COLOURS = { venues: "#ad1f22", tents: "#d42b2b", catering: "#f2b31c", cakes: "#f6d27a", sound: "#24140f", photos: "#e8743b", mcs: "#7a4a2a", games: "#c9b79c", drinks: "#3f8f8a", attire: "#b76a8a" };
const MIN = 1000000;
const MAX = 60000000;

export default function Budget() {
  const plan = usePlan();
  const t = useT();
  const navigate = useNavigate();
  const { event } = plan;
  const meta = useLoad(api.meta, []);
  const [budget, setBudget] = useState(() => Number(localStorage.getItem("celebrate.budget")) || 10000000);
  const [guests, setGuests] = useState(String(event.guests));
  const options = useLoad(() => more.options(event), [JSON.stringify(event)]);
  // What the customer has swapped by hand: { categoryId: optionId, or "" for none }.
  const [swaps, setSwaps] = useState({});

  useEffect(() => {
    try {
      localStorage.setItem("celebrate.budget", String(budget));
    } catch {
      // Not remembered between visits.
    }
  }, [budget]);

  const categories = options.data?.categories;
  const feeRate = options.data?.feeRate ?? 0;
  const picks = useMemo(() => {
    if (!categories) return {};
    const result = { ...suggest(categories, budget, event.type, feeRate) };
    for (const [categoryId, optionId] of Object.entries(swaps)) {
      const option = categories.find((c) => c.id === categoryId)?.options.find((o) => o.id === optionId);
      if (option) result[categoryId] = option;
      else delete result[categoryId];
    }
    return result;
  }, [categories, budget, event.type, feeRate, swaps]);

  const total = totalOf(picks, feeRate);
  const left = budget - total;
  const chosen = categories?.filter((c) => picks[c.id]) ?? [];
  const missing = categories?.filter((c) => !picks[c.id]) ?? [];
  const least = categories ? smallestBudget(categories, event.type, feeRate) : 0;

  const changeBudget = (value) => {
    setBudget(Math.min(MAX, Math.max(0, Math.round(Number(value) || 0))));
    setSwaps({});
  };
  const changeGuests = (value) => {
    setGuests(value);
    const n = Number(value);
    if (Number.isInteger(n) && n >= 1 && n <= 5000) {
      plan.setEvent({ guests: n });
      setSwaps({});
    }
  };
  const use = () => {
    plan.clearItems();
    Object.values(picks).forEach((option) => plan.addItem(option.id));
    navigate("/plan");
  };

  return (
    <div className="page">
      <div className="band">
        <PageHead eyebrow={t("Budget planner")} title="Tell us what you have. We will make it fit.">
          <p>Enter your budget and we build a full plan inside it. Swap anything and watch the total move.</p>
        </PageHead>
      </div>

      <div className="split">
        <form className="form" onSubmit={(e) => e.preventDefault()}>
          <label className="field">
            <span className="caps">{t("Your budget")} (UGX)</span>
            <input className="budget-input" inputMode="numeric" value={budget ? budget.toLocaleString("en-US") : ""} onChange={(e) => changeBudget(e.target.value.replace(/[^\d]/g, ""))} aria-describedby="budget-hint" />
            <input type="range" min={MIN} max={MAX} step={500000} value={Math.min(MAX, Math.max(MIN, budget))} onChange={(e) => changeBudget(e.target.value)} aria-label="Budget slider" />
            <small id="budget-hint" className="quiet">From UGX 1 million to UGX 60 million.</small>
          </label>
          <div className="toolbar-row" role="group" aria-label="Quick budgets">
            {QUICK.map((amount) => (
              <button type="button" key={amount} className={budget === amount ? "active" : ""} aria-pressed={budget === amount} onClick={() => changeBudget(amount)}>{amount / 1000000}M</button>
            ))}
          </div>

          <div className="fields">
            <label className="field">
              <span className="caps">{t("Event type")}</span>
              <select value={event.type} onChange={(e) => { plan.setEvent({ type: e.target.value }); setSwaps({}); }}>
                {(meta.data?.eventTypes ?? [event.type]).map((type) => <option key={type} value={type}>{t(type)}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="caps">{t("Number of guests")}</span>
              <input type="number" inputMode="numeric" min="1" max="5000" value={guests} onChange={(e) => changeGuests(e.target.value)} />
            </label>
          </div>
          <p className="aside-note">Each cost already includes labour and transport for {event.guests.toLocaleString("en-US")} guests. The grand total adds our 3% fee. Nothing is booked until you pay.</p>
        </form>

        <aside className="summary" aria-label="Suggested plan" aria-live="polite">
          <ErrorNote>{options.error}</ErrorNote>
          {options.loading && !categories && <Loading label="Adding it all up" />}
          {categories && (
            <>
              <div>
                <p className="caps">{left >= 0 ? "Fits your budget" : "Over your budget"}</p>
                <p className={`grand-total ${left < 0 ? "over" : ""}`}>{money(total)}</p>
                <p className="quiet">{left >= 0 ? `${money(left)} left of ${money(budget)}` : `${money(-left)} more than ${money(budget)}`}</p>
              </div>

              {chosen.length > 0 && (
                <div className="split-bar" role="img" aria-label={`How the money is split: ${chosen.map((c) => `${c.title} ${Math.round((picks[c.id].cost / (total || 1)) * 100)}%`).join(", ")}`}>
                  {chosen.map((c) => <span key={c.id} style={{ flexGrow: picks[c.id].cost, background: COLOURS[c.id] }} />)}
                </div>
              )}

              {chosen.length === 0 && <p className="error">That is not enough for this event yet. The smallest workable budget is about {money(least)}.</p>}

              <ul className="lines picks">
                {categories.map((category) => {
                  const pick = picks[category.id];
                  return (
                    <li key={category.id} className={pick ? "" : "off"}>
                      <span className="swatch" style={{ background: pick ? COLOURS[category.id] : "transparent" }} aria-hidden="true" />
                      <label>
                        <span>{t(category.title)}</span>
                        <select value={pick?.id ?? ""} onChange={(e) => setSwaps({ ...swaps, [category.id]: e.target.value })} aria-label={`${category.title}: choose an option`}>
                          <option value="">Leave out</option>
                          {category.options.map((option) => <option key={option.id} value={option.id}>{option.name} · {money(option.cost)}</option>)}
                        </select>
                      </label>
                      <p className="num">{pick ? money(pick.cost) : "–"}</p>
                    </li>
                  );
                })}
              </ul>
              {missing.length > 0 && chosen.length > 0 && Object.keys(swaps).length === 0 && (
                <p className="quiet">Left out to stay in budget: {missing.map((c) => c.title.toLowerCase()).join(", ")}.</p>
              )}
              {Object.keys(swaps).length > 0 && <button type="button" className="link-quiet" onClick={() => setSwaps({})}>Undo my swaps</button>}

              <button className="button" disabled={chosen.length === 0} onClick={use}>{t("Use this plan")}</button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
