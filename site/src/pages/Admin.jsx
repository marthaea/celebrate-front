import { useEffect, useState } from "react";
import { api, useLoad } from "../../../src/api.js";
import { formatDate, money } from "../../../src/format.js";
import { session, SignedOut, staff } from "../staff.js";
import { ErrorNote, Loading, StaffSignIn } from "../components.jsx";

const TABS = ["Overview", "Vendors", "Payments", "Appointments", "Reviews"];
const stateClass = (status) => (["approved", "Confirmed"].includes(status) ? "confirmed" : ["pending", "Waiting", "Requested"].includes(status) ? "waiting" : "off");

function AddVendor({ meta, onAdd }) {
  const blank = { business: "", owner: "", category: "catering", district: "Kampala", password: "" };
  const [form, setForm] = useState(blank);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  return (
    <form className="desk-card form" onSubmit={async (e) => { e.preventDefault(); if (await onAdd(form)) setForm(blank); }}>
      <h2>Add a verified business</h2>
      <p className="quiet">For a business you have already checked. It is approved at once and can sign in with the password you set.</p>
      <div className="fields">
        <label className="field"><span className="caps">Business name</span><input value={form.business} onChange={set("business")} maxLength={60} required /></label>
        <label className="field"><span className="caps">Owner</span><input value={form.owner} onChange={set("owner")} maxLength={60} /></label>
        <label className="field"><span className="caps">What they do</span>
          <select value={form.category} onChange={set("category")}>{(meta?.categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
        </label>
        <label className="field"><span className="caps">District</span>
          <select value={form.district} onChange={set("district")}>{(meta?.districts ?? []).map((d) => <option key={d}>{d}</option>)}</select>
        </label>
        <label className="field"><span className="caps">Starting password</span><input type="password" value={form.password} onChange={set("password")} minLength={8} autoComplete="new-password" required /></label>
      </div>
      <button className="button fit">Add business</button>
    </form>
  );
}

function Desk({ who, onSignOut }) {
  const call = staff.as(who);
  const meta = useLoad(api.meta, []);
  const [tab, setTab] = useState("Overview");
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const { data, error: loadError, loading } = useLoad(() => call("/admin/overview"), [version]);

  useEffect(() => {
    if (loadError && /sign in/i.test(loadError)) onSignOut();
  }, [loadError]);

  const act = async (path, body) => {
    setError("");
    try {
      await call(path, body);
      setVersion((v) => v + 1);
      return true;
    } catch (err) {
      if (err instanceof SignedOut) onSignOut();
      else setError(err.message);
      return false;
    }
  };
  const setPassword = (vendor) => {
    const password = window.prompt(`New password for ${vendor.name} (at least 8 characters). Pass it to the owner yourself.`);
    if (password) act(`/admin/vendors/${vendor.id}`, { action: "password", password });
  };

  if (loading && !data) return <div className="page"><Loading /></div>;
  if (!data) return <div className="page"><ErrorNote>{loadError}</ErrorNote></div>;

  const { totals } = data;
  const pending = data.vendors.filter((v) => v.status === "pending");
  const others = data.vendors.filter((v) => v.status !== "pending");
  const titleOf = (id) => meta.data?.categories.find((c) => c.id === id)?.title ?? id;
  const counts = { Vendors: pending.length };

  return (
    <div className="page desk">
      <header className="desk-head">
        <div>
          <p className="caps">Admin</p>
          <h1>Celebrate dashboard</h1>
          <p className="quiet">Vendors, payments, appointments and reviews in one place.{data.demo ? " Demo mode: set ADMIN_PASSWORD on the host before real use." : ""}</p>
        </div>
        <button className="button fit outline" onClick={onSignOut}>Sign out</button>
      </header>

      <nav className="toolbar-row" aria-label="Sections">
        {TABS.map((name) => (
          <button key={name} className={tab === name ? "active" : ""} aria-pressed={tab === name} onClick={() => setTab(name)}>{name}{counts[name] ? ` (${counts[name]})` : ""}</button>
        ))}
      </nav>
      <ErrorNote>{error}</ErrorNote>

      {tab === "Overview" && (
        <>
          <div className="tiles">
            <div><p className="tile-number">{totals.bookings}</p><p>bookings worth {money(totals.value)}</p></div>
            <div><p className="tile-number">{money(totals.collected)}</p><p>collected from customers</p></div>
            <div><p className="tile-number">{money(totals.outstanding)}</p><p>balances still due</p></div>
            <div><p className="tile-number">{money(totals.fees)}</p><p>platform fees (3%)</p></div>
            <div><p className="tile-number">{money(totals.owedToVendors)}</p><p>owed to vendors</p></div>
            <div><p className="tile-number">{money(totals.paidToVendors)}</p><p>paid out to vendors</p></div>
            <div><p className="tile-number">{others.filter((v) => v.status === "approved").length}</p><p>active vendors · {pending.length} waiting for approval</p></div>
            <div><p className="tile-number">{data.visits.filter((v) => v.status === "Requested").length}</p><p>appointments vendors have not answered</p></div>
          </div>
          <section className="desk-list">
            <h2 className="caps">Vendors needing attention</h2>
            {others.filter((v) => v.waiting || v.visitsWaiting || v.declined || (v.rating && v.rating < 3)).length === 0 && <p className="quiet">Nothing to chase. Every vendor is up to date.</p>}
            {others.filter((v) => v.waiting || v.visitsWaiting || v.declined || (v.rating && v.rating < 3)).map((v) => (
              <article key={v.id} className="desk-card">
                <h2>{v.name}</h2>
                <p className="quiet">
                  {[v.waiting && `${v.waiting} bookings not answered`, v.visitsWaiting && `${v.visitsWaiting} appointments not answered`, v.declined && `${v.declined} bookings declined`, v.rating && v.rating < 3 && `rated ★ ${v.rating}`].filter(Boolean).join(" · ")}
                </p>
              </article>
            ))}
          </section>
        </>
      )}

      {tab === "Vendors" && (
        <section className="desk-list">
          <h2 className="caps">Applications to check ({pending.length})</h2>
          {pending.length === 0 && <p className="quiet">No applications waiting.</p>}
          {pending.map((v) => (
            <article key={v.id} className="desk-card">
              <div className="desk-card-head">
                <div>
                  <h2>{v.name}</h2>
                  <p>{titleOf(v.category)} · {v.district} · owner: {v.owner}</p>
                  {v.about && <p className="quiet">“{v.about}”</p>}
                  <p className="quiet">Applied {formatDate(v.createdAt.slice(0, 10))}. Check the business is real before approving.</p>
                </div>
                <span className="state waiting">Pending</span>
              </div>
              <div className="vendor-actions">
                <button className="chip on" onClick={() => act(`/admin/vendors/${v.id}`, { action: "approve" })}>Verify and approve</button>
                <button className="chip" onClick={() => act(`/admin/vendors/${v.id}`, { action: "reject" })}>Reject</button>
              </div>
            </article>
          ))}

          <h2 className="caps">All vendors ({others.length})</h2>
          <div className="table-scroll">
            <table className="desk-table">
              <thead><tr><th>Business</th><th>Status</th><th>Services</th><th>Bookings</th><th>Unanswered</th><th>Rating</th><th>Actions</th></tr></thead>
              <tbody>
                {others.map((v) => (
                  <tr key={v.id}>
                    <th scope="row">{v.name}<small>{titleOf(v.category)} · {v.district}{v.verified ? " · verified" : ""}{v.hasPassword ? "" : " · no password set"}</small></th>
                    <td><span className={`state ${stateClass(v.status)}`}>{v.status}</span></td>
                    <td>{v.services}</td>
                    <td>{v.bookings}{v.declined ? ` (${v.declined} declined)` : ""}</td>
                    <td>{v.waiting + v.visitsWaiting}</td>
                    <td>{v.rating ? `★ ${v.rating} (${v.reviews})` : "–"}</td>
                    <td className="row-actions">
                      {v.status === "approved" && <button className="link-quiet" onClick={() => act(`/admin/vendors/${v.id}`, { action: "suspend" })}>Suspend</button>}
                      {v.status !== "approved" && <button className="link-quiet" onClick={() => act(`/admin/vendors/${v.id}`, { action: "restore" })}>{v.status === "rejected" ? "Approve" : "Restore"}</button>}
                      <button className="link-quiet" onClick={() => act(`/admin/vendors/${v.id}`, { action: v.verified ? "unverify" : "verify" })}>{v.verified ? "Remove badge" : "Verify"}</button>
                      <button className="link-quiet" onClick={() => setPassword(v)}>Set password</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="quiet">Suspending a vendor hides their services from customers and locks their workspace.</p>
          <AddVendor meta={meta.data} onAdd={(form) => act("/admin/vendors", form)} />
        </section>
      )}

      {tab === "Payments" && (
        <section className="desk-list">
          <h2 className="caps">Customer payments</h2>
          {data.bookings.length === 0 && <p className="quiet">No bookings yet.</p>}
          {data.bookings.length > 0 && (
            <div className="table-scroll">
              <table className="desk-table">
                <thead><tr><th>Booking</th><th>Event</th><th>Total</th><th>Paid</th><th>Balance</th><th>Fee</th><th>Paid by</th></tr></thead>
                <tbody>
                  {data.bookings.map((b) => (
                    <tr key={b.id}>
                      <th scope="row">{b.id}<small>{b.customer || "No name"} · {formatDate(b.createdAt.slice(0, 10))}</small></th>
                      <td>{b.event.type}<small>{formatDate(b.event.date)}</small></td>
                      <td>{money(b.total)}</td>
                      <td>{money(b.paid)}</td>
                      <td>{b.balance ? <span className="state waiting">{money(b.balance)}</span> : <span className="state confirmed">Paid in full</span>}</td>
                      <td>{money(b.fee)}</td>
                      <td>{b.method}{b.balanceMethod && b.balanceMethod !== b.method ? `, ${b.balanceMethod}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="caps">Payouts to vendors</h2>
          {data.payouts.length > 0 && (
            <div className="table-scroll">
              <table className="desk-table">
                <thead><tr><th>Vendor</th><th>Booking</th><th>Event date</th><th>Vendor's answer</th><th>Due</th><th>Payout</th></tr></thead>
                <tbody>
                  {data.payouts.map((p) => (
                    <tr key={p.bookingId + p.serviceId} className={p.status === "Declined" ? "dim" : ""}>
                      <th scope="row">{p.vendor}<small>{p.service}</small></th>
                      <td>{p.bookingId}</td>
                      <td>{formatDate(p.eventDate)}</td>
                      <td><span className={`state ${stateClass(p.status)}`}>{p.status}</span></td>
                      <td>{p.status === "Declined" ? "–" : money(p.due)}</td>
                      <td>
                        {p.status === "Declined" ? "Nothing due"
                          : <button className={`chip ${p.paidOut ? "on" : ""}`} onClick={() => act("/admin/payouts", { bookingId: p.bookingId, serviceId: p.serviceId, paid: !p.paidOut })}>{p.paidOut ? "Paid out · undo" : "Mark paid out"}</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="quiet">Payments are simulated for now: these figures record what customers have agreed to pay and what you have marked as passed on. No money moves until a payment provider is connected.</p>
        </section>
      )}

      {tab === "Appointments" && (
        <section className="desk-list">
          {data.visits.length === 0 && <p className="quiet">No appointments yet.</p>}
          {data.visits.length > 0 && (
            <div className="table-scroll">
              <table className="desk-table">
                <thead><tr><th>Appointment</th><th>When</th><th>Vendor</th><th>Customer</th><th>Status</th></tr></thead>
                <tbody>
                  {data.visits.map((v) => (
                    <tr key={v.id}>
                      <th scope="row">{v.kind}<small>{v.id}</small></th>
                      <td>{formatDate(v.date)} at {v.time}</td>
                      <td>{v.vendor}<small>{v.service}</small></td>
                      <td>{v.name}</td>
                      <td><span className={`state ${stateClass(v.status)}`}>{v.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "Reviews" && (
        <section className="desk-list">
          {data.reviews.length === 0 && <p className="quiet">No reviews yet.</p>}
          {[...data.reviews].reverse().map((r) => (
            <article key={r.id} className="desk-card">
              <div className="desk-card-head">
                <div>
                  <h2>{"★".repeat(r.rating)}<span className="quiet">{"★".repeat(5 - r.rating)}</span> · {r.vendor}</h2>
                  {r.text && <p>“{r.text}”</p>}
                  <p className="quiet">{r.name} · {r.service} · {r.bookingId} · {formatDate(r.at.slice(0, 10))}</p>
                </div>
                <button className="chip" onClick={() => window.confirm("Remove this review for good?") && act(`/admin/reviews/${r.id}/remove`, {})}>Remove</button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

export default function Admin() {
  const [who, setWho] = useState(() => session.get("admin"));
  const meta = useLoad(api.meta, []);
  const signOut = () => {
    session.clear();
    setWho(null);
  };

  if (who) return <Desk who={who} onSignOut={signOut} />;
  return (
    <StaffSignIn
      eyebrow="Admin" title="Admin sign in" turnstile={meta.data?.turnstile}
      intro="For the Celebrate team: approve vendors, track payments and keep the marketplace honest."
      demoHint={meta.data?.demo && `The admin password is ${meta.data.demo.admin}. Set ADMIN_PASSWORD on the host to replace it.`}
      onSubmit={async ({ password, token }) => {
        const result = await staff.login({ role: "admin", password, token });
        session.set(result);
        setWho(result);
      }}
    />
  );
}
