import { Link, useNavigate, useParams } from "react-router-dom";
import { api, useLoad } from "../../../src/api.js";
import { discountPercent, formatDate, money } from "../../../src/format.js";
import { usePlan } from "../../../src/plan.jsx";
import { Art, Calendar, ErrorNote, Loading } from "../components.jsx";
import { more } from "../extra.js";
import { useAccount } from "../account.jsx";
import { useState } from "react";
import { toISODate } from "../../../src/format.js";
import { useT } from "../i18n.jsx";

/** Books a tasting, fitting or viewing with the vendor. Contact stays on the site: no phone numbers are swapped. */
function Visit({ service, kind }) {
  const { customer } = useAccount();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState(toISODate(tomorrow));
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [booked, setBooked] = useState(null);
  const [sending, setSending] = useState(false);
  const slots = useLoad(() => more.slots(service.id, date), [service.id, date, booked?.id]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const visit = await more.bookVisit({ serviceId: service.id, date, time });
      setBooked(visit);
      setTime("");
    } catch (err) {
      setError(err.message);
    }
    setSending(false);
  };

  return (
    <section className="detail" id="visit">
      <h2 className="caps">{kind} before you book</h2>
      <p className="quiet">Meet {service.vendor} first. It is free to ask, and no phone numbers are exchanged: everything stays on Celebrate.</p>
      {booked && (
        <p className="aside-note" role="status">
          <strong>{booked.kind} requested</strong> for {formatDate(booked.date)} at {booked.time} with {booked.vendor}. Reference {booked.id}. See it under <Link to="/bookings#visits" className="link-quiet">Appointments</Link>.
        </p>
      )}
      <form className="form" onSubmit={submit} noValidate>
        <div className="fields">
          <label className="field">
            <span className="caps">Date</span>
            <input type="date" min={toISODate(tomorrow)} value={date} onChange={(e) => { setDate(e.target.value); setTime(""); }} />
          </label>
          <div className="field">
            <span className="caps">Who is coming</span>
            <p className="field-value">{customer ? customer.name : "Sign in first"}</p>
          </div>
        </div>
        <fieldset className="slots">
          <legend className="caps">Time</legend>
          {slots.loading && !slots.data && <span className="quiet">Checking times…</span>}
          {slots.data?.atEvent && <span className="quiet">{service.vendor} is at an event that day. Try another date.</span>}
          {slots.data && !slots.data.atEvent && slots.data.free.length === 0 && <span className="quiet">No times left that day. Try another date.</span>}
          {slots.data?.free.map((slot) => (
            <button type="button" key={slot} className={`chip ${time === slot ? "on" : ""}`} aria-pressed={time === slot} onClick={() => setTime(slot)}>{slot}</button>
          ))}
        </fieldset>
        <ErrorNote>{error || slots.error}</ErrorNote>
        {customer
          ? <button className="button outline" disabled={sending || !time}>{sending ? "Sending…" : `Request ${kind.toLowerCase()}`}</button>
          : <Link className="button outline" to={`/account?next=/service/${service.id}`}>Sign in to request a {kind.toLowerCase()}</Link>}
      </form>
    </section>
  );
}

export default function Service() {
  const { id } = useParams();
  const navigate = useNavigate();
  const plan = usePlan();
  const t = useT();
  const meta = useLoad(api.meta, []);
  const { data: service, error, loading } = useLoad(() => api.service(id), [id]);
  const added = plan.items.includes(id);
  const clash = useLoad(() => more.availability(plan.event.date, [id]), [id, plan.event.date]);
  const free = clash.data ? clash.data.unavailable.length === 0 : null;
  const reviews = useLoad(() => more.reviews(id).catch(() => []), [id]);
  const category = meta.data?.categories.find((c) => c.id === service?.category);

  if (error) return <div className="page"><ErrorNote>{error}</ErrorNote><Link to="/services" className="link-caps">All services</Link></div>;
  if (loading || !service) return <div className="page"><Loading /></div>;

  const off = discountPercent(service);
  return (
    <article className="product">
      <div className="product-art">
        <Art category={service.category} photo={service.id} seed={service.name.length} label={service.photoCaption} eager />
        <p className="product-caption">Illustrative photograph · Pexels</p>
      </div>
      <div className="product-info">
        <Link to={`/services/${service.category}`} className="link-quiet">← {category?.title ?? "Services"}</Link>
        <p className="caps">{t(category?.title ?? "")}</p>
        <h1>{service.name}</h1>
        <p className="quiet">by {service.vendor}{service.verified ? " · Verified vendor" : ""} · Rated {service.rating} of 5 · {service.reviews} reviews</p>

        <p className="product-price">
          {money(service.price)} <span className="quiet">per {service.unit}</span>
          {service.wasPrice && <s className="quiet">{service.wasPrice.toLocaleString("en-US")}</s>}
          {off > 0 && <span className="tag inline">{off}% off</span>}
        </p>

        <button className={`button ${added ? "outline" : ""}`} onClick={() => (added ? plan.removeItem(id) : plan.addItem(id))}>
          {t(added ? "Remove from my plan" : "Add to my plan")}
        </button>
        {added && <button className="button" onClick={() => navigate("/plan")}>{t("View my plan")}</button>}
        <p className={`centre availability ${free === false ? "no" : ""}`} role="status">
          {free === null ? "Checking the date…" : free ? `Free on ${formatDate(plan.event.date)} · ${service.district}` : `Booked on ${formatDate(plan.event.date)}. Pick another date below.`}
        </p>

        <section className="detail">
          <h2 className="caps">Availability</h2>
          <Calendar serviceId={id} value={plan.event.date} onPick={(date) => plan.setEvent({ date })} />
        </section>

        <section className="detail">
          <h2 className="caps">{t("What is included")}</h2>
          <ul>{service.included.map((line) => <li key={line}>{line}</li>)}</ul>
        </section>

        {category?.visit && <Visit service={service} kind={category.visit} />}

        {reviews.data?.length > 0 && (
          <section className="detail">
            <h2 className="caps">Reviews from Celebrate customers</h2>
            <ul className="reviews">
              {[...reviews.data].reverse().slice(0, 6).map((review) => (
                <li key={review.id}>
                  <p><span className="stars-shown" aria-label={`${review.rating} out of 5`}>{"★".repeat(review.rating)}<span>{"★".repeat(5 - review.rating)}</span></span> {review.name} · {review.eventType}</p>
                  {review.text && <p>“{review.text}”</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {service.review && (
          <section className="detail">
            <h2 className="caps">Sample review</h2>
            <blockquote>“{service.review.text}”</blockquote>
            <p className="quiet">{service.review.by}</p>
          </section>
        )}
      </div>
    </article>
  );
}
