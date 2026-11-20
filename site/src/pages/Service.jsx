import { Link, useNavigate, useParams } from "react-router-dom";
import { api, useLoad } from "../../../src/api.js";
import { discountPercent, formatDate, money } from "../../../src/format.js";
import { usePlan } from "../../../src/plan.jsx";
import { Art, Calendar, ErrorNote, Loading } from "../components.jsx";
import { more } from "../extra.js";
import { useChoices } from "../choices.js";
import { useSeo } from "../seo.js";
import { normaliseChoices, pricedWith } from "../../../server/options.js";
import { quantityFor } from "../../../server/pricing.js";
import { useAccount } from "../account.jsx";
import { useState } from "react";
import { toISODate } from "../../../src/format.js";

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

/** The settings for this kind of service, with what they do to the price for the host's event. */
function Settings({ service, options, choices, onChange, event }) {
  const settings = normaliseChoices(service.category, choices);
  const qty = quantityFor(service, event);
  const { unit, flat } = pricedWith(service, settings);
  const amount = unit * qty + flat;
  const set = (key, value) => onChange({ ...settings, [key]: value });
  const effect = (choice) => {
    const bits = [];
    if (choice.mult) bits.push(`${choice.mult > 1 ? "+" : "−"}${Math.round(Math.abs(choice.mult - 1) * 100)}%`);
    if (choice.perUnit) bits.push(`+${money(choice.perUnit)} per ${service.unit}`);
    if (choice.flat) bits.push(`+${money(choice.flat)}`);
    return bits.join(", ");
  };
  if (!options.length) return null;

  return (
    <section className="detail settings" aria-label="Your settings">
      <h2 className="caps">Make it yours</h2>
      {options.map((option) => (
        <fieldset key={option.id} className="setting">
          <legend>{option.label}</legend>
          {option.type === "one" && option.choices.map((choice) => (
            <label key={choice.id} className={`pick ${settings[option.id] === choice.id ? "on" : ""}`}>
              <input type="radio" name={option.id} checked={settings[option.id] === choice.id} onChange={() => set(option.id, choice.id)} />
              <span>{choice.label}</span>
              {effect(choice) && <small>{effect(choice)}</small>}
            </label>
          ))}
          {option.type === "many" && option.choices.map((choice) => {
            const on = settings[option.id].includes(choice.id);
            return (
              <label key={choice.id} className={`pick ${on ? "on" : ""}`}>
                <input type="checkbox" checked={on} onChange={() => set(option.id, on ? settings[option.id].filter((x) => x !== choice.id) : [...settings[option.id], choice.id])} />
                <span>{choice.label}</span>
                {effect(choice) && <small>{effect(choice)}</small>}
              </label>
            );
          })}
          {option.type === "text" && (
            <input className="setting-text" value={settings[option.id]} maxLength={160} placeholder={option.placeholder} onChange={(e) => set(option.id, e.target.value)} aria-label={option.label} />
          )}
        </fieldset>
      ))}
      <p className="setting-total">
        <span>For your {event.guests.toLocaleString("en-US")}-guest {event.type.toLowerCase()}</span>
        <strong>{money(amount)}</strong>
        <small className="quiet">{qty > 1 ? `${money(unit)} × ${qty.toLocaleString("en-US")} ${service.unit}s${flat ? ` + ${money(flat)}` : ""}` : "Before labour, transport and our 3% fee"}</small>
      </p>
    </section>
  );
}

export default function Service() {
  const { id } = useParams();
  const navigate = useNavigate();
  const plan = usePlan();
  const meta = useLoad(api.meta, []);
  const { data: service, error, loading } = useLoad(() => more.service(id), [id]);
  const [choices, setChoice] = useChoices();
  useSeo(`/service/${id}`, { service }, Boolean(service) || Boolean(error));
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
        {service.photoUrls?.length
          ? <div className="art art-photo"><img className="in" src={service.photoUrls[0]} alt={service.name} /></div>
          : <Art category={service.category} photo={service.id} seed={service.name.length} label={service.photoCaption} eager />}
        <p className="product-caption">{service.photoUrls?.length ? `Photo from ${service.vendor}` : "Illustrative photograph · Pexels"}</p>
      </div>
      <div className="product-info">
        <Link to={`/services/${service.category}`} className="link-quiet">← {category?.title ?? "Services"}</Link>
        <p className="caps">{(category?.title ?? "")}</p>
        <h1>{service.name}</h1>
        <p className="quiet">by {service.vendor}{service.verified ? " · Verified vendor" : ""} · {service.reviews ? `Rated ${service.rating} of 5 · ${service.reviews} reviews` : "New on Celebrate"} · {service.district}</p>

        <p className="product-price">
          {money(service.price)} <span className="quiet">per {service.unit}</span>
          {service.wasPrice && <s className="quiet">{service.wasPrice.toLocaleString("en-US")}</s>}
          {off > 0 && <span className="tag inline">{off}% off</span>}
        </p>

        <Settings service={service} options={service.options ?? []} choices={choices[id]} event={plan.event} onChange={(next) => setChoice(id, next)} />

        <button className={`button ${added ? "outline" : ""}`} onClick={() => (added ? plan.removeItem(id) : plan.addItem(id))}>
          {(added ? "Remove from my plan" : "Add to my plan")}
        </button>
        {added && <button className="button" onClick={() => navigate("/plan")}>View my plan</button>}
        {added && service.options?.length > 0 && <p className="quiet centre">Changes to your settings are saved in your plan as you make them.</p>}
        <p className={`centre availability ${free === false ? "no" : ""}`} role="status">
          {free === null ? "Checking the date…" : free ? `Free on ${formatDate(plan.event.date)} · ${service.district}` : `Booked on ${formatDate(plan.event.date)}. Pick another date below.`}
        </p>

        {free === false && clash.data?.similar?.[id]?.length > 0 && (
          <section className="detail">
            <h2 className="caps">Free on {formatDate(plan.event.date)} instead</h2>
            <ul className="similar">
              {clash.data.similar[id].map((other) => (
                <li key={other.id}>
                  <Link to={`/service/${other.id}`}><strong>{other.name}</strong><span className="quiet">{other.vendor} · {other.district} · {money(other.price)} / {other.unit}{other.reviews ? ` · ★ ${other.rating}` : ""}</span></Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {service.photoUrls?.length > 1 && (
          <section className="detail">
            <h2 className="caps">More photos from {service.vendor}</h2>
            <div className="gallery">{service.photoUrls.slice(1).map((url) => <img key={url} src={url} alt={`${service.name}, by ${service.vendor}`} loading="lazy" />)}</div>
          </section>
        )}

        <section className="detail">
          <h2 className="caps">Availability</h2>
          <Calendar serviceId={id} value={plan.event.date} onPick={(date) => plan.setEvent({ date })} />
        </section>

        {service.included.length > 0 && (
          <section className="detail">
            <h2 className="caps">What is included</h2>
            <ul>{service.included.map((line) => <li key={line}>{line}</li>)}</ul>
          </section>
        )}

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
