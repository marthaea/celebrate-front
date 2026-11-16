import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, MessageCircle } from "lucide-react";
import { api, useLoad } from "../../../src/api.js";
import { formatDate, money } from "../../../src/format.js";
import { daysUntil, decodePlan, more, planKey } from "../extra.js";
import { useT } from "../i18n.jsx";
import { ErrorNote, Loading, PageHead } from "../components.jsx";

/** A plan shared with family and friends, who can pledge towards it. */
export default function Share() {
  const { code } = useParams();
  const t = useT();
  const shared = useMemo(() => decodePlan(code), [code]);
  const key = useMemo(() => planKey(code), [code]);
  const meta = useLoad(api.meta, []);
  const quote = useLoad(() => (shared ? api.quote(shared.event, shared.items) : Promise.resolve(null)), [code]);
  const loaded = useLoad(() => (shared ? more.pledges(key) : Promise.resolve([])), [key]);
  const [posted, setPosted] = useState(null);
  const [form, setForm] = useState({ name: "", amount: "", towards: "" });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!shared) {
    return (
      <div className="page centre-page">
        <PageHead eyebrow="Shared plan" title="This link is not complete">
          <p className="quiet">Ask the person who sent it to share the plan again.</p>
        </PageHead>
        <Link to="/" className="button fit">{t("Back to home")}</Link>
      </div>
    );
  }

  const { event, host } = shared;
  const pledges = posted ?? loaded.data ?? [];
  const total = quote.data?.total ?? 0;
  const raised = pledges.reduce((sum, pledge) => sum + pledge.amount, 0);
  const percent = total ? Math.min(100, Math.round((raised / total) * 100)) : 0;
  const days = daysUntil(event.date);
  const titleFor = (id) => meta.data?.categories.find((c) => c.id === id)?.title ?? "";
  const pledgedFor = (title) => pledges.filter((p) => p.towards === title).reduce((sum, p) => sum + p.amount, 0);
  const name = host ? `${host}'s ${event.type.toLowerCase()}` : `A ${event.type.toLowerCase()}`;
  const link = window.location.href;
  const message = `${host || "We"} would love your support for ${host ? "their" : "our"} ${event.type.toLowerCase()} on ${formatDate(event.date)}. See the plan and pledge here: ${link}`;

  const cover = (title, amount) => {
    setForm((f) => ({ ...f, towards: title, amount: String(amount) }));
    document.getElementById("pledge")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      setPosted(await more.pledge(key, { name: form.name, amount: Number(form.amount.replace(/[^\d]/g, "")), towards: form.towards }));
      setForm({ name: "", amount: "", towards: "" });
    } catch (err) {
      setError(err.message);
    }
    setSending(false);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="page">
      <div className="band">
        <PageHead eyebrow="You are invited to chip in" title={name}>
          <p>{formatDate(event.date)} · {event.district} · {event.guests.toLocaleString("en-US")} guests{days >= 0 ? ` · ${days} ${t("days to go")}` : ""}</p>
        </PageHead>
        <div className="band-actions">
          <a className="button fit dark" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden="true" /> {t("Share on WhatsApp")}</a>
          <button className="button fit outline" onClick={copy}><Copy size={18} aria-hidden="true" /> {copied ? "Link copied" : "Copy link"}</button>
        </div>
      </div>

      <ErrorNote>{quote.error || loaded.error}</ErrorNote>
      {quote.loading && <Loading label="Adding it all up" />}
      {quote.data && (
        <div className="split">
          <div className="form">
            <section className="raised" aria-label="Pledged so far">
              <p className="caps">Pledged so far</p>
              <p className="grand-total">{money(raised)}</p>
              <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Share of the total pledged"><span style={{ width: `${percent}%` }} /></div>
              <p className="quiet">{percent}% of {money(total)} · {pledges.length} {pledges.length === 1 ? "pledge" : "pledges"}</p>
            </section>

            <section>
              <h2 className="caps">What the day needs</h2>
              <ul className="lines needs">
                {quote.data.lines.map((line) => {
                  const title = titleFor(line.category);
                  const got = pledgedFor(title);
                  return (
                    <li key={line.id}>
                      <div>
                        <p><strong>{t(title)}</strong> · {money(line.amount)}</p>
                        <p className="quiet">{line.detail} · {line.vendor}</p>
                        {got > 0 && <p className="covered">{got >= line.amount ? "Covered" : `${money(got)} pledged`}</p>}
                      </div>
                      {got < line.amount && <button className="chip" onClick={() => cover(title, Math.max(line.amount - got, 1000))}>{got > 0 ? "Cover the rest" : "I will cover this"}</button>}
                    </li>
                  );
                })}
              </ul>
              <p className="quiet">Labour, transport and the 3% fee bring the grand total to {money(total)}.</p>
            </section>
          </div>

          <aside className="summary" id="pledge">
            <h2 className="caps">Make a pledge</h2>
            <form className="form" onSubmit={submit} noValidate>
              <label className="field">
                <span className="caps">{t("Your name")}</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Uncle Kato" maxLength={40} autoComplete="name" />
              </label>
              <label className="field">
                <span className="caps">Amount (UGX)</span>
                <input inputMode="numeric" value={form.amount ? Number(form.amount.replace(/[^\d]/g, "") || 0).toLocaleString("en-US") : ""} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d]/g, "") })} placeholder="100,000" />
              </label>
              <label className="field">
                <span className="caps">Towards</span>
                <select value={form.towards} onChange={(e) => setForm({ ...form, towards: e.target.value })}>
                  <option value="">The whole event</option>
                  {[...new Set(quote.data.lines.map((line) => titleFor(line.category)))].map((title) => <option key={title}>{title}</option>)}
                </select>
              </label>
              <ErrorNote>{error}</ErrorNote>
              <button className="button" disabled={sending}>{sending ? "Sending…" : "Pledge"}</button>
              <p className="aside-note">A pledge is a promise, shown to everyone with this link. No money is taken yet: paying a pledge through Celebrate is still to come.</p>
            </form>

            {pledges.length > 0 && (
              <>
                <h2 className="caps">Who has pledged</h2>
                <ul className="lines">
                  {[...pledges].reverse().map((pledge) => (
                    <li key={pledge.at + pledge.name}>
                      <div><p>{pledge.name}</p><p className="quiet">{pledge.towards || "The whole event"}</p></div>
                      <p className="num">{money(pledge.amount)}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
