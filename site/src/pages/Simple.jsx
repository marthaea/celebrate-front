import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BadgeCheck, CalendarCheck, Wallet } from "lucide-react";
import { usePlan } from "../../../src/plan.jsx";
import { api, useLoad } from "../../../src/api.js";
import { more } from "../extra.js";
import { session as vendorSession, staff } from "../staff.js";
import { useAccount } from "../account.jsx";
import { AreaSelect, Art, ErrorNote, HumanCheck, Mark, PageHead } from "../components.jsx";

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

/**
 * A: signing up or in with a code sent by SMS. Sign up: name and number, then the code (three tries),
 * then tick the terms. Sign in: number, then the code. `next` is where to go afterwards.
 */
function SignInForm({ next }) {
  const plan = usePlan();
  const account = useAccount();
  const navigate = useNavigate();
  const meta = useLoad(api.meta, []);
  const [mode, setMode] = useState("signup");
  const [step, setStep] = useState("number");
  const [form, setForm] = useState({ name: plan.name, phone: "", code: "" });
  const [terms, setTerms] = useState(false);
  const [sent, setSent] = useState(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [tries, setTries] = useState(0);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const switchTo = (next) => {
    setMode(next);
    setStep("number");
    setError("");
    setSent(null);
  };

  const sendCode = async (event) => {
    event?.preventDefault();
    setError("");
    setSending(true);
    try {
      setSent(await more.sendCode({ phone: form.phone, name: form.name, purpose: mode, token }));
      setForm((f) => ({ ...f, code: "" }));
      setStep("code");
    } catch (err) {
      setError(err.message);
    }
    setSending(false);
    // A security check works once; a new code needs a fresh one.
    setToken("");
    setTries((n) => n + 1);
  };

  const verify = async (event) => {
    event.preventDefault();
    setError("");
    if (step === "terms" && !terms) return setError("Tick the box to accept the terms and privacy notice.");
    setSending(true);
    try {
      const result = await more.verifyCode({ phone: form.phone, code: form.code, acceptTerms: step === "terms" ? terms : undefined });
      account.signIn(result);
      plan.setName(result.customer.name);
      navigate(next || "/", { replace: true });
    } catch (err) {
      setSending(false);
      // A3 passed: the code is right, so A4 asks for the terms.
      if (/accept the terms/i.test(err.message) && step === "code") {
        setStep("terms");
        return;
      }
      setError(err.message);
      if (/new code|run out/i.test(err.message)) {
        setStep("number");
        setSent(null);
      }
    }
  };

  return (
    <>
      <PageHead eyebrow="Account" title={mode === "signup" ? "Sign up" : "Sign in"}>
        <p className="quiet">{next === "/pay" ? "Sign in or sign up to pay. Your plan is kept." : "Your bookings, appointments and messages, on any phone. No password: we send you a code by SMS."}</p>
      </PageHead>
      <div className="toolbar-row" role="group" aria-label="Sign up or sign in">
        <button type="button" className={mode === "signup" ? "active" : ""} aria-pressed={mode === "signup"} onClick={() => switchTo("signup")}>I am new here</button>
        <button type="button" className={mode === "signin" ? "active" : ""} aria-pressed={mode === "signin"} onClick={() => switchTo("signin")}>I have an account</button>
        <Link to="/vendor">I am a vendor</Link>
      </div>

      {step === "number" && (
        <form className="form" onSubmit={sendCode}>
          {mode === "signup" && (
            <label className="field">
              <span className="caps">Your name</span>
              <input value={form.name} onChange={set("name")} placeholder="e.g. Nantongo Sarah" autoComplete="name" maxLength={40} required />
            </label>
          )}
          <label className="field">
            <span className="caps">Phone number</span>
            <input type="tel" inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="0770 123 456" autoComplete="tel" maxLength={16} required />
            <small className="quiet">We send a 6-digit code to this number. Vendors never get it.</small>
          </label>
          <div className="field">
            <span className="caps">Security check</span>
            <HumanCheck siteKey={meta.data?.turnstile.siteKey} onToken={setToken} onProblem={setError} resetKey={tries} />
          </div>
          <ErrorNote>{error || meta.error}</ErrorNote>
          <button className="button" disabled={!token || sending}>{sending ? "Sending…" : "Send me a code"}</button>
        </form>
      )}

      {(step === "code" || step === "terms") && sent && (
        <form className="form" onSubmit={verify}>
          <p className="aside-note" role="status" hidden={step === "terms"}>
            We sent a code to <strong>{sent.phone}</strong>. It works for {sent.expiresInMinutes} minutes, and you have {sent.tries} tries.
            {sent.demoCode && <><br /><strong>Demo:</strong> SMS is not connected yet, so here is your code: <strong className="demo-code">{sent.demoCode}</strong></>}
          </p>
          {step === "terms" && <p className="aside-note" role="status"><strong>Code accepted.</strong> One last step.</p>}
          <label className="field" hidden={step === "terms"}>
            <span className="caps">Code</span>
            <input className="code-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.replace(/\D/g, "").slice(0, 6) })} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" required autoFocus />
          </label>
          {step === "terms" && (
            <label className="tick">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              <span>I accept the <Link to="/terms" target="_blank" className="link-quiet">terms of use</Link> and the <Link to="/privacy" target="_blank" className="link-quiet">privacy notice</Link>.</span>
            </label>
          )}
          <ErrorNote>{error}</ErrorNote>
          <button className="button" disabled={form.code.length !== 6 || sending}>{sending ? "Checking…" : step === "terms" ? "Create my account" : mode === "signup" ? "Check the code" : "Sign in"}</button>
          <p className="quiet">Wrong number, or no code? <button type="button" className="link-quiet" onClick={() => { setStep("number"); setError(""); }}>Start again</button></p>
        </form>
      )}
    </>
  );
}

/** The signed-in host's details: change the name, or sign out. */
function Profile() {
  const account = useAccount();
  const plan = usePlan();
  const navigate = useNavigate();
  const { customer } = account;
  const [name, setName] = useState(customer.name);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const save = async (event) => {
    event.preventDefault();
    setError("");
    setNote("");
    try {
      const updated = await more.updateMe({ name });
      account.update(updated);
      plan.setName(updated.name);
      setNote("Your name is saved.");
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
      <form className="form" onSubmit={save}>
        <label className="field">
          <span className="caps">Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="name" required />
        </label>
        <button className="button outline" disabled={name.trim() === customer.name}>Save name</button>
      </form>
      <p className="quiet">To change your phone number, contact Celebrate. You accepted the terms on {customer.termsAccepted ? new Date(customer.termsAccepted.at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "signing up"}.</p>
      <button className="button" onClick={signOut}>Sign out</button>
      <YourData onDeleted={signOut} />
    </>
  );
}

/** The host's rights over their data: a copy of everything, or deleting the account. */
function YourData({ onDeleted }) {
  const [busy, setBusy] = useState("");
  const [asking, setAsking] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");

  const download = async () => {
    setError("");
    setBusy("download");
    try {
      const data = await more.myData();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      link.download = `celebrate-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch (err) {
      setError(err.message);
    }
    setBusy("");
  };

  const remove = async (event) => {
    event.preventDefault();
    setError("");
    setBusy("delete");
    try {
      await more.deleteMe();
      onDeleted();
    } catch (err) {
      setError(err.message);
      setBusy("");
    }
  };

  return (
    <section className="your-data">
      <h2 className="caps">Your data</h2>
      <p className="quiet">
        Download a copy of everything Celebrate holds about you, or delete your account. See the <Link to="/privacy" className="link-quiet">privacy notice</Link> for how your data is used.
      </p>
      <ErrorNote>{error}</ErrorNote>
      <div className="vendor-actions">
        <button className="button outline" onClick={download} disabled={Boolean(busy)}>{busy === "download" ? "Preparing…" : "Download my data"}</button>
        {!asking && <button className="button outline danger" onClick={() => setAsking(true)} disabled={Boolean(busy)}>Delete my account</button>}
      </div>
      {asking && (
        <form className="form delete-box" onSubmit={remove}>
          <p><strong>This cannot be undone.</strong> Your account is closed and you are signed out. Download your data first if you want a copy.</p>
          <label className="field">
            <span className="caps">Type DELETE to confirm</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
          <div className="vendor-actions">
            <button className="button danger" disabled={typed.trim().toUpperCase() !== "DELETE" || Boolean(busy)}>{busy === "delete" ? "Deleting…" : "Delete my account"}</button>
            <button type="button" className="button outline" onClick={() => { setAsking(false); setTyped(""); }}>Keep my account</button>
          </div>
        </form>
      )}
    </section>
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
  { icon: CalendarCheck, title: "Bookings come to you", text: "Families planning an introduction, wedding, giveaway, graduation or party find you by district and date." },
  { icon: Wallet, title: "Clear prices, paid up front", text: "Customers see your price, labour and transport in one total, and pay before the day." },
  { icon: BadgeCheck, title: "A verified badge", text: "Verified vendors are shown first and marked on every listing." },
];

export function Vendors() {
  const meta = useLoad(api.meta, []);
  const navigate = useNavigate();
  const [form, setForm] = useState({ business: "", owner: "", category: "catering", district: "Kampala", about: "", phone: "", email: "", password: "" });
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [tries, setTries] = useState(0);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      // B1 creates the application and signs the vendor in, to carry on with steps 2 to 5.
      vendorSession.set(await staff.apply({ ...form, token }));
      navigate("/vendor");
    } catch (err) {
      setError(err.message);
      setToken("");
      setTries(tries + 1);
    }
    setSending(false);
  };

  return (
    <Split photo="cat:catering" heading="Bring your business to the celebration." line="Tent hire, caterers, venues, cakes, drinks, attire, sound, photographers, MCs and games.">
      <PageHead eyebrow="For vendors" title="List my business">
        <p className="quiet">Start here, then add proof, photos, your services and accept the agreement. The Celebrate team checks every business before it goes live. Already started? <Link to="/vendor" className="link-quiet">Vendor sign in</Link></p>
      </PageHead>
      <ul className="reasons">
        {REASONS.map(({ icon: Icon, title, text }) => (
          <li key={title}>
            <span className="reason-icon"><Icon size={20} aria-hidden="true" /></span>
            <div><h2>{title}</h2><p className="quiet">{text}</p></div>
          </li>
        ))}
      </ul>

      {(
        <form className="form" onSubmit={submit}>
          <div className="fields">
            <label className="field"><span className="caps">Business name</span><input value={form.business} onChange={set("business")} maxLength={60} autoComplete="organization" required /></label>
            <label className="field"><span className="caps">Owner's name</span><input value={form.owner} onChange={set("owner")} maxLength={60} autoComplete="name" required /></label>
            <label className="field"><span className="caps">What you do</span>
              <select value={form.category} onChange={set("category")}>{(meta.data?.categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
            </label>
            <AreaSelect value={form.district} districts={meta.data?.districts ?? []} onChange={(district) => setForm((f) => ({ ...f, district }))} />
          </div>
          <div className="fields">
            <label className="field"><span className="caps">Business phone</span><input type="tel" inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="0770 123 456" autoComplete="tel" required /></label>
            <label className="field"><span className="caps">Email (optional)</span><input type="email" value={form.email} onChange={set("email")} autoComplete="email" /></label>
          </div>
          <label className="field"><span className="caps">About your business (optional)</span><input value={form.about} onChange={set("about")} maxLength={400} placeholder="How long you have traded, what you are known for" /></label>
          <label className="field"><span className="caps">Choose a password</span><input type="password" value={form.password} onChange={set("password")} minLength={8} autoComplete="new-password" required /><small className="quiet">At least 8 characters. Use it to sign in and finish your application, and later to run your workspace.</small></label>
          <div className="field">
            <span className="caps">Security check</span>
            <HumanCheck siteKey={meta.data?.turnstile.siteKey} onToken={setToken} onProblem={setError} resetKey={tries} />
          </div>
          <ErrorNote>{error}</ErrorNote>
          <button className="button" disabled={!token || sending}>{sending ? "Starting…" : "Start my application"}</button>
          <p className="quiet">We keep what you enter to check and run your listing. See our <Link to="/privacy" className="link-quiet">privacy policy</Link>.</p>
        </form>
      )}
    </Split>
  );
}

export function NotFound() {
  return (
    <div className="page centre-page">
      <Mark className="big" />
      <PageHead eyebrow="Not found" title="We could not find that page" />
      <Link to="/" className="button fit">Back to home</Link>
    </div>
  );
}
