import { useState } from "react";
import { Link } from "react-router-dom";
import { api, useLoad } from "../../../src/api.js";
import { formatDate, toISODate } from "../../../src/format.js";
import { usePlan } from "../../../src/plan.jsx";
import { ErrorNote, Loading, PageHead, Summary } from "../components.jsx";
import { encodePlan, more } from "../extra.js";
import { useT } from "../i18n.jsx";

const SETUP = [
  { id: "vendor", title: "Done for me", hint: "Vendor sets up · labour added" },
  { id: "self", title: "I will do it myself", hint: "No labour charge" },
];

export default function Plan() {
  const plan = usePlan();
  const t = useT();
  const { event, items } = plan;
  const meta = useLoad(api.meta, []);
  // Number fields are kept as text while typing; the plan updates once they are valid.
  const [guests, setGuests] = useState(String(event.guests));
  const [tents, setTents] = useState(String(event.tents));
  const quote = useLoad(
    () => (items.length ? api.quote(event, items) : Promise.resolve(null)),
    [items.join(","), JSON.stringify(event)]
  );

  // Which chosen services are already taken on the event date, and the nearest date when all are free.
  const clash = useLoad(
    () => (items.length && event.date ? more.availability(event.date, items) : Promise.resolve(null)),
    [items.join(","), event.date]
  );
  const taken = clash.data?.unavailable ?? [];
  const takenNames = quote.data?.lines.filter((line) => taken.includes(line.id)).map((line) => line.vendor) ?? [];

  const guestsOk = Number.isInteger(Number(guests)) && Number(guests) >= 1 && Number(guests) <= 5000;
  const tentsOk = tents !== "" && Number.isInteger(Number(tents)) && Number(tents) >= 0 && Number(tents) <= 100;
  const dateOk = Boolean(event.date) && event.date >= toISODate(new Date());
  const formOk = guestsOk && tentsOk && dateOk && taken.length === 0;

  const changeGuests = (value) => {
    setGuests(value);
    const n = Number(value);
    if (Number.isInteger(n) && n >= 1 && n <= 5000) plan.setEvent({ guests: n });
  };
  const changeTents = (value) => {
    setTents(value);
    const n = Number(value);
    if (value !== "" && Number.isInteger(n) && n >= 0 && n <= 100) plan.setEvent({ tents: n });
  };

  if (!items.length) {
    return (
      <div className="page centre-page">
        <PageHead eyebrow="My plan" title={t("Your plan is empty")}>
          <p className="quiet">Add a venue, tents, catering or anything else, and we will add it all up into one grand total.</p>
        </PageHead>
        <Link to="/services" className="button fit">{t("Browse services")}</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHead eyebrow="Steps 2 and 3 of 4 · Your event" title={t("Tell us the details")}>
        <p className="quiet">{event.type} · {event.guests.toLocaleString("en-US")} guests · {dateOk ? formatDate(event.date) : "date to choose"} · {event.district}</p>
      </PageHead>

      <div className="split">
        <form className="form" onSubmit={(e) => e.preventDefault()} noValidate>
          <ErrorNote>{meta.error}</ErrorNote>
          {meta.loading && <Loading />}
          {meta.data && (
            <>
              <div className="fields">
                <label className="field">
                  <span className="caps">{t("Event type")}</span>
                  <select value={event.type} onChange={(e) => plan.setEvent({ type: e.target.value })}>
                    {meta.data.eventTypes.map((type) => <option key={type} value={type}>{t(type)}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span className="caps">{t("Number of guests")}</span>
                  <input type="number" inputMode="numeric" min="1" max="5000" value={guests} onChange={(e) => changeGuests(e.target.value)} aria-invalid={!guestsOk} />
                  {!guestsOk && <small className="field-error">From 1 to 5,000 guests.</small>}
                </label>
                <label className="field">
                  <span className="caps">{t("Event date")}</span>
                  <input type="date" min={toISODate(new Date())} value={event.date} onChange={(e) => plan.setEvent({ date: e.target.value })} aria-invalid={!dateOk} />
                  {!dateOk && <small className="field-error">Choose a date that has not passed.</small>}
                </label>
                <label className="field">
                  <span className="caps">{t("District")}</span>
                  <select value={event.district} onChange={(e) => plan.setEvent({ district: e.target.value })}>
                    {meta.data.districts.map((district) => <option key={district}>{district}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span className="caps">{t("Tents needed")}</span>
                  <input type="number" inputMode="numeric" min="0" max="100" value={tents} onChange={(e) => changeTents(e.target.value)} aria-invalid={!tentsOk} />
                  {!tentsOk && <small className="field-error">From 0 to 100 tents.</small>}
                </label>
                <label className="field">
                  <span className="caps">{t("Chairs")}</span>
                  <input value={`${guestsOk ? Number(guests) : "–"} · auto-matched`} readOnly tabIndex={-1} className="matched" />
                </label>
              </div>

              {taken.length > 0 && (
                <div className="error" role="alert">
                  <p><strong>Not free on {formatDate(event.date)}:</strong> {takenNames.join(", ") || "one of your services"}.</p>
                  <p>Pick another date, swap the service{clash.data.nextFree ? ", or move to the nearest date when everything is free." : "."}</p>
                  {clash.data.nextFree && <button type="button" className="chip" onClick={() => plan.setEvent({ date: clash.data.nextFree })}>Move to {formatDate(clash.data.nextFree)}</button>}
                </div>
              )}

              <fieldset className="choices">
                <legend className="caps">{t("Who handles setup?")}</legend>
                {SETUP.map((option) => (
                  <label key={option.id} className={`choice ${event.setup === option.id ? "on" : ""}`}>
                    <input type="radio" name="setup" checked={event.setup === option.id} onChange={() => plan.setEvent({ setup: option.id })} />
                    <span className="dot" aria-hidden="true" />
                    <span>{option.title}<small>{option.hint}</small></span>
                  </label>
                ))}
              </fieldset>
            </>
          )}
        </form>

        <aside className="summary" aria-label="My plan">
          <div className="block-head">
            <h2 className="caps">{t("One number. Every detail.")}</h2>
            <Link to="/services" className="link-quiet">{t("Add more")}</Link>
          </div>
          <ErrorNote>{quote.error}</ErrorNote>
          {quote.loading && !quote.data && <Loading label="Adding it all up" />}
          {quote.data && <Summary quote={quote.data} categories={meta.data?.categories} onRemove={plan.removeItem} />}
          {formOk && quote.data
            ? <Link to="/pay" className="button">{t("Pay now")}</Link>
            : <button className="button" disabled>{t("Pay now")}</button>}
          {quote.data && <Link to={`/share/${encodePlan({ event, items, host: plan.name })}`} className="button outline">Share and collect contributions</Link>}
        </aside>
      </div>
    </div>
  );
}
