import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, useLoad } from "../../../src/api.js";
import { formatDate, money, toISODate } from "../../../src/format.js";
import { daysUntil, localBookings, more } from "../extra.js";
import { useT } from "../i18n.jsx";
import { confetti, drumBeat } from "../party.js";
import { ErrorNote, Loading, PageHead } from "../components.jsx";

// What to do and when, counted back from the event date. `needs` limits a step to bookings with that kind of vendor.
const STEPS = [
  { before: 28, text: "Confirm the guest list and send invitations" },
  { before: 21, text: "Share the programme with your MC", needs: "MCs" },
  { before: 14, text: "Confirm the menu and final numbers with the caterer", needs: "Catering" },
  { before: 7, text: "Send directions to guests and vendors" },
  { before: 2, text: "Call each vendor to confirm arrival times" },
  { before: 1, text: "Tents and chairs go up", needs: "Tents" },
  { before: 1, text: "Sound check", needs: "Sound" },
  { before: 0, text: "Celebrate. Tukusanyukidde!" },
];

function dateBefore(iso, days) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() - days);
  return toISODate(date);
}

/** Loads a booking from the server, falling back to the copy kept in this browser. */
export function useBooking(id) {
  return useLoad(async () => {
    try {
      return await api.booking(id);
    } catch (error) {
      const saved = localBookings.get(id);
      if (saved) return saved;
      throw error;
    }
  }, [id]);
}

function Checklist({ booking }) {
  const key = `celebrate.checklist.${booking.id}`;
  const [done, setDone] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? [];
    } catch {
      return [];
    }
  });
  const kinds = booking.vendors.map((v) => v.category);
  const steps = useMemo(() => STEPS.filter((step) => !step.needs || kinds.includes(step.needs)), [kinds.join(",")]);
  const today = toISODate(new Date());

  const toggle = (text) => {
    const next = done.includes(text) ? done.filter((x) => x !== text) : [...done, text];
    setDone(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Ticks last for this visit only.
    }
  };

  return (
    <ol className="timeline">
      {steps.map((step) => {
        const due = dateBefore(booking.event.date, step.before);
        const ticked = done.includes(step.text);
        return (
          <li key={step.text} className={`${ticked ? "done" : ""} ${!ticked && due < today ? "late" : ""}`}>
            <label>
              <input type="checkbox" checked={ticked} onChange={() => toggle(step.text)} />
              <span>{step.text}<small>{step.before === 0 ? "On the day" : `${formatDate(due)} · ${step.before} ${step.before === 1 ? "day" : "days"} before`}{!ticked && due < today ? " · overdue" : ""}</small></span>
            </label>
          </li>
        );
      })}
    </ol>
  );
}

/** The conversation with one vendor. Contact stays on the site: numbers and emails are removed on the way. */
function Thread({ booking, serviceId, vendor, messages, onSent }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const mine = messages.filter((message) => message.serviceId === serviceId);

  const send = async (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      onSent(await more.sendMessage(booking.id, serviceId, text));
      setText("");
    } catch (err) {
      setError(err.message);
    }
    setSending(false);
  };

  return (
    <div className="thread">
      {mine.length === 0 && <p className="quiet">Ask {vendor} anything about the day: timings, colours, the menu, access to the venue.</p>}
      <ol aria-label={`Messages with ${vendor}`}>
        {mine.map((message) => (
          <li key={message.at + message.from} className={`bubble ${message.from}`}>
            <p>{message.text}</p>
            <small>{message.from === "customer" ? "You" : message.from === "vendor" ? vendor : "Celebrate"} · {new Date(message.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}{message.hidden ? " · contact details removed" : ""}</small>
          </li>
        ))}
      </ol>
      <form className="thread-form" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={`Message ${vendor}`} aria-label={`Message ${vendor}`} />
        <button className="button fit" disabled={sending || !text.trim()}>Send</button>
      </form>
      <ErrorNote>{error}</ErrorNote>
      <p className="quiet">Phone numbers and email addresses are not shared. Keep everything here so there is a record.</p>
    </div>
  );
}

/** One to five stars and a few words about a vendor, once the event is over or paid for in full. */
function ReviewForm({ booking, serviceId, vendor, onDone }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      onDone(await more.review(booking.id, { serviceId, rating, text }));
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <form className="thread" onSubmit={submit}>
      <fieldset className="stars">
        <legend className="quiet">How was {vendor}?</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} className={n <= rating ? "on" : ""} aria-pressed={n === rating} aria-label={`${n} ${n === 1 ? "star" : "stars"}`} onClick={() => setRating(n)}>★</button>
        ))}
      </fieldset>
      <div className="thread-form">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={400} placeholder="A few words for other customers (optional)" aria-label="Your review" />
        <button className="button fit" disabled={!rating || sending}>Post</button>
      </div>
      <ErrorNote>{error}</ErrorNote>
      <p className="quiet">Your first name and review are shown on the vendor's page.</p>
    </form>
  );
}

/** Paying what is left, on the day or before it. */
function Balance({ booking, methods, days, onPaid }) {
  const [open, setOpen] = useState(days <= 0);
  const [method, setMethod] = useState("mtn");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const chosen = methods?.find((m) => m.id === method);

  const pay = async (e) => {
    e.preventDefault();
    setError("");
    setPaying(true);
    try {
      onPaid(await more.payBalance(booking.id, { method, phone }));
    } catch (err) {
      setError(err.message);
      setPaying(false);
    }
  };

  return (
    <section className="balance">
      <div>
        <p className="caps">Balance due on the day</p>
        <p className="grand-total">{money(booking.balance)}</p>
        <p className="quiet">You have paid the deposit of {money(booking.paid)}. Pay the rest on {formatDate(booking.event.date)}, or earlier if you prefer.</p>
      </div>
      {!open && <button className="button outline" onClick={() => setOpen(true)}>Pay the balance now</button>}
      {open && (
        <form className="form" onSubmit={pay} noValidate>
          <label className="field">
            <span className="caps">How to pay</span>
            <select value={method} onChange={(e) => { setMethod(e.target.value); setError(""); }}>
              {(methods ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          {chosen?.needsPhone && (
            <label className="field">
              <span className="caps">Mobile money number</span>
              <input type="tel" inputMode="tel" autoComplete="tel" placeholder="0770 000 000" value={phone} onChange={(e) => { setPhone(e.target.value); setError(""); }} />
            </label>
          )}
          <ErrorNote>{error}</ErrorNote>
          <button className="button" disabled={paying || !methods}>{paying ? "Confirming…" : `Pay ${money(booking.balance)}`}</button>
        </form>
      )}
    </section>
  );
}

export default function Receipt() {
  const { id } = useParams();
  const t = useT();
  const { state } = useLocation();
  const loaded = useBooking(id);
  const { error, loading } = loaded;
  const meta = useLoad(api.meta, []);
  // A booking changes when the balance is paid; `settled` holds the newer copy.
  const [settled, setSettled] = useState(null);
  const booking = settled?.id === id ? settled : loaded.data;
  const thread = useLoad(() => more.messages(id).catch(() => []), [id]);
  const [posted, setPosted] = useState(null);
  const messages = posted ?? thread.data ?? [];
  const [talkingTo, setTalkingTo] = useState("");
  const [reviewing, setReviewing] = useState("");
  // Vendors this booking has reviewed, remembered on this device so the form is not offered twice.
  const reviewKey = `celebrate.reviewed.${id}`;
  const [reviewed, setReviewed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(reviewKey)) ?? [];
    } catch {
      return [];
    }
  });
  const markReviewed = (serviceId) => {
    const next = [...reviewed, serviceId];
    setReviewed(next);
    setReviewing("");
    try {
      localStorage.setItem(reviewKey, JSON.stringify(next));
    } catch {
      // The server still refuses a second review.
    }
  };
  const paidUp = (next) => {
    setSettled(next);
    localBookings.save(next);
  };
  const [making, setMaking] = useState(false);
  const [pdfError, setPdfError] = useState("");

  // Only straight after paying, not every time the receipt is opened again.
  useEffect(() => {
    if (state?.fresh && booking) {
      confetti();
      drumBeat();
      window.history.replaceState({}, "");
    }
  }, [booking?.id]);

  const download = async () => {
    setMaking(true);
    setPdfError("");
    try {
      const { downloadReceipt } = await import("../receiptPdf.js");
      await downloadReceipt(booking);
    } catch {
      setPdfError("We could not make the PDF. Check your connection and try again.");
    }
    setMaking(false);
  };

  const days = booking ? daysUntil(booking.event.date) : null;
  const canReview = booking && (!booking.balance || days <= 0);

  return (
    <div className="page centre-page">
      <PageHead eyebrow="Your event is booked" title="Webale nnyo!">
        <p className="quiet">{t("Thank you")}{booking?.customer ? `, ${booking.customer}` : ""}. Your vendors have been told, and you can follow them here.</p>
      </PageHead>
      <ErrorNote>{error}</ErrorNote>
      {loading && <Loading />}
      {booking && (
        <div className="receipt">
          <div className="countdown" role="status">
            <p className="countdown-number">{days > 0 ? days : days === 0 ? "Today" : "Done"}</p>
            <p>{days > 0 ? `${days === 1 ? "day" : t("days to go")}${days === 1 ? " to go" : ""}` : days === 0 ? "Enjoy every minute" : "We hope it was wonderful"}<small>{booking.event.type} · {formatDate(booking.event.date)} · {booking.event.district}</small></p>
          </div>

          <dl className="sums ruled">
            <div><dt>E-receipt no.</dt><dd>{booking.id}</dd></div>
            <div><dt>Grand total</dt><dd>{money(booking.total ?? booking.paid)}</dd></div>
            <div><dt>{booking.balance ? "Deposit paid" : "Paid in full"}</dt><dd>{money(booking.paid)}</dd></div>
            <div><dt>Method</dt><dd>{booking.method}</dd></div>
            <div><dt>Guests</dt><dd>{booking.event.guests.toLocaleString("en-US")}</dd></div>
          </dl>

          {booking.balance > 0 && <Balance booking={booking} methods={meta.data?.paymentMethods} days={days} onPaid={paidUp} />}

          <button className="button" onClick={download} disabled={making}>{making ? "Making your receipt…" : "Download PDF receipt"}</button>
          <ErrorNote>{pdfError}</ErrorNote>
          <p className="quiet centre">The PDF carries a QR code. A vendor scans it on the day to check the booking.</p>

          <h2 className="caps">{t("Track your vendors")}</h2>
          {!canReview && <p className="quiet">You can review each vendor once the event has happened or the balance is paid.</p>}
          <ul className="lines">
            {booking.vendors.map((v, index) => {
              // Older bookings did not record which service each vendor was for; the plan's lines are in the same order.
              const serviceId = v.serviceId ?? booking.quote.lines[index]?.id;
              const open = talkingTo === serviceId;
              const count = messages.filter((m) => m.serviceId === serviceId && m.from === "customer").length;
              return (
                <li key={`${v.category}-${v.vendor}`} className="vendor-row">
                  <div className="vendor-head">
                    <p>{t(v.category)} <span className="quiet">· {v.vendor}</span></p>
                    <span className={`state ${v.status === "Confirmed" ? "confirmed" : v.status === "Declined" ? "off" : "waiting"}`}>{v.status}</span>
                  </div>
                  {v.status === "Declined" && <p className="field-error">{v.vendor} cannot take this booking. Message them, or contact Celebrate to arrange a replacement.</p>}
                  <div className="vendor-actions">
                    <button className="chip" aria-expanded={open} onClick={() => setTalkingTo(open ? "" : serviceId)}>{open ? "Close messages" : count ? `Messages (${count})` : "Message"}</button>
                    <Link className="chip" to={`/service/${serviceId}#visit`}>Book a visit</Link>
                    {canReview && !reviewed.includes(serviceId) && <button className="chip" aria-expanded={reviewing === serviceId} onClick={() => setReviewing(reviewing === serviceId ? "" : serviceId)}>Leave a review</button>}
                    {reviewed.includes(serviceId) && <span className="quiet">Reviewed. Thank you.</span>}
                  </div>
                  {open && <Thread booking={booking} serviceId={serviceId} vendor={v.vendor} messages={messages} onSent={setPosted} />}
                  {reviewing === serviceId && <ReviewForm booking={booking} serviceId={serviceId} vendor={v.vendor} onDone={() => markReviewed(serviceId)} />}
                </li>
              );
            })}
          </ul>

          <h2 className="caps">Your countdown checklist</h2>
          <Checklist booking={booking} />
        </div>
      )}
      <Link to="/" className="link-caps">{t("Back to home")}</Link>
    </div>
  );
}
