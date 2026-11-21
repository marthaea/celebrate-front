import { useEffect, useState } from "react";
import { api, useLoad } from "../../../src/api.js";
import { formatDate, money } from "../../../src/format.js";
import { session, SignedOut, staff } from "../staff.js";
import { AreaSelect, ErrorNote, Loading, PrivateFile, StaffSignIn } from "../components.jsx";

const TABS = ["Overview", "Applications", "Cases", "Vendors", "Customers", "Payments", "Appointments", "Reviews", "Audit log"];
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
        <AreaSelect value={form.district} districts={meta?.districts ?? []} onChange={(district) => setForm((f) => ({ ...f, district }))} />
        <label className="field"><span className="caps">Starting password</span><input type="password" value={form.password} onChange={set("password")} minLength={8} autoComplete="new-password" required /></label>
      </div>
      <button className="button fit">Add business</button>
    </form>
  );
}

/**
 * The audit log from GET /api/admin/audit. Accepts a list, or { entries | items | audit | log | rows: [] },
 * and common field names, so it works with the stand-in and with the live backend.
 */
const pick = (entry, keys) => keys.map((k) => entry?.[k]).find((v) => v != null && v !== "");
const plain = (value) => (value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value));

function AuditLog({ call, version }) {
  const { data, error, loading } = useLoad(() => call("/admin/audit"), [version]);
  const [search, setSearch] = useState("");
  if (loading && !data) return <Loading />;
  if (!data) return <ErrorNote>{error}</ErrorNote>;
  const list = Array.isArray(data) ? data : ["entries", "items", "audit", "log", "rows"].map((k) => data[k]).find(Array.isArray) ?? [];
  const rows = list.map((e, index) => {
    const actor = pick(e, ["actor", "actorName", "user", "who", "by"]);
    const role = pick(e, ["actorRole", "role"]);
    return {
      key: pick(e, ["id"]) ?? index,
      at: pick(e, ["at", "createdAt", "created_at", "time", "timestamp"]),
      who: [plain(actor), role && plain(role) !== plain(actor) ? `(${plain(role)})` : ""].filter(Boolean).join(" ") || "–",
      what: plain(pick(e, ["action", "event", "type", "route", "path"])) || "–",
      detail: [pick(e, ["target", "targetId", "entity", "subject"]), pick(e, ["detail", "details", "meta", "outcome", "status"])].filter((v) => v != null).map(plain).join(" · "),
    };
  });
  const words = search.trim().toLowerCase();
  const shown = rows.filter((r) => !words || `${r.who} ${r.what} ${r.detail}`.toLowerCase().includes(words));
  const when = (at) => {
    const date = at ? new Date(at) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : plain(at) || "–";
  };

  return (
    <section className="desk-list">
      <p className="quiet">Sign-ins and decisions made by staff, newest first. Entries cannot be changed or removed.</p>
      <label className="field">
        <span className="caps">Search the log</span>
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Who, or what was done" />
      </label>
      {shown.length === 0 && <p className="quiet">{rows.length ? "Nothing matches." : "Nothing recorded yet."}</p>}
      {shown.length > 0 && (
        <div className="table-scroll">
          <table className="desk-table">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>Details</th></tr></thead>
            <tbody>
              {shown.slice(0, 300).map((r) => (
                <tr key={r.key}><td>{when(r.at)}</td><td>{r.who}</td><td>{r.what}</td><td>{r.detail || "–"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Host accounts: who has signed up, what they have booked and paid, and suspending them. Hosts sign in by SMS code, so there are no passwords to reset. */
function Customers({ call, act, version }) {
  const { data, error, loading } = useLoad(() => call("/admin/customers"), [version]);
  const [search, setSearch] = useState("");
  if (loading && !data) return <Loading />;
  if (!data) return <ErrorNote>{error}</ErrorNote>;
  const words = search.trim().toLowerCase().replace(/\s+/g, "");
  const shown = data.filter((c) => !words || (c.name + c.phone).toLowerCase().replace(/\s+/g, "").includes(words));

  return (
    <section className="desk-list">
      <div className="tiles">
        <div><p className="tile-number">{data.length}</p><p>customer accounts</p></div>
        <div><p className="tile-number">{data.filter((c) => c.bookings).length}</p><p>have booked</p></div>
        <div><p className="tile-number">{data.filter((c) => c.status !== "active").length}</p><p>suspended</p></div>
      </div>
      <label className="field">
        <span className="caps">Find a customer</span>
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or phone number" />
      </label>
      {shown.length === 0 && <p className="quiet">{data.length ? "No one matches." : "No customer accounts yet."}</p>}
      {shown.length > 0 && (
        <div className="table-scroll">
          <table className="desk-table">
            <thead><tr><th>Customer</th><th>Status</th><th>Bookings</th><th>Paid</th><th>Still owing</th><th>Appointments</th><th>Actions</th></tr></thead>
            <tbody>
              {[...shown].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((c) => (
                <tr key={c.id}>
                  <th scope="row">{c.name}<small>{c.phone} · joined {formatDate(c.createdAt.slice(0, 10))}</small></th>
                  <td><span className={`state ${c.status === "active" ? "confirmed" : "off"}`}>{c.status}</span></td>
                  <td>{c.bookings}</td>
                  <td>{money(c.spent)}</td>
                  <td>{c.owing ? money(c.owing) : "–"}</td>
                  <td>{c.appointments}</td>
                  <td className="row-actions">
                    {c.status === "active"
                      ? <button className="link-quiet" onClick={() => window.confirm(`Suspend ${c.name}? They will be signed out and cannot sign in.`) && act(`/admin/customers/${c.id}`, { action: "suspend" })}>Suspend</button>
                      : <button className="link-quiet" onClick={() => act(`/admin/customers/${c.id}`, { action: "restore" })}>Restore</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="quiet">Phone numbers are for Celebrate only: never pass them to vendors.</p>
    </section>
  );
}

const when = (iso) => new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** B5: checking applications, with the documents, photos, services and agreement; approve, or reject with a reason. */
function Applications({ call, act, version, token, titleOf }) {
  const { data, error, loading } = useLoad(() => call("/admin/applications"), [version]);
  const [rejecting, setRejecting] = useState("");
  const [reason, setReason] = useState("");
  if (loading && !data) return <Loading />;
  if (!data) return <ErrorNote>{error}</ErrorNote>;
  const pending = data.filter((v) => v.status === "pending");
  const others = data.filter((v) => v.status !== "pending");

  const card = (v) => (
    <article key={v.id} className="desk-card">
      <div className="desk-card-head">
        <div>
          <h2>{v.name}</h2>
          <p>{titleOf(v.category)} · {v.district} · owner: {v.owner}</p>
          <p className="quiet">Phone {v.contacts?.phone || "–"}{v.contacts?.email ? ` · ${v.contacts.email}` : ""} · started {formatDate(v.createdAt.slice(0, 10))}{v.submittedAt ? ` · submitted ${formatDate(v.submittedAt.slice(0, 10))}` : ""}</p>
          {v.about && <p>“{v.about}”</p>}
        </div>
        <span className={`state ${v.status === "pending" ? "waiting" : "off"}`}>{v.status === "draft" ? "Not submitted" : v.status}</span>
      </div>
      {v.review?.reason && <p className="line-state">Last rejected: “{v.review.reason}”</p>}
      <div className="files">
        {v.proofs.certificate && <span><small className="caps">Certificate</small><br /><PrivateFile file={v.proofs.certificate} token={token} /></span>}
        {v.proofs.nationalId && <span><small className="caps">National ID</small><br /><PrivateFile file={v.proofs.nationalId} token={token} /></span>}
        {!v.proofs.certificate && !v.proofs.nationalId && <span className="quiet">No proof uploaded.</span>}
      </div>
      {v.workPhotos.length > 0 && <div className="gallery">{v.workPhotos.map((p) => <img key={p.id} src={p.url} alt={`Work by ${v.name}`} />)}</div>}
      {v.services.length > 0 && (
        <ul className="lines">
          {v.services.map((svc) => <li key={svc.id}><div><p>{svc.name}</p><p className="quiet">{titleOf(svc.category)} · {svc.included.join(", ")}</p></div><p className="num">{money(svc.price)} / {svc.unit}{svc.wasPrice ? ` (was ${money(svc.wasPrice)})` : ""}</p></li>)}
        </ul>
      )}
      <p className="quiet">{v.agreement ? `Vendor agreement accepted by ${v.agreement.name} on ${formatDate(v.agreement.at.slice(0, 10))}.` : "Vendor agreement not accepted yet."}{v.missing.length ? ` Missing: ${v.missing.join(", ")}.` : ""}</p>
      {v.status === "pending" && (rejecting === v.id ? (
        <form className="thread" onSubmit={async (e) => { e.preventDefault(); if (await act(`/admin/vendors/${v.id}`, { action: "reject", reason })) { setRejecting(""); setReason(""); } }}>
          <label className="field"><span className="caps">Why? The vendor sees this and can fix it.</span><textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="e.g. The certificate is blurred. Upload a clear copy." /></label>
          <div className="vendor-actions">
            <button className="button fit" disabled={reason.trim().length < 5}>Send back with this reason</button>
            <button type="button" className="button fit outline" onClick={() => setRejecting("")}>Back</button>
          </div>
        </form>
      ) : (
        <div className="vendor-actions">
          <button className="chip on" onClick={() => act(`/admin/vendors/${v.id}`, { action: "approve" })}>Verify and approve</button>
          <button className="chip" onClick={() => setRejecting(v.id)}>Reject with a reason</button>
        </div>
      ))}
    </article>
  );

  return (
    <section className="desk-list">
      <h2 className="caps">Waiting for you ({pending.length})</h2>
      {pending.length === 0 && <p className="quiet">No applications waiting.</p>}
      {pending.map(card)}
      {others.length > 0 && (
        <details>
          <summary className="caps">Started or sent back ({others.length})</summary>
          <div className="desk-list">{others.map(card)}</div>
        </details>
      )}
    </section>
  );
}

/** F3 and F4: a vendor who cancelled (offer a replacement or a full refund), or a host's complaint (decide within 3 working days). */
function CaseCard({ record, call, act, token }) {
  const [options, setOptions] = useState(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const late = record.status === "open" && record.dueBy < new Date().toISOString();
  const findReplacements = async () => setOptions(await call(`/admin/cases/${record.id}/replacements`));
  return (
    <article className="desk-card">
      <div className="desk-card-head">
        <div>
          <h2>{record.type === "complaint" ? "Complaint" : "Vendor cancelled"} · {record.vendor}</h2>
          <p>“{record.text}”</p>
          <p className="quiet">{record.id} · {record.bookingId} · host {record.customer || "–"} · opened {when(record.openedAt)}</p>
        </div>
        <span className={`state ${record.status === "open" ? "waiting" : "confirmed"}`}>{record.status === "open" ? (late ? "Overdue" : `Due ${when(record.dueBy)}`) : "Settled"}</span>
      </div>
      {record.evidence.length > 0 && <div className="files"><small className="caps">Host's evidence</small>{record.evidence.map((f) => <PrivateFile key={f.id} file={f} token={token} />)}</div>}
      {record.type === "complaint" && (record.response
        ? <><p className="line-state">Vendor's side: “{record.response.text}”</p>{record.response.evidence.length > 0 && <div className="files"><small className="caps">Vendor's evidence</small>{record.response.evidence.map((f) => <PrivateFile key={f.id} file={f} token={token} />)}</div>}</>
        : record.status === "open" && <p className="quiet">The vendor has not given their side yet.</p>)}
      {record.resolution && (
        <p className="line-state">
          {record.resolution.action === "replacement" ? `Replaced by ${record.resolution.vendor}.` : record.resolution.action === "dismiss" ? "Settled with no refund." : `Refund: ${money(record.resolution.sentBack ?? record.resolution.amount)}${record.resolution.sentBack !== undefined ? ` sent back, ${money(record.resolution.amount)} off the booking` : ""}.`}
          {record.resolution.note ? ` “${record.resolution.note}”` : ""} {when(record.resolution.at)}
        </p>
      )}

      {record.status === "open" && record.type === "vendor-cancel" && (
        <div className="desk-list">
          {!options && <button className="chip" onClick={findReplacements}>Find a replacement free that day</button>}
          {options && options.length === 0 && <p className="quiet">No one of the same kind is free that day.</p>}
          {options?.map((o) => (
            <div key={o.id} className="swap-row">
              <span><strong>{o.vendor}</strong> · {o.name} · {o.district} · {money(o.price)} / {o.unit}{o.rating ? ` · ★ ${o.rating}` : ""}</span>
              <button className="chip on" onClick={() => act(`/admin/cases/${record.id}/resolve`, { action: "replacement", serviceId: o.id })}>Offer this replacement</button>
            </div>
          ))}
          <button className="chip" onClick={() => window.confirm(`Take ${record.vendor} off the booking and refund the host ${money(record.allIn)} (or take it off their balance)?`) && act(`/admin/cases/${record.id}/resolve`, { action: "refund" })}>Full refund for this vendor ({money(record.allIn)})</button>
        </div>
      )}

      {record.status === "open" && record.type === "complaint" && (
        <form className="thread" onSubmit={(e) => { e.preventDefault(); act(`/admin/cases/${record.id}/resolve`, amount ? { action: "refund", amount: Number(amount), note } : { action: "dismiss", note }); }}>
          <div className="fields">
            <label className="field"><span className="caps">Refund to the host (UGX)</span><input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder={`0 to ${record.allIn.toLocaleString("en-US")}`} /></label>
            <label className="field"><span className="caps">Note to both sides</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} /></label>
          </div>
          <p className="quiet">A refund comes out of the vendor's payout, which is released once you decide.</p>
          <button className="button fit">{amount ? `Refund ${money(Number(amount))} and close` : "Close with no refund"}</button>
        </form>
      )}
    </article>
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
  const others = data.vendors.filter((v) => ["approved", "suspended"].includes(v.status));
  const titleOf = (id) => meta.data?.categories.find((c) => c.id === id)?.title ?? id;
  const openCases = data.cases.filter((c) => c.status === "open");
  const overdue = data.payouts.filter((p) => p.overdue);
  const counts = { Applications: pending.length, Cases: openCases.length };

  return (
    <div className="page desk">
      <header className="desk-head">
        <div>
          <p className="caps">Admin</p>
          <h1>Celebrate dashboard</h1>
          <p className="quiet">Applications, cases, vendors, hosts and money in one place.{data.demo ? " Demo mode: set ADMIN_PASSWORD on the host before real use." : ""}</p>
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
            <div><p className="tile-number">{money(totals.collected)}</p><p>collected from hosts</p></div>
            <div><p className="tile-number">{money(totals.refunded)}</p><p>refunded · {totals.cancelled} cancelled</p></div>
            <div><p className="tile-number">{money(totals.outstanding)}</p><p>balances still due</p></div>
            <div><p className="tile-number">{money(totals.fees)}</p><p>platform fees (3%)</p></div>
            <div><p className="tile-number">{money(totals.owedToVendors)}</p><p>owed to vendors</p></div>
            <div><p className="tile-number">{money(totals.paidToVendors)}</p><p>paid out to vendors</p></div>
            <div><p className="tile-number">{others.filter((v) => v.status === "approved").length}</p><p>active vendors · {pending.length} waiting for approval</p></div>
            <div><p className="tile-number">{data.visits.filter((v) => v.status === "Requested").length}</p><p>appointments vendors have not answered</p></div>
            <div><p className="tile-number">{totals.openCases}</p><p>cases to decide</p></div>
            <div><p className="tile-number">{totals.overdue}</p><p>bookings not answered within 24 hours</p></div>
          </div>
          {overdue.length > 0 && (
            <section className="desk-list">
              <h2 className="caps">Not answered within 24 hours</h2>
              {overdue.map((p) => (
                <article key={p.bookingId + p.serviceId} className="desk-card">
                  <div className="desk-card-head">
                    <div><h2>{p.vendor}</h2><p className="quiet">{p.service} · {p.bookingId} · event {formatDate(p.eventDate)} · was due {when(p.respondBy)}</p></div>
                    <button className="chip" onClick={() => act(`/admin/bookings/${p.bookingId}/lines/${encodeURIComponent(p.serviceId)}/no-response`, {})}>Treat as declined</button>
                  </div>
                </article>
              ))}
            </section>
          )}
          <section className="desk-list">
            <h2 className="caps">Vendors needing attention</h2>
            {others.filter((v) => v.overdue || v.visitsWaiting || v.declined || v.complaints || (v.rating && v.rating < 3)).length === 0 && <p className="quiet">Nothing to chase. Every vendor is up to date.</p>}
            {others.filter((v) => v.overdue || v.visitsWaiting || v.declined || v.complaints || (v.rating && v.rating < 3)).map((v) => (
              <article key={v.id} className="desk-card">
                <h2>{v.name}</h2>
                <p className="quiet">
                  {[v.overdue && `${v.overdue} bookings not answered in time`, v.visitsWaiting && `${v.visitsWaiting} appointments not answered`, v.declined && `${v.declined} bookings declined or cancelled`, v.complaints && `${v.complaints} complaints`, v.rating && v.rating < 3 && `rated ★ ${v.rating}`].filter(Boolean).join(" · ")}
                </p>
              </article>
            ))}
          </section>
        </>
      )}

      {tab === "Vendors" && (
        <section className="desk-list">
          {pending.length > 0 && <p className="aside-note">{pending.length} {pending.length === 1 ? "application is" : "applications are"} waiting in Applications.</p>}
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
                      {v.status === "suspended" && <button className="link-quiet" onClick={() => act(`/admin/vendors/${v.id}`, { action: "restore" })}>Restore</button>}
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

      {tab === "Applications" && <Applications call={call} act={act} version={version} token={who.token} titleOf={titleOf} />}

      {tab === "Cases" && (
        <section className="desk-list">
          <p className="quiet">Vendor cancellations need a replacement or a refund for the host. Complaints are decided within 3 working days, after hearing both sides; the vendor's payout waits until then.</p>
          {data.cases.length === 0 && <p className="quiet">No cases yet.</p>}
          {[...openCases].sort((a, b) => a.dueBy.localeCompare(b.dueBy)).map((record) => <CaseCard key={record.id} record={record} call={call} act={act} token={who.token} />)}
          {data.cases.some((c) => c.status !== "open") && (
            <details>
              <summary className="caps">Settled ({data.cases.filter((c) => c.status !== "open").length})</summary>
              <div className="desk-list">{data.cases.filter((c) => c.status !== "open").reverse().map((record) => <CaseCard key={record.id} record={record} call={call} act={act} token={who.token} />)}</div>
            </details>
          )}
        </section>
      )}

      {tab === "Customers" && <Customers call={call} act={act} version={version} />}
      {tab === "Audit log" && <AuditLog call={call} version={version} />}

      {tab === "Payments" && (
        <section className="desk-list">
          <h2 className="caps">Customer payments</h2>
          {data.bookings.length === 0 && <p className="quiet">No bookings yet.</p>}
          {data.bookings.length > 0 && (
            <div className="table-scroll">
              <table className="desk-table">
                <thead><tr><th>Booking</th><th>Event</th><th>Total</th><th>Paid</th><th>Balance</th><th>Refunded</th><th>Fee</th><th>Payments</th></tr></thead>
                <tbody>
                  {data.bookings.map((b) => (
                    <tr key={b.id}>
                      <th scope="row">{b.id}<small>{b.customer || "No name"} · {formatDate(b.createdAt.slice(0, 10))}</small></th>
                      <td>{b.event.type}<small>{formatDate(b.event.date)}</small></td>
                      <td>{money(b.total)}</td>
                      <td>{money(b.paid)}</td>
                      <td>{b.status === "cancelled" ? <span className="state off">Cancelled</span> : b.balance ? <span className="state waiting">{money(b.balance)}</span> : <span className="state confirmed">Paid in full</span>}</td>
                      <td>{b.refunded ? money(b.refunded) : "–"}</td>
                      <td>{money(b.fee)}</td>
                      <td>{b.payments.map((p) => <small key={p.id}>{p.kind} · {money(p.amount)} · {p.methodName} · {p.status}</small>)}</td>
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
                <thead><tr><th>Vendor</th><th>Booking</th><th>Event date</th><th>Vendor's answer</th><th>Delivery</th><th>Due</th><th>Payout</th></tr></thead>
                <tbody>
                  {data.payouts.map((p) => (
                    <tr key={p.bookingId + p.serviceId} className={["Declined", "Cancelled", "Replaced", "Refunded"].includes(p.status) ? "dim" : ""}>
                      <th scope="row">{p.vendor}<small>{p.service}</small></th>
                      <td>{p.bookingId}</td>
                      <td>{formatDate(p.eventDate)}</td>
                      <td><span className={`state ${stateClass(p.status)}`}>{p.status}</span></td>
                      <td>{p.confirmedAt ? (p.autoConfirmed ? "Confirmed automatically" : "Confirmed by host") : p.deliveredAt ? "Delivered, awaiting host" : "–"}</td>
                      <td>{p.due ? money(p.due) : "–"}</td>
                      <td>{p.payout.status === "paid" ? <span className="state confirmed">Paid {money(p.payout.amount)}</span> : p.hold ? <span className="state waiting">Held: {p.hold}</span> : p.due ? "After delivery is confirmed" : "Nothing due"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="quiet">Payments, refunds and payouts are simulated for now: they are recorded as if a payment provider had made them. A vendor is paid automatically once the host confirms delivery, or 48 hours after it is marked delivered, unless a complaint holds it.</p>
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
