// D3 to D5: choosing how to pay, then waiting while the host approves on their phone.
import { useEffect, useState } from "react";
import { money } from "../../src/format.js";
import { more } from "./extra.js";
import { Mark } from "./components.jsx";

/** The payment methods, and the mobile money number when one is needed. */
export function MethodPicker({ methods, value, onChange }) {
  const chosen = methods?.find((m) => m.id === value.method);
  return (
    <>
      <fieldset className="choices">
        <legend className="caps">Choose how to pay</legend>
        {methods?.map((option) => (
          <label key={option.id} className={`choice ${value.method === option.id ? "on" : ""}`}>
            <input type="radio" name="method" checked={value.method === option.id} onChange={() => onChange({ ...value, method: option.id })} />
            <span className="dot" aria-hidden="true" />
            <span>{option.name}<small>{option.hint}</small></span>
          </label>
        ))}
      </fieldset>
      {chosen?.needsPhone ? (
        <>
          <label className="field">
            <span className="caps">{chosen.name} number</span>
            <input type="tel" inputMode="tel" autoComplete="tel" placeholder="0770 000 000" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} />
          </label>
          <p className="aside-note">You will get a prompt on this phone. Enter your PIN there to approve. Celebrate never sees or stores your PIN.</p>
        </>
      ) : (
        <p className="aside-note">
          {value.method === "bank" ? "You will approve the transfer in your bank's app or at the bank, with the reference we show you." : "You will enter your card details on the card provider's secure page."}
        </p>
      )}
    </>
  );
}

/**
 * Waits for a payment to finish, checking every two seconds. Calls onDone with the settled payment.
 * While payments are simulated, `simulated` shows buttons that act as the host's phone.
 */
export function PaymentWait({ payment, simulated, onDone }) {
  const [current, setCurrent] = useState(payment);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    setCurrent(payment);
  }, [payment.id]);

  useEffect(() => {
    if (current.status !== "pending") {
      onDone(current);
      return undefined;
    }
    const timer = setInterval(() => {
      more.payment(current.id).then(setCurrent).catch((err) => setProblem(err.message));
    }, 2000);
    return () => clearInterval(timer);
  }, [current.id, current.status]);

  const act = (outcome) => more.simulate(current.id, outcome).then(setCurrent).catch((err) => setProblem(err.message));
  const where = current.method === "bank" ? "in your bank's app" : current.method === "card" ? "on the card page" : `on your phone (${current.phone})`;

  return (
    <div className="pay-wait" role="status" aria-live="polite">
      <div className="loader"><Mark /></div>
      <h2>Approve {money(current.amount)} {where}</h2>
      <p className="quiet">{current.methodName}. Enter your PIN when the prompt appears. This page moves on by itself once it is approved.</p>
      {problem && <p className="field-error">{problem}</p>}
      {simulated && (
        <div className="demo-box">
          <p><strong>Demo:</strong> payments are not connected yet. Act as the phone, or wait a few seconds for it to approve itself.</p>
          <div className="vendor-actions">
            <button className="chip on" onClick={() => act("succeeded")}>Approve with PIN</button>
            <button className="chip" onClick={() => act("failed")}>Decline</button>
          </div>
        </div>
      )}
    </div>
  );
}
