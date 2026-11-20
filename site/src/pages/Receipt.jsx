import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { api, useLoad } from "../../../src/api.js";
import { formatDate, money, toISODate } from "../../../src/format.js";
import { daysUntil, localBookings, more, Offline } from "../extra.js";
import { useAccount } from "../account.jsx";
import { confetti, drumBeat } from "../party.js";
import { ErrorNote, FileButton, Loading, PageHead } from "../components.jsx";
import { MethodPicker, PaymentWait } from "../payment.jsx";

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

/** Loads a booking from the server, or, when offline, the copy kept in this browser. */
export function useBooking(id) {
  const { customer } = useAccount();
  return useLoad(async () => {
    try {
      return await more.booking(id);
    } catch (error) {
      const saved = error instanceof Offline && localBookings.get(id);
      if (saved) return saved;
      throw error;
    }
  }, [id, customer?.id]);
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

const when = (iso) => new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const hoursLater = (iso, hours) => new Date(Date.parse(iso) + hours * 3600000).toISOString();

/** D: paying what is left, on the day or before it, through the same phone prompt. */
function Balance({ booking, meta, days, onPaid }) {
  const [open, setOpen] = useState(days <= 0);
  const [how, setHow] = useState({ method: "mtn", phone: "" });
  const [payment, setPayment] = useState(() => booking.payments?.find((p) => p.kind === "balance" && p.status === "pending") ?? null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const pay = async (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      setPayment(await more.pay(booking.id, "balance", how));
    } catch (err) {
      setError(err.message);
    }
    setSending(false);
  };
  const finished = (settled) => {
    setPayment(null);
    if (settled.status === "succeeded") more.booking(booking.id).then(onPaid);
    else setError(`${settled.reason} Nothing has been taken. Try again or choose another method.`);
  };

  return (
    <section className="balance">
      <div>
        <p className="caps">Balance due on the day</p>
        <p className="grand-total">{money(booking.balance)}</p>
        <p className="quiet">You have paid {money(booking.paid)}. Pay the rest on {formatDate(booking.event.date)}, or earlier if you prefer.</p>
      </div>
      {payment ? (
        <PaymentWait payment={payment} simulated={meta?.simulated.payments} onDone={finished} />
      ) : !open ? (
        <button className="button outline" onClick={() => setOpen(true)}>Pay the balance now</button>
      ) : (
        <form className="form" onSubmit={pay} noValidate>
          <MethodPicker methods={meta?.paymentMethods} value={how} onChange={setHow} />
          <ErrorNote>{error}</ErrorNote>
          <button className="button" disabled={sending || !meta}>{sending ? "Sending the prompt…" : `Pay ${money(booking.balance)}`}</button>
        </form>
      )}
    </section>
  );
}

/** F4: reporting a problem with a vendor after the event, with photos or documents as evidence. */
function ComplaintForm({ booking, line, onDone }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      await more.complain(booking.id, line.serviceId, { text, evidence: files.map((f) => f.id) });
      onDone();
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <form className="thread" onSubmit={send}>
      <label className="field">
        <span className="caps">What went wrong with {line.vendor}?</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={4} placeholder="e.g. The food arrived two hours late and there were 50 plates short." required />
      </label>
      <div className="files">
        {files.map((file) => <span key={file.id} className="chip on">{file.name}</span>)}
        {files.length < 6 && <FileButton label="Add a photo or document" purpose="evidence" multiple upload={more.upload} onAdded={(file) => setFiles((list) => [...list, file])} onError={setError} />}
      </div>
      <ErrorNote>{error}</ErrorNote>
      <button className="button fit" disabled={sending || text.trim().length < 10}>{sending ? "Sending…" : "Report the problem"}</button>
      <p className="quiet">{line.vendor} is not paid while we look into it. They see what you write and can give their side. We decide within 3 working days.</p>
    </form>
  );
}

/** F1, F2: cancelling the whole booking, with the refund worked out first. */
function CancelBooking({ booking, onDone }) {
  const [open, setOpen] = useState(false);
  const preview = useLoad(() => (open ? more.cancellation(booking.id) : Promise.resolve(null)), [open]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const cancel = async (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      onDone(await more.cancel(booking.id, reason));
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  if (!open) return <button className="link-quiet" onClick={() => setOpen(true)}>Cancel this booking</button>;
  return (
    <form className="cancel-box" onSubmit={cancel}>
      <h2 className="caps">Cancel this booking</h2>
      {preview.loading && <Loading label="Working out your refund" />}
      {preview.data && (
        <>
          <p>Your event is in <strong>{preview.data.daysBefore} {preview.data.daysBefore === 1 ? "day" : "days"}</strong>. {preview.data.rule.text}.</p>
          <p className="grand-total">{money(preview.data.refund)}</p>
          <p className="quiet">comes back to your {booking.method}, of the {money(preview.data.paid)} you have paid. Every vendor is told and the date is freed.</p>
          <details>
            <summary className="link-quiet">The cancellation rule</summary>
            <ul className="rules">{preview.data.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
          </details>
        </>
      )}
      <label className="field">
        <span className="caps">Why are you cancelling?</span>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} required />
      </label>
      <ErrorNote>{error}</ErrorNote>
      <div className="vendor-actions">
        <button className="button fit" disabled={sending || !reason.trim()}>{sending ? "Cancelling…" : "Cancel the booking"}</button>
        <button type="button" className="button fit outline" onClick={() => setOpen(false)}>Keep it</button>
      </div>
    </form>
  );
}

/** E and F for one vendor: where things stand, in a sentence. */
function LineStatus({ booking, line, rules }) {
  const cases = (booking.cases ?? []).filter((c) => c.serviceId === line.serviceId);
  const cancelCase = cases.find((c) => c.type === "vendor-cancel");
  const complaint = cases.filter((c) => c.type === "complaint").at(-1);
  const notes = [];
  if (line.status === "Waiting") {
    notes.push(line.respondBy && line.respondBy < new Date().toISOString()
      ? `${line.vendor} has not answered in time. Celebrate is following up and will offer you a replacement or a refund.`
      : `Waiting for ${line.vendor} to accept${line.respondBy ? `, by ${when(line.respondBy)}` : ""}.`);
  }
  if (["Declined", "Cancelled", "Replaced", "Refunded"].includes(line.status) && line.cancelled?.by !== "customer") {
    notes.push(`${line.vendor} cannot do it${line.cancelled?.reason ? `: “${line.cancelled.reason}”` : "."}`);
    if (cancelCase?.status === "open") notes.push(`Celebrate will offer you a replacement or a full refund for it, by ${when(cancelCase.dueBy)}.`);
    if (cancelCase?.resolution?.action === "replacement") notes.push(`Replaced by ${cancelCase.resolution.vendor}, at no extra cost to you.`);
    if (cancelCase?.resolution?.action === "refund") notes.push(cancelCase.resolution.sentBack ? `${money(cancelCase.resolution.sentBack)} refunded to your ${booking.method}, and the rest taken off your balance.` : `Taken off your booking: your total went down by ${money(cancelCase.resolution.amount)}.`);
  }
  if (line.replaces) notes.push("Your replacement vendor.");
  if (line.status === "Confirmed" && !line.deliveredAt) notes.push(`${line.vendor} has accepted.`);
  if (line.deliveredAt && !line.confirmedAt && !line.hold) notes.push(`Marked delivered ${when(line.deliveredAt)}. Confirm it or report a problem by ${when(hoursLater(line.deliveredAt, rules?.confirmHours ?? 48))}; after that it confirms itself.`);
  if (line.confirmedAt && !complaint) notes.push(line.autoConfirmed ? "Delivery confirmed automatically, 48 hours after it was marked delivered." : "You confirmed delivery. Thank you.");
  if (complaint?.status === "open") notes.push(`Your report ${complaint.id} is being reviewed. Celebrate decides by ${when(complaint.dueBy)}.${complaint.response ? ` ${line.vendor} has given their side.` : ""}`);
  if (complaint?.status === "resolved") notes.push(complaint.resolution.amount ? `Your report is settled: ${money(complaint.resolution.amount)} refunded to your ${booking.method}.` : `Your report is settled with no refund.${complaint.resolution.note ? ` “${complaint.resolution.note}”` : ""}`);
  return notes.length ? <p className="line-state">{notes.join(" ")}</p> : null;
}

const LABEL = { Waiting: "Waiting", Confirmed: "Accepted", Declined: "Declined", Cancelled: "Cancelled", Replaced: "Replaced", Refunded: "Refunded" };
const stateClass = (status) => (status === "Confirmed" ? "confirmed" : ["Declined", "Cancelled", "Replaced", "Refunded"].includes(status) ? "off" : "waiting");

export default function Receipt() {
  const { id } = useParams();
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
  const [complaining, setComplaining] = useState("");
  const [version, setVersion] = useState(0);
  const refresh = () => more.booking(id).then(paidUp).then(() => setVersion((n) => n + 1));
  const confirm = async (serviceId) => {
    try {
      await more.confirmDelivery(id, serviceId);
      await refresh();
    } catch (err) {
      setPdfError(err.message);
    }
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
  const canReview = booking && booking.status === "active" && (!booking.balance || days <= 0);
  const cancelled = booking?.status === "cancelled";
  const refunded = (booking?.refunds ?? []).reduce((sum, r) => sum + r.amount, 0);
  const rules = meta.data?.rules;
  void version;

  // A booking still waiting for its payment belongs on the payment page.
  if (booking?.status === "awaiting_payment") return <Navigate to={`/pay/${booking.id}`} replace />;

  return (
    <div className="page centre-page">
      <PageHead eyebrow={cancelled ? "Cancelled" : "Your event is booked"} title={cancelled ? "This booking is cancelled" : "Webale nnyo!"}>
        <p className="quiet">{cancelled
          ? `Cancelled on ${formatDate(booking.cancellation.at.slice(0, 10))}: “${booking.cancellation.reason}”. ${booking.cancellation.refund ? `${money(booking.cancellation.refund)} refunded to your ${booking.method}.` : "No refund was due under the cancellation rule."}`
          : `Thank you${booking?.customer ? `, ${booking.customer}` : ""}. Your vendors have been told, and you can follow them here.`}</p>
      </PageHead>
      <ErrorNote>{error}</ErrorNote>
      {error && /another account|sign in/i.test(error) && <Link to={`/account?next=/receipt/${id}`} className="button fit">Log in</Link>}
      {loading && <Loading />}
      {booking && (
        <div className="receipt">
          {!cancelled && <div className="countdown" role="status">
            <p className="countdown-number">{days > 0 ? days : days === 0 ? "Today" : "Done"}</p>
            <p>{days > 0 ? `${days === 1 ? "day" : "days to go"}${days === 1 ? " to go" : ""}` : days === 0 ? "Enjoy every minute" : "We hope it was wonderful"}<small>{booking.event.type} · {formatDate(booking.event.date)} · {booking.event.district}{booking.event.location ? ` · ${booking.event.location}` : ""}</small></p>
          </div>}

          <dl className="sums ruled">
            <div><dt>E-receipt no.</dt><dd>{booking.id}</dd></div>
            <div><dt>Grand total</dt><dd>{money(booking.total ?? booking.paid)}</dd></div>
            <div><dt>{booking.balance ? "Paid so far" : "Paid in full"}</dt><dd>{money(booking.paid)}</dd></div>
            {refunded > 0 && <div><dt>Refunded</dt><dd>{money(refunded)}</dd></div>}
            <div><dt>Method</dt><dd>{booking.method}</dd></div>
            <div><dt>Guests</dt><dd>{booking.event.guests.toLocaleString("en-US")}</dd></div>
          </dl>

          {!cancelled && booking.balance > 0 && <Balance booking={booking} meta={meta.data} days={days} onPaid={paidUp} />}

          <button className="button" onClick={download} disabled={making}>{making ? "Making your receipt…" : "Download PDF receipt"}</button>
          <ErrorNote>{pdfError}</ErrorNote>
          <p className="quiet centre">The PDF carries a QR code. A vendor scans it on the day to check the booking.</p>

          <h2 className="caps">Track your vendors</h2>
          {!canReview && <p className="quiet">You can review each vendor once the event has happened or the balance is paid.</p>}
          <ul className="lines">
            {booking.vendors.map((v, index) => {
              // Older bookings did not record which service each vendor was for; the plan's lines are in the same order.
              const serviceId = v.serviceId ?? booking.quote.lines[index]?.id;
              const open = talkingTo === serviceId;
              const count = messages.filter((m) => m.serviceId === serviceId && m.from === "customer").length;
              const line = booking.quote.lines.find((l) => l.id === serviceId);
              const openComplaint = (booking.cases ?? []).some((c) => c.serviceId === serviceId && c.type === "complaint");
              const canComplain = v.status === "Confirmed" && (v.deliveredAt || days <= 0) && !openComplaint && !cancelled;
              return (
                <li key={`${serviceId}-${v.vendor}`} className="vendor-row">
                  <div className="vendor-head">
                    <p>{v.category} <span className="quiet">· {v.vendor}</span></p>
                    <span className={`state ${stateClass(v.status)}`}>{v.confirmedAt ? "Delivered" : v.deliveredAt ? "Delivered?" : LABEL[v.status] ?? v.status}</span>
                  </div>
                  {line?.settings && <p className="line-settings">{line.settings}</p>}
                  <LineStatus booking={booking} line={v} rules={rules} />
                  {v.deliveredAt && !v.confirmedAt && !v.hold && (
                    <div className="vendor-actions">
                      <button className="chip on" onClick={() => confirm(serviceId)}>Confirm delivery</button>
                    </div>
                  )}
                  <div className="vendor-actions">
                    <button className="chip" aria-expanded={open} onClick={() => setTalkingTo(open ? "" : serviceId)}>{open ? "Close messages" : count ? `Messages (${count})` : "Message"}</button>
                    <Link className="chip" to={`/service/${serviceId}#visit`}>Book a visit</Link>
                    {canComplain && <button className="chip" aria-expanded={complaining === serviceId} onClick={() => setComplaining(complaining === serviceId ? "" : serviceId)}>Report a problem</button>}
                    {canReview && v.status === "Confirmed" && !reviewed.includes(serviceId) && <button className="chip" aria-expanded={reviewing === serviceId} onClick={() => setReviewing(reviewing === serviceId ? "" : serviceId)}>Leave a review</button>}
                    {reviewed.includes(serviceId) && <span className="quiet">Reviewed. Thank you.</span>}
                  </div>
                  {open && <Thread booking={booking} serviceId={serviceId} vendor={v.vendor} messages={messages} onSent={setPosted} />}
                  {complaining === serviceId && <ComplaintForm booking={booking} line={v} onDone={() => { setComplaining(""); refresh(); }} />}
                  {reviewing === serviceId && <ReviewForm booking={booking} serviceId={serviceId} vendor={v.vendor} onDone={() => markReviewed(serviceId)} />}
                </li>
              );
            })}
          </ul>

          {(booking.refunds ?? []).length > 0 && (
            <>
              <h2 className="caps">Refunds</h2>
              <ul className="lines">
                {booking.refunds.map((refund) => (
                  <li key={refund.id}><div><p>{refund.reason}</p><p className="quiet">{refund.id} · to your {refund.method} · {when(refund.at)}</p></div><p className="num">{money(refund.amount)}</p></li>
                ))}
              </ul>
            </>
          )}

          {!cancelled && (
            <>
              <h2 className="caps">Your countdown checklist</h2>
              <Checklist booking={booking} />
              {days >= 0 && <CancelBooking booking={booking} onDone={paidUp} />}
            </>
          )}
        </div>
      )}
      <Link to="/" className="link-caps">Back to home</Link>
    </div>
  );
}
