import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, useLoad } from "../api.js";
import { toISODate } from "../format.js";
import { BackLink, ErrorNote, Loading, Strip } from "../components/ui.jsx";
import { usePlan } from "../plan.jsx";

const SETUP = [
  { id: "vendor", title: "Done for me", hint: "Vendor sets up · labour added" },
  { id: "self", title: "I will do it myself", hint: "No labour charge" },
];

export default function Details() {
  const plan = usePlan();
  const navigate = useNavigate();
  const meta = useLoad(api.meta, []);
  const { event } = plan;
  // Number fields are kept as text while typing so they can be cleared.
  const [guests, setGuests] = useState(String(event.guests));
  const [tents, setTents] = useState(String(event.tents));
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const g = Number(guests);
    const t = Number(tents);
    if (!Number.isInteger(g) || g < 1 || g > 5000) return setError("Enter the number of guests, from 1 to 5,000.");
    if (!Number.isInteger(t) || t < 0 || t > 100) return setError("Enter the number of tents, from 0 to 100.");
    if (!event.date || event.date < toISODate(new Date())) return setError("Choose an event date that has not passed.");
    plan.setEvent({ guests: g, tents: t });
    navigate("/plan");
  };

  return (
    <main className="screen">
      <header className="head">
        <BackLink to="/browse" className="teal" />
        <p className="eyebrow">Step 2 of 4 · Your event</p>
        <h1>Tell us the details</h1>
      </header>
      <Strip />
      <form className="body" onSubmit={submit} noValidate>
        <ErrorNote>{meta.error}</ErrorNote>
        {meta.loading && <Loading />}
        {meta.data && (
          <>
            <div className="fields">
              <label className="field">
                <span>Event type</span>
                <select value={event.type} onChange={(e) => plan.setEvent({ type: e.target.value })}>
                  {meta.data.eventTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Number of guests</span>
                <input type="number" inputMode="numeric" min="1" max="5000" value={guests} onChange={(e) => setGuests(e.target.value)} />
              </label>
              <label className="field">
                <span>Event date</span>
                <input type="date" min={toISODate(new Date())} value={event.date} onChange={(e) => plan.setEvent({ date: e.target.value })} />
              </label>
              <label className="field">
                <span>District</span>
                <select value={event.district} onChange={(e) => plan.setEvent({ district: e.target.value })}>
                  {meta.data.districts.map((district) => <option key={district}>{district}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Tents needed</span>
                <input type="number" inputMode="numeric" min="0" max="100" value={tents} onChange={(e) => setTents(e.target.value)} />
              </label>
              <label className="field">
                <span>Chairs</span>
                <input value={`${Number(guests) > 0 ? Number(guests) : "–"} · auto-matched`} readOnly tabIndex={-1} className="matched" />
              </label>
            </div>

            <fieldset className="options">
              <legend>Who handles setup?</legend>
              {SETUP.map((option) => (
                <label key={option.id} className={`option ${event.setup === option.id ? "on" : ""}`}>
                  <input type="radio" name="setup" checked={event.setup === option.id} onChange={() => plan.setEvent({ setup: option.id })} />
                  <span className="radio" aria-hidden="true" />
                  <span><strong>{option.title}</strong><small>{option.hint}</small></span>
                </label>
              ))}
            </fieldset>

            <div className="spacer" />
            <ErrorNote>{error}</ErrorNote>
            <button className="btn btn-primary">See my grand total</button>
          </>
        )}
      </form>
    </main>
  );
}
