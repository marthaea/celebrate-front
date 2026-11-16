import { useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { api, useLoad } from "../api.js";
import { formatDate, money } from "../format.js";
import { BackLink, BottomNav, ErrorNote, Loading, Strip } from "../components/ui.jsx";
import { usePlan } from "../plan.jsx";

export default function Total() {
  const plan = usePlan();
  const { event, items } = plan;
  const [editing, setEditing] = useState(false);
  const meta = useLoad(api.meta, []);
  const quote = useLoad(
    () => (items.length ? api.quote(event, items) : Promise.resolve(null)),
    [items.join(","), JSON.stringify(event)]
  );
  const titleFor = (id) => meta.data?.categories.find((c) => c.id === id)?.title ?? "";

  if (!items.length) {
    return (
      <main className="screen with-nav">
        <div className="body light-head">
          <p className="eyebrow brown">My plan</p>
          <h1 className="title">Your plan is empty</h1>
          <p className="meta">Add a venue, tents, catering or anything else, and we will add it all up into one grand total.</p>
          <Link to="/browse" className="btn btn-primary">Browse services</Link>
        </div>
        <BottomNav />
      </main>
    );
  }

  const q = quote.data;
  return (
    <main className="screen total">
      <div className="body light-head">
        <BackLink to="/details" />
        <p className="eyebrow brown">Step 3 of 4 · My plan</p>
        <h1 className="title">One number. Every detail.</h1>
        <p className="meta">{event.type} · {event.guests.toLocaleString("en-US")} guests · {formatDate(event.date)} · {event.district}</p>

        <ErrorNote>{quote.error}</ErrorNote>
        {quote.loading && !q && <Loading label="Adding it all up…" />}
        {q && (
          <>
            <ul className="card lines">
              {q.lines.map((line) => (
                <li key={line.id}>
                  <div>
                    <strong>{titleFor(line.category)}</strong>
                    <small>{line.detail} · {line.vendor}</small>
                  </div>
                  <strong>{money(line.amount)}</strong>
                  {editing && (
                    <button className="remove" onClick={() => plan.removeItem(line.id)} aria-label={`Remove ${line.name}`}>
                      <X size={16} aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <dl className="sums">
              <div><dt>Item cost</dt><dd>{money(q.itemCost)}</dd></div>
              <div><dt>Labour and setup</dt><dd>{money(q.labour)}</dd></div>
              <div><dt>Transport</dt><dd>{money(q.transport)}</dd></div>
              <div><dt>Platform fee ({Math.round(q.feeRate * 100)}%)</dt><dd>{money(q.platformFee)}</dd></div>
            </dl>

            <p className="edit-row">
              <button className="text-link" onClick={() => setEditing(!editing)}>{editing ? "Done editing" : "Edit my plan"}</button>
              {editing && <Link to="/browse" className="text-link">Add more services</Link>}
            </p>
          </>
        )}
      </div>
      {q && (
        <footer className="grand">
          <Strip />
          <div className="grand-body">
            <p className="eyebrow teal">Grand total</p>
            <p className="grand-total">{money(q.total)}</p>
            <p className="grand-note">No hidden costs. This is all you pay.</p>
            <Link to="/pay" className="btn btn-primary">Pay now</Link>
          </div>
        </footer>
      )}
    </main>
  );
}
