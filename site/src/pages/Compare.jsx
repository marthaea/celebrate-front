import { Link, useSearchParams } from "react-router-dom";
import { api, useLoad } from "../../../src/api.js";
import { formatDate, money } from "../../../src/format.js";
import { usePlan } from "../../../src/plan.jsx";
import { more } from "../extra.js";
import { Art, ErrorNote, Loading, PageHead } from "../components.jsx";

/** Up to three services side by side, costed for the customer's own event. */
export default function Compare() {
  const [params] = useSearchParams();
  const plan = usePlan();
  const ids = (params.get("ids") ?? "").split(",").filter(Boolean).slice(0, 3);
  const { data, error, loading } = useLoad(
    () => Promise.all([Promise.all(ids.map(api.service)), more.options(plan.event), more.availability(plan.event.date, ids)]),
    [ids.join(","), JSON.stringify(plan.event)]
  );

  if (ids.length < 2) {
    return (
      <div className="page centre-page">
        <PageHead eyebrow="Compare" title="Tick two or three services to compare" />
        <Link to="/services" className="button fit">Browse services</Link>
      </div>
    );
  }

  const [services, options, clash] = data ?? [[], null, null];
  const costOf = (id) => options?.categories.flatMap((c) => c.options).find((o) => o.id === id)?.cost;
  const cheapest = Math.min(...services.map((s) => costOf(s.id) ?? Infinity));
  const topRated = Math.max(...services.map((s) => s.rating));

  return (
    <div className="page">
      <PageHead eyebrow="Compare" title="Side by side">
        <p className="quiet">Costed for your {plan.event.type.toLowerCase()}: {plan.event.guests.toLocaleString("en-US")} guests on {formatDate(plan.event.date)}, labour and transport included.</p>
      </PageHead>
      <ErrorNote>{error}</ErrorNote>
      {loading && !data && <Loading />}
      {data && (
        <div className="compare-scroll">
          <table className="compare-table">
            <thead>
              <tr>
                <td />
                {services.map((s) => (
                  <th key={s.id} scope="col">
                    <Link to={`/service/${s.id}`}>
                      <div className="piece-art"><Art category={s.category} photo={s.id} /></div>
                      <h2>{s.name}</h2>
                    </Link>
                    <p className="quiet">{s.vendor}{s.verified ? " · Verified" : ""}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr><th scope="row">For your event</th>{services.map((s) => <td key={s.id} className={costOf(s.id) === cheapest ? "best" : ""}>{money(costOf(s.id) ?? 0)}{costOf(s.id) === cheapest ? " · lowest" : ""}</td>)}</tr>
              <tr><th scope="row">Price</th>{services.map((s) => <td key={s.id}>{money(s.price)} / {s.unit}</td>)}</tr>
              <tr><th scope="row">Rating</th>{services.map((s) => <td key={s.id} className={s.rating === topRated ? "best" : ""}>★ {s.rating} <span className="quiet">({s.reviews} reviews)</span></td>)}</tr>
              <tr><th scope="row">District</th>{services.map((s) => <td key={s.id}>{s.district}</td>)}</tr>
              <tr><th scope="row">On your date</th>{services.map((s) => <td key={s.id}>{clash.unavailable.includes(s.id) ? "Booked" : "Free"}</td>)}</tr>
              <tr><th scope="row">What is included</th>{services.map((s) => <td key={s.id}><ul>{s.included.map((line) => <li key={line}>{line}</li>)}</ul></td>)}</tr>
              <tr>
                <td />
                {services.map((s) => {
                  const added = plan.items.includes(s.id);
                  return <td key={s.id}><button className={`button ${added ? "outline" : ""}`} onClick={() => (added ? plan.removeItem(s.id) : plan.addItem(s.id))}>{(added ? "Remove from my plan" : "Add to my plan")}</button></td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
