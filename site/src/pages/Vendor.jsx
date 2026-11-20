import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Check } from "lucide-react";
import { api, useLoad } from "../../../src/api.js";
import { formatDate, money, toISODate } from "../../../src/format.js";
import { daysUntil } from "../extra.js";
import { session, SignedOut, staff } from "../staff.js";
import { AreaSelect, BusyCalendar, ErrorNote, FileButton, Loading, PrivateFile, StaffSignIn } from "../components.jsx";
import { ServiceList } from "../vendorParts.jsx";

const when = (iso) => new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const stateClass = (status) => (status === "Confirmed" ? "confirmed" : ["Declined", "Cancelled", "Replaced", "Refunded"].includes(status) ? "off" : "waiting");

// ---- B: the application, step by step

function Step({ number, title, done, children }) {
  return (
    <section className={`step ${done ? "done" : ""}`}>
      <h2><span className="step-number">{done ? <Check size={16} aria-label="Done" /> : number}</span>{title}</h2>
      {children}
    </section>
  );
}

function Onboarding({ who, onSignOut, onApproved }) {
  const call = staff.as(who);
  const [version, setVersion] = useState(0);
  const { data, error: loadError, loading } = useLoad(() => call("/vendor/application"), [version]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [details, setDetails] = useState(null);
  const [agree, setAgree] = useState({ accept: false, name: "" });
  const reload = () => setVersion((n) => n + 1);
  const districts = useLoad(api.meta, []);

  useEffect(() => {
    if (loadError && /sign in|not active/i.test(loadError)) onSignOut();
  }, [loadError]);
  useEffect(() => {
    if (data) setDetails((d) => d ?? { owner: data.vendor.owner, about: data.vendor.about ?? "", category: data.vendor.category, district: data.vendor.district, phone: data.vendor.contacts?.phone ?? "", email: data.vendor.contacts?.email ?? "" });
  }, [data]);

  const act = async (path, body, done) => {
    setError("");
    setNote("");
    try {
      await call(path, body);
      if (done) setNote(done);
      reload();
    } catch (err) {
      if (err instanceof SignedOut) onSignOut();
      else setError(err.message);
    }
  };

  if (loading && !data) return <div className="page"><Loading /></div>;
  if (!data) return <div className="page"><ErrorNote>{loadError}</ErrorNote></div>;
  const { vendor, missing } = data;
  if (vendor.status === "approved") {
    return (
      <div className="page centre-page">
        <h1 className="display">You are approved</h1>
        <p className="quiet">{vendor.name} is live on Celebrate.</p>
        <button className="button fit" onClick={onApproved}>Open my workspace</button>
      </div>
    );
  }
  const locked = vendor.status === "pending";
  const meta = { categories: data.categories, units: data.units };

  return (
    <div className="page desk onboarding">
      <header className="desk-head">
        <div>
          <p className="caps">List my business</p>
          <h1>{vendor.name}</h1>
          <p className="quiet">Five steps, then the Celebrate team checks your business before it goes live.</p>
        </div>
        <button className="button fit outline" onClick={onSignOut}>Sign out</button>
      </header>

      {vendor.status === "draft" && <p className="aside-note">{missing.length ? `Still to do: ${missing.map((m) => ({ details: "details", proof: "proof", photos: "photos of your work", services: "services", agreement: "the agreement" }[m])).join(", ")}.` : "Everything is ready. Submit your application at the bottom."}</p>}
      {vendor.status === "pending" && <p className="aside-note" role="status"><strong>Submitted {formatDate(vendor.submittedAt.slice(0, 10))}.</strong> The Celebrate team is checking your documents. You will be able to take bookings once you are approved.</p>}
      {vendor.status === "rejected" && (
        <div className="error" role="alert">
          <p><strong>Not approved yet.</strong> {vendor.review?.reason}</p>
          <p>Fix what is asked, then submit again at the bottom.</p>
        </div>
      )}
      {note && <p className="aside-note" role="status">{note}</p>}
      <ErrorNote>{error}</ErrorNote>

      <Step number="1" title="Your business and contacts" done={!missing.includes("details")}>
        {details && (
          <form className="form" onSubmit={(e) => { e.preventDefault(); act("/vendor/application", details, "Details saved."); }}>
            <div className="fields">
              <label className="field"><span className="caps">Owner</span><input value={details.owner} onChange={(e) => setDetails({ ...details, owner: e.target.value })} disabled={locked} /></label>
              <label className="field"><span className="caps">What you do</span>
                <select value={details.category} onChange={(e) => setDetails({ ...details, category: e.target.value })} disabled={locked}>{meta.categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
              </label>
              <AreaSelect value={details.district} districts={districts.data?.districts ?? []} onChange={(district) => setDetails((d) => ({ ...d, district }))} disabled={locked} />
              <label className="field"><span className="caps">Business phone</span><input type="tel" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} disabled={locked} /></label>
              <label className="field"><span className="caps">Email (optional)</span><input type="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} disabled={locked} /></label>
            </div>
            <label className="field"><span className="caps">About your business</span><textarea rows={3} value={details.about} onChange={(e) => setDetails({ ...details, about: e.target.value })} maxLength={400} disabled={locked} /></label>
            <p className="quiet">Your contacts are for Celebrate only. Hosts never see them; you talk to hosts through Celebrate.</p>
            {!locked && <button className="button fit outline">Save details</button>}
          </form>
        )}
      </Step>

      <Step number="2" title="Proof and photos of your work" done={!missing.includes("proof") && !missing.includes("photos")}>
        <p>Upload <strong>one</strong> of: your business registration certificate, or the owner's national ID. Only the Celebrate team sees it.</p>
        <div className="files">
          {data.proofs.certificate && <PrivateFile file={data.proofs.certificate} token={who.token} />}
          {!locked && <FileButton label={data.proofs.certificate ? "Replace certificate" : "Registration certificate"} purpose="proof" upload={(d) => call("/uploads", d)} onAdded={(file) => act("/vendor/application/documents", { certificate: file.id }, "Certificate added.")} onError={setError} />}
          {data.proofs.nationalId && <PrivateFile file={data.proofs.nationalId} token={who.token} />}
          {!locked && <FileButton label={data.proofs.nationalId ? "Replace national ID" : "National ID"} purpose="proof" upload={(d) => call("/uploads", d)} onAdded={(file) => act("/vendor/application/documents", { nationalId: file.id }, "National ID added.")} onError={setError} />}
        </div>
        <p>Add photos of events you have done. Hosts see these on your listings.</p>
        <div className="files">
          {data.workPhotos.map((photo) => (
            <span key={photo.id} className="photo-chip">
              <img src={photo.url} alt="Your past work" />
              {!locked && <button type="button" className="link-quiet" onClick={() => act("/vendor/application/documents", { workPhotos: data.workPhotos.filter((p) => p.id !== photo.id).map((p) => p.id) })}>Remove</button>}
            </span>
          ))}
          {!locked && data.workPhotos.length < 12 && <FileButton label="Add photos of your work" purpose="work" accept="image/*" multiple upload={(d) => call("/uploads", d)} onAdded={(file) => act("/vendor/application/documents", { workPhotos: [...data.workPhotos.map((p) => p.id), file.id] })} onError={setError} />}
        </div>
      </Step>

      <Step number="3" title="Your services, prices and discounts" done={!missing.includes("services")}>
        {locked
          ? <ul className="lines">{data.services.map((s) => <li key={s.id}><p>{s.name}</p><p className="num">{money(s.price)} / {s.unit}</p></li>)}</ul>
          : <ServiceList services={data.services} categories={meta.categories} units={meta.units} defaultCategory={vendor.category} call={call} onChange={reload} />}
      </Step>

      <Step number="4" title="Days you cannot work" done={data.busy.length > 0}>
        <p>Tap the days you are already booked or closed. Hosts cannot book you on those days. You can change this at any time; it is optional now.</p>
        <BusyCalendar busy={data.busy} events={[]} onToggle={(date, busy) => act("/vendor/busy", { date, busy })} />
      </Step>

      <Step number="5" title="The vendor agreement" done={!missing.includes("agreement")}>
        {vendor.agreement
          ? <p>Accepted by {vendor.agreement.name} on {formatDate(vendor.agreement.at.slice(0, 10))}. <Link to="/vendor-agreement" target="_blank" className="link-quiet">Read it again</Link></p>
          : (
            <form className="form" onSubmit={(e) => { e.preventDefault(); act("/vendor/application/agreement", agree, "Agreement accepted."); }}>
              <p>It covers answering bookings within 24 hours, cancellations, how and when you are paid, and how complaints are handled. <Link to="/vendor-agreement" target="_blank" className="link-quiet">Read the vendor agreement</Link></p>
              <label className="tick"><input type="checkbox" checked={agree.accept} onChange={(e) => setAgree({ ...agree, accept: e.target.checked })} /><span>I have read the vendor agreement and accept it for {vendor.name}.</span></label>
              <label className="field"><span className="caps">Type your full name to sign</span><input value={agree.name} onChange={(e) => setAgree({ ...agree, name: e.target.value })} maxLength={60} autoComplete="name" /></label>
              <button className="button fit outline" disabled={!agree.accept || agree.name.trim().length < 3}>Accept the agreement</button>
            </form>
          )}
      </Step>

      {vendor.status !== "pending" && (
        <button className="button" disabled={missing.length > 0} onClick={() => act("/vendor/application/submit", {}, "Application sent. We will let you know.")}>
          {vendor.status === "rejected" ? "Submit again" : "Submit my application"}
        </button>
      )}
    </div>
  );
}

// ---- The workspace, once approved

const TABS = ["Bookings", "Appointments", "Calendar", "Services", "Cases", "Reviews"];

/** The vendor's side of a conversation with one host. */
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
            <small>{m.from === "vendor" ? "You" : booking.customer || "Host"} · {when(m.at)}{m.hidden ? " · contact details removed" : ""}</small>
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

/** Asks for a reason before declining or cancelling. */
function ReasonForm({ label, onSubmit, onCancel }) {
  const [reason, setReason] = useState("");
  return (
    <form className="thread" onSubmit={(e) => { e.preventDefault(); onSubmit(reason); }}>
      <label className="field"><span className="caps">{label}</span><textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} required /></label>
      <p className="quiet">The host sees your reason. Celebrate offers them a replacement or a refund.</p>
      <div className="vendor-actions">
        <button className="button fit" disabled={!reason.trim()}>Send</button>
        <button type="button" className="button fit outline" onClick={onCancel}>Back</button>
      </div>
    </form>
  );
}

/** F4: the vendor's side of a complaint, with evidence. */
function CaseCard({ record, call, token, onChange }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const respond = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await call(`/vendor/cases/${record.id}/respond`, { text, evidence: files.map((f) => f.id) });
      onChange();
    } catch (err) {
      setError(err.message);
    }
  };
  const result = record.resolution && (record.resolution.action === "replacement" ? `Replaced by ${record.resolution.vendor}.` : record.resolution.amount ? `${money(record.resolution.amount)} refunded to the host.` : "Settled with no refund.");
  return (
    <article className="desk-card">
      <div className="desk-card-head">
        <div>
          <h2>{record.type === "complaint" ? "Complaint" : "You cancelled"} · {record.bookingId}</h2>
          <p>“{record.text}”</p>
          <p className="quiet">{record.id} · opened {when(record.openedAt)}{record.status === "open" ? ` · Celebrate decides by ${when(record.dueBy)}` : ""}</p>
        </div>
        <span className={`state ${record.status === "open" ? "waiting" : "confirmed"}`}>{record.status === "open" ? "Open" : "Settled"}</span>
      </div>
      {record.evidence?.length > 0 && <div className="files">{record.evidence.map((file) => <PrivateFile key={file.id} file={file} token={token} />)}</div>}
      {record.response && <p className="line-state">Your side: “{record.response.text}”</p>}
      {result && <p className="line-state">{result}{record.resolution.note ? ` “${record.resolution.note}”` : ""}</p>}
      {record.type === "complaint" && record.status === "open" && !record.response && (
        <form className="thread" onSubmit={respond}>
          <label className="field"><span className="caps">Your side</span><textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} /></label>
          <div className="files">
            {files.map((file) => <span key={file.id} className="chip on">{file.name}</span>)}
            <FileButton label="Add evidence" purpose="evidence" multiple upload={(d) => call("/uploads", d)} onAdded={(file) => setFiles((list) => [...list, file])} onError={setError} />
          </div>
          <ErrorNote>{error}</ErrorNote>
          <button className="button fit" disabled={text.trim().length < 10}>Send my side</button>
        </form>
      )}
    </article>
  );
}

function Desk({ who, onSignOut, onUnapproved }) {
  const call = staff.as(who);
  const [tab, setTab] = useState("Bookings");
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [open, setOpen] = useState("");
  const [asking, setAsking] = useState(null);
  const { data, error: loadError, loading } = useLoad(() => call("/vendor/overview"), [version]);
  const application = useLoad(() => (tab === "Services" ? call("/vendor/application") : Promise.resolve(null)), [tab, version]);
  const refresh = () => setVersion((v) => v + 1);
  const today = toISODate(new Date());

  useEffect(() => {
    if (loadError && /not been approved/i.test(loadError)) onUnapproved();
    else if (loadError && /sign in|not active/i.test(loadError)) onSignOut();
  }, [loadError]);

  const act = async (path, body) => {
    setError("");
    setAsking(null);
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
  const waiting = lines.filter((x) => x.line.status === "Waiting" && x.booking.status === "active").length;
  const visitsWaiting = data.visits.filter((v) => v.status === "Requested").length;
  const owed = lines.filter((x) => ["Waiting", "Confirmed"].includes(x.line.status) && x.booking.status === "active" && x.line.payout?.status !== "paid").reduce((sum, x) => sum + x.line.due, 0);
  const paid = lines.filter((x) => x.line.payout?.status === "paid").reduce((sum, x) => sum + x.line.payout.amount, 0);
  const rating = data.reviews.length ? (data.reviews.reduce((sum, r) => sum + r.rating, 0) / data.reviews.length).toFixed(1) : "–";
  const eventDays = lines.filter((x) => ["Waiting", "Confirmed"].includes(x.line.status) && x.booking.status === "active").map((x) => x.booking.event.date);
  const openCases = data.cases.filter((c) => c.status === "open" && c.type === "complaint" && !c.response).length;
  const counts = { Bookings: waiting, Appointments: visitsWaiting, Cases: openCases };

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
        <div><p className="tile-number">{waiting}</p><p>bookings to answer within 24 hours</p></div>
        <div><p className="tile-number">{visitsWaiting}</p><p>appointments to answer</p></div>
        <div><p className="tile-number">{money(owed)}</p><p>to come, once delivered and confirmed</p></div>
        <div><p className="tile-number">{money(paid)}</p><p>paid out to you</p></div>
        <div><p className="tile-number">★ {rating}</p><p>from {data.reviews.length} {data.reviews.length === 1 ? "review" : "reviews"} on Celebrate</p></div>
      </div>

      {data.notifications.length > 0 && (
        <details className="desk-notes">
          <summary>Latest: {data.notifications[0].text}</summary>
          <ul>{data.notifications.slice(0, 10).map((n) => <li key={n.id}>{n.text} <small className="quiet">{when(n.at)}</small></li>)}</ul>
        </details>
      )}

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
          {lines.length === 0 && <p className="quiet">No bookings yet. They appear here as soon as a host pays a deposit.</p>}
          {[...lines].sort((a, b) => a.booking.event.date.localeCompare(b.booking.event.date)).map(({ booking, line }) => {
            const key = booking.id + line.id;
            const days = daysUntil(booking.event.date);
            const unread = (data.messages[booking.id] ?? []).filter((m) => m.serviceId === line.id && m.from === "customer").length;
            const live = booking.status === "active";
            const status = !live ? "Cancelled" : line.status;
            return (
              <article key={key} className="desk-card">
                <div className="desk-card-head">
                  <div>
                    <h2>{line.name}</h2>
                    <p>{booking.event.type} · {formatDate(booking.event.date)} · {booking.event.district}{booking.event.location ? ` · ${booking.event.location}` : ""} · {booking.event.guests.toLocaleString("en-US")} guests</p>
                    <p className="quiet">{booking.customer || "Host"} · {booking.id} · {line.detail}{days >= 0 ? ` · ${days} days to go` : " · past"}</p>
                    {line.settings && <p className="line-settings">{line.settings}</p>}
                  </div>
                  <span className={`state ${stateClass(status)}`}>{status === "Confirmed" ? (line.confirmedAt ? "Done" : line.deliveredAt ? "Delivered" : "Accepted") : status}</span>
                </div>
                <p className="desk-money">
                  <strong>{money(line.due)}</strong> to you ·{" "}
                  {line.payout?.status === "paid" ? `paid out ${when(line.payout.paidAt)}${line.payout.amount !== line.due ? ` (${money(line.payout.amount)} after a refund)` : ""}`
                    : line.hold ? "held while a complaint is reviewed"
                    : line.deliveredAt ? "paid once the host confirms, or 48 hours after delivery"
                    : "paid after you deliver and the host confirms"}
                </p>
                {live && line.status === "Waiting" && <p className={line.overdue ? "field-error" : "line-state"}>{line.overdue ? "You did not answer within 24 hours. Answer now, or Celebrate may give this booking to someone else." : `Answer by ${when(line.respondBy)}.`}</p>}
                {!live && <p className="line-state">The host cancelled{booking.cancellation?.reason ? `: “${booking.cancellation.reason}”` : "."} The date is free again.</p>}
                {line.cancelled && live && <p className="line-state">You {line.status === "Declined" ? "declined" : "cancelled"}: “{line.cancelled.reason}”</p>}
                {live && (
                  <div className="vendor-actions">
                    {line.status === "Waiting" && <button className="chip on" onClick={() => act(`/vendor/bookings/${booking.id}/status`, { serviceId: line.id, status: "Confirmed" })}>Accept</button>}
                    {line.status === "Waiting" && <button className="chip" onClick={() => setAsking({ key, kind: "decline" })}>Decline</button>}
                    {line.status === "Confirmed" && !line.deliveredAt && booking.event.date <= today && <button className="chip on" onClick={() => act(`/vendor/bookings/${booking.id}/lines/${encodeURIComponent(line.id)}/delivered`, {})}>Mark delivered</button>}
                    {line.status === "Confirmed" && !line.deliveredAt && booking.event.date > today && <button className="chip" onClick={() => setAsking({ key, kind: "cancel" })}>Cancel</button>}
                    <button className="chip" aria-expanded={open === key} onClick={() => setOpen(open === key ? "" : key)}>{open === key ? "Close messages" : `Messages${unread ? ` (${unread})` : ""}`}</button>
                  </div>
                )}
                {asking?.key === key && (
                  <ReasonForm
                    label={asking.kind === "decline" ? "Why can you not take it?" : "Why are you cancelling?"}
                    onCancel={() => setAsking(null)}
                    onSubmit={(reason) => act(asking.kind === "decline" ? `/vendor/bookings/${booking.id}/status` : `/vendor/bookings/${booking.id}/lines/${encodeURIComponent(line.id)}/cancel`, asking.kind === "decline" ? { serviceId: line.id, status: "Declined", reason } : { reason })}
                  />
                )}
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
              {!["Cancelled"].includes(visit.status) && (
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
          <p>Tap a day to mark it <strong>busy</strong>. Hosts cannot book you or ask for an appointment on busy days. Tap again to free it.</p>
          <BusyCalendar busy={data.busy} events={eventDays} onToggle={(date, busy) => act("/vendor/busy", { date, busy })} />
          {data.busy.length > 0 && <p className="quiet">Busy days: {data.busy.map(formatDate).join(" · ")}</p>}
        </section>
      )}

      {tab === "Services" && (
        application.data
          ? <ServiceList services={application.data.services} readOnly={data.services.filter((s) => !s.own)} categories={application.data.categories} units={application.data.units} defaultCategory={data.vendor.category} call={call} onChange={refresh} />
          : <Loading />
      )}

      {tab === "Cases" && (
        <section className="desk-list">
          {data.cases.length === 0 && <p className="quiet">No cancellations or complaints. Keep it that way!</p>}
          {[...data.cases].reverse().map((record) => <CaseCard key={record.id} record={record} call={call} token={who.token} onChange={refresh} />)}
        </section>
      )}

      {tab === "Reviews" && (
        <section className="desk-list">
          {data.reviews.length === 0 && <p className="quiet">No reviews yet. Hosts can review you once their event has happened or they have paid in full.</p>}
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
  const [approved, setApproved] = useState(() => session.get("vendor")?.vendor?.status === "approved");
  const meta = useLoad(api.meta, []);
  const signOut = () => {
    session.clear();
    setWho(null);
  };

  // The sign-in remembers whether the business is approved, so a reload opens the right screen.
  const markApproved = (yes) => {
    const next = { ...who, vendor: { ...who.vendor, status: yes ? "approved" : "pending" } };
    session.set(next);
    setWho(next);
    setApproved(yes);
  };

  if (who && approved) return <Desk who={who} onSignOut={signOut} onUnapproved={() => markApproved(false)} />;
  if (who) return <Onboarding who={who} onSignOut={signOut} onApproved={() => markApproved(true)} />;
  return (
    <StaffSignIn
      eyebrow="For vendors" title="Vendor sign in" askName turnstile={meta.data?.turnstile}
      intro="Answer bookings and appointments, keep your calendar, and talk to your hosts. Still applying? Sign in to carry on with your application."
      demoHint={meta.data?.demo && `Sign in as any listed business, for example “Mama's Kitchen”, with the password ${meta.data.demo.vendor}`}
      onSubmit={async ({ name, password, token }) => {
        const result = await staff.login({ role: "vendor", name, password, token });
        session.set(result);
        setApproved(result.vendor.status === "approved");
        setWho(result);
      }}
    >
      <p className="quiet">Not listed yet? <Link to="/vendors" className="link-quiet">Apply to list your business</Link></p>
    </StaffSignIn>
  );
}
