import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { api, useLoad } from "../../../src/api.js";
import { money } from "../../../src/format.js";
import { usePlan } from "../../../src/plan.jsx";
import { ErrorNote, Loading, PageHead, Summary } from "../components.jsx";
import { localBookings, more } from "../extra.js";
import { useAccount } from "../account.jsx";
import { choicesForItems, setChoicesFor, useChoices } from "../choices.js";
import { MethodPicker, PaymentWait } from "../payment.jsx";

/** D1 to D3: the host reviews the total, chooses how to pay and confirms. */
export default function Pay() {
  const plan = usePlan();
  const { customer } = useAccount();
  const navigate = useNavigate();
  const { event, items } = plan;
  const [choices] = useChoices();
  const mine = choicesForItems(choices, items);
  const meta = useLoad(api.meta, []);
  const quote = useLoad(() => (items.length ? more.quote(event, items, mine) : Promise.resolve(null)), []);
  const [how, setHow] = useState({ method: "mtn", phone: "" });
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  if (!items.length && !paying) return <Navigate to="/plan" replace />;
  // Paying needs an account, so the booking, its receipt and its messages belong to someone.
  if (!customer && !paying) return <Navigate to="/account?next=/pay" replace />;

  const total = quote.data?.total;
  const rate = meta.data?.depositRate ?? 0.3;
  const deposit = total ? Math.round(total * rate) : 0;

  const pay = async (e) => {
    e.preventDefault();
    setError("");
    setPaying(true);
    try {
      const booking = await more.book({ event, items, choices: mine, payment: how, deposit: true, prompt: true });
      navigate(`/pay/${booking.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setPaying(false);
    }
  };

  return (
    <div className="page">
      <PageHead eyebrow="Step 4 of 4 · Payment" title="Pay your way">
        <p className="quiet">{total ? `Deposit due now: ${money(deposit)}. The balance of ${money(total - deposit)} is paid on the day.` : "Working out the amount due…"}</p>
      </PageHead>

      <div className="split">
        <form className="form" onSubmit={pay} noValidate>
          <ErrorNote>{meta.error || quote.error}</ErrorNote>
          {meta.loading && <Loading />}
          {meta.data && (
            <>
              <MethodPicker methods={meta.data.paymentMethods} value={how} onChange={(next) => { setHow(next); setError(""); }} />
              <ErrorNote>{error}</ErrorNote>
              {/* D2: a total that is too high is changed on the plan before paying. */}
              <p className="quiet">Too much? <Link to="/plan" className="link-quiet">Change your plan</Link> or try the <Link to="/budget" className="link-quiet">budget planner</Link> first.</p>
              <button className="button" disabled={!total || paying}>{paying ? "Sending the prompt…" : total ? `Pay deposit ${money(deposit)}` : "Pay deposit"}</button>
              <p className="quiet centre">By paying you accept our <Link to="/terms" className="link-quiet">terms</Link>, including the <Link to="/terms" className="link-quiet">cancellation rule</Link>.</p>
            </>
          )}
        </form>

        <aside className="summary" aria-label="Order summary">
          <div className="block-head">
            <h2 className="caps">Your plan</h2>
            <Link to="/plan" className="link-quiet">Edit</Link>
          </div>
          {quote.loading && <Loading label="Adding it all up" />}
          {quote.data && <Summary quote={quote.data} categories={meta.data?.categories} />}
          {quote.data && (
            <dl className="sums due">
              <div><dt>Deposit now ({Math.round(rate * 100)}%)</dt><dd>{money(deposit)}</dd></div>
              <div><dt>Balance on the day</dt><dd>{money(total - deposit)}</dd></div>
            </dl>
          )}
        </aside>
      </div>
    </div>
  );
}

/** D4 and D5: waiting for the phone; paid opens the receipt; failed offers another try. */
export function PayStatus() {
  const { id } = useParams();
  const plan = usePlan();
  const navigate = useNavigate();
  const meta = useLoad(api.meta, []);
  const { data: booking, error, loading } = useLoad(() => more.booking(id), [id]);
  const [payment, setPayment] = useState(null);
  const [how, setHow] = useState({ method: "mtn", phone: "" });
  const [problem, setProblem] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!booking) return;
    if (booking.status === "active") navigate(`/receipt/${booking.id}`, { replace: true });
    else setPayment(booking.payments.at(-1));
  }, [booking?.id]);

  const finished = (settled) => {
    if (settled.status === "succeeded") {
      more.booking(id).then((paid) => {
        localBookings.save(paid);
        // The plan has become a booking: empty it, and its settings, for the next event.
        paid.quote.lines.forEach((line) => setChoicesFor(line.id, null));
        plan.clearItems();
        navigate(`/receipt/${id}`, { replace: true, state: { fresh: true } });
      });
    } else {
      setPayment(settled);
    }
  };

  const retry = async (e) => {
    e.preventDefault();
    setProblem("");
    setSending(true);
    try {
      setPayment(await more.pay(id, "deposit", how));
    } catch (err) {
      setProblem(err.message);
    }
    setSending(false);
  };

  if (error) return <div className="page centre-page"><ErrorNote>{error}</ErrorNote><Link to="/bookings" className="button fit">My bookings</Link></div>;
  if (loading || !payment) return <div className="page centre-page"><Loading /></div>;

  return (
    <div className="page centre-page">
      <PageHead eyebrow={`Booking ${booking.id}`} title={payment.status === "failed" ? "The payment did not go through" : "Check your phone"}>
        <p className="quiet">{booking.event.type} · {booking.event.date} · grand total {money(booking.total)}</p>
      </PageHead>
      {payment.status === "pending" && <PaymentWait payment={payment} simulated={meta.data?.simulated.payments} onDone={finished} />}
      {payment.status === "failed" && (
        <form className="form narrow" onSubmit={retry}>
          <p className="error" role="alert">{payment.reason} Nothing has been taken.</p>
          <p className="quiet">Your vendors are held for you for a few minutes. Try again, or choose another way to pay.</p>
          <MethodPicker methods={meta.data?.paymentMethods} value={how} onChange={setHow} />
          <ErrorNote>{problem}</ErrorNote>
          <button className="button" disabled={sending}>{sending ? "Sending the prompt…" : `Try again: ${money(payment.amount)}`}</button>
          {problem && /swap|plan/i.test(problem) && <Link to="/plan" className="button outline">Back to my plan</Link>}
        </form>
      )}
    </div>
  );
}
