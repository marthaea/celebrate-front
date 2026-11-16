import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BadgeCheck, CalendarCheck, Wallet } from "lucide-react";
import { usePlan } from "../../../src/plan.jsx";
import { api, useLoad } from "../../../src/api.js";
import { more } from "../extra.js";
import { staff } from "../staff.js";
import { useAccount } from "../account.jsx";
import { Art, ErrorNote, HumanCheck, Mark, PageHead } from "../components.jsx";
import { useT } from "../i18n.jsx";

/** Two halves: a photograph with a message on the left, the page's content on the right. */
function Split({ photo, heading, line, children }) {
  return (
    <div className="auth">
      <div className="auth-art">
        <Art photo={photo} eager />
        <div className="auth-art-text">
          <Mark />
          <p className="auth-heading">{heading}</p>
          <p>{line}</p>
        </div>
      </div>
      <div className="auth-side">{children}</div>
    </div>
  );
}

/** Signing in, or opening an account. `next` is where to go afterwards (the pay page, say). */
function SignInForm({ next }) {
  const plan = usePlan();
  const account = useAccount();
  const t = useT();
  const navigate = useNavigate();
  const meta = useLoad(api.meta, []);
  const [mode, setMode] = useState("in");
  const [form, setForm] = useState({ name: plan.name, phone: "", password: "" });
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [tries, setTries] = useState(0);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      const result = mode === "in"
        ? await more.signIn({ phone: form.phone, password: form.password, token })
        : await more.register({ name: form.name, phone: form.phone, password: form.password, token });
      account.signIn(result);
      plan.setName(result.customer.name);
      navigate(next || "/", { replace: true });
    } catch (err) {
      setError(err.message);
      setSending(false);
      // A check works once, so a failed try needs a fresh one.
      setToken("");
      setTries(tries + 1);
    }
  };

  return (
    <>
      <PageHead eyebrow={t("Account")} title={mode === "in" ? t("Log in") : "Create your account"}>
        <p className="quiet">{next === "/pay" ? "Sign in or create an account to pay. Your plan is kept." : "Your bookings, appointments and messages, on any phone or computer."}</p>
      </PageHead>
      <div className="toolbar-row" role="group" aria-label="Sign in or create an account">
        <button type="button" className={mode === "in" ? "active" : ""} aria-pressed={mode === "in"} onClick={() => { setMode("in"); setError(""); }}>I have an account</button>
        <button type="button" className={mode === "new" ? "active" : ""} aria-pressed={mode === "new"} onClick={() => { setMode("new"); setError(""); }}>I am new here</button>
      </div>
      <form className="form" onSubmit={submit}>
        {mode === "new" && (
          <label className="field">
            <span className="caps">{t("Your name")}</span>
            <input value={form.name} onChange={set("name")} placeholder="e.g. Nantongo" autoComplete="name" maxLength={40} required />
          </label>
        )}
        <label className="field">
          <span className="caps">Mobile number</span>
          <input type="tel" inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="0770 123 456" autoComplete="tel" maxLength={16} required />
          {mode === "new" && <small className="quiet">Only Celebrate sees it. Vendors never get your number.</small>}
        </label>
        <label className="field">
          <span className="caps">Password</span>
          <input type="password" value={form.password} onChange={set("password")} autoComplete={mode === "in" ? "current-password" : "new-password"} minLength={mode === "new" ? 8 : undefined} required />
          {mode === "new" && <small className="quiet">At least 8 characters.</small>}
        </label>
        <div className="field">
          <span className="caps">Security check</span>
          <HumanCheck siteKey={meta.data?.turnstile.siteKey} onToken={setToken} onProblem={setError} resetKey={tries} />
          <small className="quiet">Cloudflare confirms you are a person.{meta.data?.turnstile.test ? " Running with Cloudflare's test keys, which always pass." : ""}</small>
        </div>
        <ErrorNote>{error || meta.error}</ErrorNote>
        <button className="button" disabled={!token || sending}>{sending ? "Checking…" : mode === "in" ? t("Log in") : "Create account"}</button>
        {mode === "in" && <p className="quiet">Forgotten your password? Contact Celebrate and we will reset it after checking it is you.</p>}
        <p className="aside-note">See how we look after your details in our <Link to="/privacy" className="link-quiet">privacy policy</Link>.</p>
      </form>
    </>
  );
}

/** The signed-in customer's details: change the name or password, or sign out. */
function Profile() {
  const account = useAccount();
  const plan = usePlan();
  const navigate = useNavigate();
  const { customer } = account;
  const [name, setName] = useState(customer.name);
  const [passwords, setPasswords] = useState({ password: "", newPassword: "" });
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const save = async (data, done) => {
    setError("");
    setNote("");
    try {
      const updated = await more.updateMe(data);
      account.update(updated);
      plan.setName(updated.name);
      setNote(done);
      setPasswords({ password: "", newPassword: "" });
    } catch (err) {
      setError(err.message);
    }
  };
  const signOut = () => {
    account.signOut();
    plan.setName("");
    navigate("/");
  };

  return (
    <>
      <PageHead eyebrow="Account" title={`Welcome, ${customer.name}`}>
        <p className="quiet">Signed in with {customer.phone}. Member since {new Date(customer.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}.</p>
      </PageHead>
      <div className="vendor-actions">
        <Link className="chip" to="/bookings">My bookings</Link>
        <Link className="chip" to="/bookings#visits">My appointments</Link>
        <Link className="chip" to="/plan">My plan</Link>
      </div>
      {note && <p className="aside-note" role="status">{note}</p>}
      <ErrorNote>{error}</ErrorNote>
      <form className="form" onSubmit={(e) => { e.preventDefault(); save({ name }, "Your name is saved."); }}>
        <label className="field">
          <span className="caps">Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="name" required />
        </label>
        <button className="button outline" disabled={name.trim() === customer.name}>Save name</button>
      </form>
      <form className="form" onSubmit={(e) => { e.preventDefault(); save(passwords, "Your password is changed."); }}>
        <label className="field">
          <span className="caps">Current password</span>
          <input type="password" value={passwords.password} onChange={(e) => setPasswords({ ...passwords, password: e.target.value })} autoComplete="current-password" required />
        </label>
        <label className="field">
          <span className="caps">New password</span>
          <input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} autoComplete="new-password" minLength={8} required />
        </label>
        <button className="button outline">Change password</button>
      </form>
      <button className="button" onClick={signOut}>Sign out</button>
    </>
  );
}

export function Account() {
  const { customer } = useAccount();
  const [params] = useSearchParams();
  const next = params.get("next");
  return (
    <Split photo="hero-left" heading="Tukusanyukidde." line="Plan the whole celebration in one place and see the full cost before you pay.">
      {customer ? <Profile /> : <SignInForm next={next?.startsWith("/") && !next.startsWith("//") ? next : ""} />}
      <p className="quiet">Run an events business? <Link to="/vendors" className="link-quiet">List it on Celebrate</Link></p>
    </Split>
  );
}

const REASONS = [
  { icon: CalendarCheck, title: "Bookings come to you", text: "Families planning a kwanjula, wedding, graduation or party find you by district and date." },
  { icon: Wallet, title: "Clear prices, paid up front", text: "Customers see your price, labour and transport in one total, and pay before the day." },
  { icon: BadgeCheck, title: "A verified badge", text: "Verified vendors are shown first and marked on every listing." },
];

export function Vendors() {
  const t = useT();
  const meta = useLoad(api.meta, []);
  const [form, setForm] = useState({ business: "", owner: "", category: "catering", district: "Kampala", about: "", password: "" });
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(null);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      setDone(await staff.apply({ ...form, token }));
    } catch (err) {
      setError(err.message);
      setToken("");
      setTries(tries + 1);
    }
    setSending(false);
  };

  return (
    <Split photo="cat:catering" heading="Bring your business to the celebration." line="Tent hire, caterers, venues, cakes, drinks, attire, sound, photographers, MCs and games.">
      <PageHead eyebrow={t("For vendors")} title={t("List my business")}>
        <p className="quiet">Apply below. The Celebrate team checks every business before it goes live. Already approved? <Link to="/vendor" className="link-quiet">Vendor sign in</Link></p>
      </PageHead>
      <ul className="reasons">
        {REASONS.map(({ icon: Icon, title, text }) => (
          <li key={title}>
            <span className="reason-icon"><Icon size={20} aria-hidden="true" /></span>
            <div><h2>{title}</h2><p className="quiet">{text}</p></div>
          </li>
        ))}
      </ul>

      {done ? (
        <p className="aside-note" role="status">
          <strong>Application received.</strong> {done.name} is now waiting to be checked. Once the Celebrate team approves it, sign in at <Link to="/vendor" className="link-quiet">Vendor sign in</Link> with your business name and the password you chose.
        </p>
      ) : (
        <form className="form" onSubmit={submit}>
          <div className="fields">
            <label className="field"><span className="caps">Business name</span><input value={form.business} onChange={set("business")} maxLength={60} autoComplete="organization" required /></label>
            <label className="field"><span className="caps">Owner's name</span><input value={form.owner} onChange={set("owner")} maxLength={60} autoComplete="name" required /></label>
            <label className="field"><span className="caps">What you do</span>
              <select value={form.category} onChange={set("category")}>{(meta.data?.categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
            </label>
            <label className="field"><span className="caps">District</span>
              <select value={form.district} onChange={set("district")}>{(meta.data?.districts ?? []).map((d) => <option key={d}>{d}</option>)}</select>
            </label>
          </div>
          <label className="field"><span className="caps">About your business (optional)</span><input value={form.about} onChange={set("about")} maxLength={400} placeholder="How long you have traded, what you are known for" /></label>
          <label className="field"><span className="caps">Choose a password</span><input type="password" value={form.password} onChange={set("password")} minLength={8} autoComplete="new-password" required /><small className="quiet">At least 8 characters. You will sign in with it once approved.</small></label>
          <div className="field">
            <span className="caps">Security check</span>
            <HumanCheck siteKey={meta.data?.turnstile.siteKey} onToken={setToken} onProblem={setError} resetKey={tries} />
          </div>
          <ErrorNote>{error}</ErrorNote>
          <button className="button" disabled={!token || sending}>{sending ? "Sending…" : "Apply to be listed"}</button>
          <p className="quiet">We keep what you enter to check and run your listing. See our <Link to="/privacy" className="link-quiet">privacy policy</Link>.</p>
        </form>
      )}
    </Split>
  );
}

export function NotFound() {
  const t = useT();
  return (
    <div className="page centre-page">
      <Mark className="big" />
      <PageHead eyebrow="Not found" title="We could not find that page" />
      <Link to="/" className="button fit">{t("Back to home")}</Link>
    </div>
  );
}
