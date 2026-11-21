import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, useLoad } from "../../../src/api.js";
import { session, staff } from "../staff.js";
import { HumanCheck, Loading, Mark, PageHead } from "../components.jsx";
import { SUPPORT_EMAIL, supportMail } from "../contact.js";

/**
 * Asking the Celebrate team, who check it is the owner and set a new password in /admin.
 * Always offered; it is the only way until the backend can send reset codes by SMS.
 */
function AskTheTeam({ business, only }) {
  const what = "with your business name, the owner's name and the phone number on your application.";
  const body = `Business name: ${business}\nOwner's name: \nPhone number on our application: \n\nI have forgotten my vendor password. Please set a new one.`;
  const email = SUPPORT_EMAIL && <a className="link-quiet" href={supportMail("Vendor password reset", body)}>{SUPPORT_EMAIL}</a>;
  return (
    <p className={only ? "" : "aside-note"}>
      {only ? "" : "No code arriving, or has your phone number changed? "}
      {email ? <>Email the Celebrate team at {email} {what}</> : <>Contact the Celebrate team {what}</>}
      {" "}We check it is you, then send you a new password.
    </p>
  );
}

/** "Forgot your password?" for vendors: a code by SMS to the application's phone number, then a new password. */
export default function VendorReset() {
  const meta = useLoad(api.meta, []);
  const navigate = useNavigate();
  const bySms = meta.data?.features?.vendorPasswordReset === true;
  const [step, setStep] = useState("name");
  const [form, setForm] = useState({ name: "", code: "", password: "", again: "" });
  const [token, setToken] = useState("");
  const [tries, setTries] = useState(0);
  const [sent, setSent] = useState(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: key === "code" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value });
  const startAgain = () => {
    setStep("name");
    setToken("");
    setTries(tries + 1);
  };

  const sendCode = async (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      setSent(await staff.resetCode({ name: form.name, token }));
      setForm({ ...form, code: "" });
      setStep("code");
    } catch (err) {
      setError(err.message);
      setToken("");
      setTries(tries + 1);
    }
    setSending(false);
  };

  const reset = async (e) => {
    e.preventDefault();
    if (form.password !== form.again) return setError("The two passwords are not the same.");
    setError("");
    setSending(true);
    try {
      session.set(await staff.resetPassword({ name: form.name, code: form.code, password: form.password }));
      navigate("/vendor");
    } catch (err) {
      setError(err.message);
      setSending(false);
      if (/new code|run out/i.test(err.message)) startAgain();
    }
  };

  return (
    <div className="page centre-page">
      <Mark className="big" />
      <PageHead eyebrow="For vendors" title="Forgot your password?">
        <p className="quiet">
          {bySms
            ? "We send a code by SMS to the business phone number on your application. Then you choose a new password."
            : "The Celebrate team can set a new password for you."}
        </p>
      </PageHead>
      <div className="form narrow">
        {meta.loading && <Loading />}
        {!meta.loading && !bySms && <AskTheTeam business="" only />}

        {bySms && step === "name" && (
          <form className="form" onSubmit={sendCode}>
            <label className="field">
              <span className="caps">Business name</span>
              <input value={form.name} onChange={set("name")} autoComplete="organization" placeholder="e.g. Mama's Kitchen" maxLength={60} required />
              <small className="quiet">The name you sign in with.</small>
            </label>
            <div className="field">
              <span className="caps">Security check</span>
              <HumanCheck siteKey={meta.data?.turnstile?.siteKey} onToken={setToken} onProblem={setError} resetKey={tries} />
            </div>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="button" disabled={!token || !form.name.trim() || sending}>{sending ? "Sending…" : "Send me a code"}</button>
          </form>
        )}

        {bySms && step === "code" && (
          <form className="form" onSubmit={reset}>
            <p className="quiet">If {form.name.trim()} is registered with a phone number, a 6-digit code is on its way to it. It works for {sent?.expiresInMinutes ?? 10} minutes.</p>
            {sent?.demoCode && <p className="aside-note"><strong>Demo mode.</strong> No SMS is sent yet. Your code is {sent.demoCode}.</p>}
            <label className="field">
              <span className="caps">Code</span>
              <input value={form.code} onChange={set("code")} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" required />
            </label>
            <label className="field">
              <span className="caps">New password</span>
              <input type="password" value={form.password} onChange={set("password")} minLength={8} autoComplete="new-password" required />
              <small className="quiet">At least 8 characters.</small>
            </label>
            <label className="field">
              <span className="caps">New password again</span>
              <input type="password" value={form.again} onChange={set("again")} minLength={8} autoComplete="new-password" required />
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="button" disabled={form.code.length !== 6 || form.password.length < 8 || !form.again || sending}>{sending ? "Checking…" : "Set my new password"}</button>
            <button type="button" className="link-quiet" onClick={() => { setError(""); startAgain(); }}>Send a new code</button>
          </form>
        )}

        {bySms && <AskTheTeam business={form.name.trim()} />}
      </div>
      <p className="quiet"><Link to="/vendor" className="link-quiet">Back to vendor sign in</Link></p>
    </div>
  );
}
