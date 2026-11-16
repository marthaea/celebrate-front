import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import { api, useLoad } from "../../../src/api.js";
import { formatDate, money } from "../../../src/format.js";
import { daysUntil } from "../extra.js";
import { session, SignedOut, staff } from "../staff.js";
import { BusyCalendar, ErrorNote, Loading, StaffSignIn } from "../components.jsx";

const TABS = ["Bookings", "Appointments", "Calendar", "Reviews"];
const stateClass = (status) => (status === "Confirmed" ? "confirmed" : status === "Declined" || status === "Cancelled" ? "off" : "waiting");

/** The vendor's side of a conversation with one customer. */
function Reply({ call, booking, line, messages, onChange }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const mine = messages.filter((m) => m.serviceId === line.id && m.from !== "system");

  const send = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await call(`/vendor/bookings/${booking.id}/messages`, { serviceId: line.id, text });
      setText("");
      onChange();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="thread">
      {mine.length === 0 && <p className="quiet">No messages yet. You can write first.</p>}
      <ol aria-label="Messages">
        {mine.map((m) => (
          <li key={m.at + m.from} className={`bubble ${m.from === "vendor" ? "customer" : "vendor"}`}>
            <p>{m.text}</p>
            <small>{m.from === "vendor" ? "You" : booking.customer || "Customer"} · {new Date(m.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{m.hidden ? " · contact details removed" : ""}</small>
          </li>
        ))}
      </ol>
      <form className="thread-form" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Write a reply" aria-label="Write a reply" />
        <button className="button fit" disabled={!text.trim()}>Send</button>
      </form>
      <ErrorNote>{error}</ErrorNote>
    </div>
  );
}

function Desk({ who, onSignOut }) {
  const call = staff.as(who);
  const [tab, setTab] = useState("Bookings");
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [open, setOpen] = useState("");
  const { data, error: loadError, loading } = useLoad(() => call("/vendor/overview"), [version]);
  const refresh = () => setVersion((v) => v + 1);

  useEffect(() => {
    if (loadError && /sign in|not active/i.test(loadError)) onSignOut();
  }, [loadError]);

  // Runs a change, then reloads; shows whatever went wrong.
  const act = async (path, body) => {
    setError("");
    try {
      await call(path, body);
      refresh();
    } catch (err) {
      if (err instanceof SignedOut) onSignOut();
      else setError(err.message);
    }
  };

  if (loading && !data) return <div className="page"><Loading /></div>;
  if (!data) return <div className="page"><ErrorNote>{loadError}</ErrorNote></div>;

  const lines = data.bookings.flatMap((b) => b.lines.map((line) => ({ booking: b, line })));
  const waiting = lines.filter((x) => x.line.status === "Waiting").length;
  const visitsWaiting = data.visits.filter((v) => v.status === "Requested").length;
  const owed = lines.filter((x) => x.line.status !== "Declined" && !x.line.paidOut).reduce((sum, x) => sum + x.line.due, 0);
  const rating = data.reviews.length ? (data.reviews.reduce((sum, r) => sum + r.rating, 0) / data.reviews.length).toFixed(1) : "–";
  const eventDays = lines.filter((x) => x.line.status !== "Declined").map((x) => x.booking.event.date);
  const counts = { Bookings: waiting, Appointments: visitsWaiting };

  return (
    <div className="page desk">
      <header className="desk-head">
        <div>
          <p className="caps">Vendor workspace</p>
          <h1>{data.vendor.name} {data.vendor.verified && <span className="tag inline"><BadgeCheck size={14} aria-hidden="true" /> Verified</span>}</h1>
          <p className="quiet">{data.services.length} {data.services.length === 1 ? "service" : "services"} listed · {data.vendor.district} · Your account is overseen by the Celebrate team.</p>
        </div>
        <button className="button fit outline" onClick={onSignOut}>Sign out</button>
      </header>

      <div className="tiles">
        <div><p className="tile-number">{waiting}</p><p>bookings to answer</p></div>
        <div><p className="tile-number">{visitsWaiting}</p><p>appointments to answer</p></div>
        <div><p className="tile-number">{money(owed)}</p><p>to be paid to you</p></div>
        <div><p className="tile-number">★ {rating}</p><p>from {data.reviews.length} {data.reviews.length === 1 ? "review" : "reviews"} on Celebrate</p></div>
      </div>

      <nav className="toolbar-row" aria-label="Sections">
        {TABS.map((name) => (
          <button key={name} className={tab === name ? "active" : ""} aria-pressed={tab === name} onClick={() => setTab(name)}>
            {name}{counts[name] ? ` (${counts[name]})` : ""}
          </button>
        ))}
      </nav>
      <ErrorNote>{error}</ErrorNote>

      {tab === "Bookings" && (
        <section className="desk-list">
          {data.services.length === 0 && <p className="aside-note">You have no services listed yet. The Celebrate team adds your listings once your business has been checked.</p>}
          {lines.length === 0 && <p className="quiet">No bookings yet. They appear here as soon as a customer pays a deposit.</p>}
          {lines.map(({ booking, line }) => {
            const key = booking.id + line.id;
            const days = daysUntil(booking.event.date);
            const unread = (data.messages[booking.id] ?? []).filter((m) => m.serviceId === line.id && m.from === "customer").length;
            return (
              <article key={key} className="desk-card">
                <div className="desk-card-head">
                  <div>
                    <h2>{line.name}</h2>
                    <p>{booking.event.type} · {formatDate(booking.event.date)} · {booking.event.district} · {booking.event.guests.toLocaleString("en-US")} guests</p>
                    <p className="quiet">{booking.customer || "Customer"} · {booking.id} · {line.detail}{days >= 0 ? ` · ${days} days to go` : " · past"}</p>
                  </div>
                  <span className={`state ${stateClass(line.status)}`}>{line.status}</span>
                </div>
                <p className="desk-money">
                  <strong>{money(line.due)}</strong> to you · customer has paid {booking.paidInFull ? "in full" : "the deposit"} · {line.paidOut ? "paid out to you" : "payout pending"}
                </p>
                <div className="vendor-actions">
                  {line.status !== "Confirmed" && <button className="chip on" onClick={() => act(`/vendor/bookings/${booking.id}/status`, { serviceId: line.id, status: "Confirmed" })}>Confirm</button>}
                  {line.status !== "Declined" && <button className="chip" onClick={() => act(`/vendor/bookings/${booking.id}/status`, { serviceId: line.id, status: "Declined" })}>Decline</button>}
                  <button className="chip" aria-expanded={open === key} onClick={() => setOpen(open === key ? "" : key)}>{open === key ? "Close messages" : `Messages${unread ? ` (${unread})` : ""}`}</button>
                </div>
                {open === key && <Reply call={call} booking={booking} line={line} messages={data.messages[booking.id] ?? []} onChange={refresh} />}
              </article>
            );
          })}
        </section>
      )}

      {tab === "Appointments" && (
        <section className="desk-list">
          {data.visits.length === 0 && <p className="quiet">No appointment requests yet.</p>}
          {[...data.visits].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map((visit) => (
            <article key={visit.id} className="desk-card">
              <div className="desk-card-head">
                <div>
                  <h2>{visit.kind} · {formatDate(visit.date)} at {visit.time}</h2>
                  <p className="quiet">{visit.name} · {visit.service} · {visit.id}</p>
                </div>
                <span className={`state ${stateClass(visit.status)}`}>{visit.status}</span>
              </div>
              {visit.status !== "Cancelled" && (
                <div className="vendor-actions">
                  {visit.status !== "Confirmed" && <button className="chip on" onClick={() => act(`/vendor/visits/${visit.id}`, { status: "Confirmed" })}>Approve</button>}
                  {visit.status !== "Declined" && <button className="chip" onClick={() => act(`/vendor/visits/${visit.id}`, { status: "Declined" })}>Decline</button>}
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      {tab === "Calendar" && (
        <section className="desk-list">
          <p>Tap a day to mark it <strong>busy</strong>. Customers cannot book you or ask for an appointment on busy days. Tap again to free it.</p>
          <BusyCalendar busy={data.busy} events={eventDays} onToggle={(date, busy) => act("/vendor/busy", { date, busy })} />
          {data.busy.length > 0 && <p className="quiet">Busy days: {data.busy.map(formatDate).join(" · ")}</p>}
        </section>
      )}

      {tab === "Reviews" && (
        <section className="desk-list">
          {data.reviews.length === 0 && <p className="quiet">No reviews yet. Customers can review you once their event has happened or they have paid in full.</p>}
          {[...data.reviews].reverse().map((review) => (
            <article key={review.id} className="desk-card">
              <h2>{"★".repeat(review.rating)}<span className="quiet">{"★".repeat(5 - review.rating)}</span> · {review.service}</h2>
              {review.text && <p>“{review.text}”</p>}
              <p className="quiet">{review.name} · {review.eventType} · {formatDate(review.at.slice(0, 10))}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

export default function Vendor() {
  const [who, setWho] = useState(() => session.get("vendor"));
  const meta = useLoad(api.meta, []);
  const signOut = () => {
    session.clear();
    setWho(null);
  };

  if (who) return <Desk who={who} onSignOut={signOut} />;
  return (
    <StaffSignIn
      eyebrow="For vendors" title="Vendor sign in" askName turnstile={meta.data?.turnstile}
      intro="Answer bookings and appointments, keep your calendar, and talk to your customers."
      demoHint={meta.data?.demo && `Sign in as any listed business, for example “Mama's Kitchen”, with the password ${meta.data.demo.vendor}`}
      onSubmit={async ({ name, password, token }) => {
        const result = await staff.login({ role: "vendor", name, password, token });
        session.set(result);
        setWho(result);
      }}
    >
      <p className="quiet">Not listed yet? <Link to="/vendors" className="link-quiet">Apply to list your business</Link></p>
    </StaffSignIn>
  );
}
