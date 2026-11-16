import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, useLoad } from "../api.js";
import { money } from "../format.js";
import { BackLink, ErrorNote, Loading } from "../components/ui.jsx";
import { usePlan } from "../plan.jsx";

export default function Pay() {
  const plan = usePlan();
  const navigate = useNavigate();
  const { event, items } = plan;
  const meta = useLoad(api.meta, []);
  const quote = useLoad(() => (items.length ? api.quote(event, items) : Promise.resolve(null)), []);
  const [method, setMethod] = useState("mtn");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  if (!items.length && !paying) return <Navigate to="/plan" replace />;

  const chosen = meta.data?.paymentMethods.find((m) => m.id === method);
  const total = quote.data?.total;

  const pay = async (e) => {
    e.preventDefault();
    setError("");
    setPaying(true);
    try {
      const booking = await api.book({ event, items, payment: { method, phone }, customer: plan.name });
      plan.clearItems();
      navigate(`/receipt/${booking.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setPaying(false);
    }
  };

  return (
    <main className="screen">
      <header className="head">
        <BackLink to="/plan" className="teal" />
        <p className="eyebrow">Step 4 of 4 · Payment</p>
        <h1>Pay your way</h1>
        <p className="sub">{total ? `Amount due: ${money(total)}` : "Working out the amount due…"}</p>
      </header>
      <div className="orange-rule" />
      <form className="body" onSubmit={pay} noValidate>
        <ErrorNote>{meta.error || quote.error}</ErrorNote>
        {meta.loading && <Loading />}
        {meta.data && (
          <>
            <fieldset className="options tight">
              <legend>Choose how to pay</legend>
              {meta.data.paymentMethods.map((option) => (
                <label key={option.id} className={`option ${method === option.id ? "on" : ""}`}>
                  <input type="radio" name="method" checked={method === option.id} onChange={() => { setMethod(option.id); setError(""); }} />
                  <span className="radio" aria-hidden="true" />
                  <span><strong>{option.name}</strong><small>{option.hint}</small></span>
                </label>
              ))}
            </fieldset>

            {chosen?.needsPhone ? (
              <>
                <label className="field">
                  <span>Mobile money number</span>
                  <input type="tel" inputMode="tel" autoComplete="tel" placeholder="0770 000 000" value={phone} onChange={(e) => { setPhone(e.target.value); setError(""); }} />
                </label>
                <p className="callout">You will get a prompt on your phone. Enter your PIN there to approve. CELEBRATE never sees or stores your PIN.</p>
              </>
            ) : (
              <p className="callout">
                {method === "bank"
                  ? "We will show the bank details and your payment reference on the receipt."
                  : "You will enter your card details on the card provider's secure page."}
              </p>
            )}

            <div className="spacer" />
            <ErrorNote>{error}</ErrorNote>
            <button className="btn btn-primary" disabled={!total || paying}>
              {paying ? "Confirming…" : total ? `Pay ${money(total)}` : "Pay"}
            </button>
            <p className="fine">By paying you accept the terms and privacy policy.</p>
          </>
        )}
      </form>
    </main>
  );
}
