import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, useLoad } from "../api.js";
import { discountPercent, money } from "../format.js";
import { BackLink, BottomNav, ErrorNote, Loading, Photo, PlanBar } from "../components/ui.jsx";
import { usePlan } from "../plan.jsx";

const FILTERS = [
  { id: "", label: "All" },
  { id: "under500k", label: "Under 500k" },
  { id: "top", label: "Top rated" },
  { id: "offers", label: "Offers" },
];

export default function Browse() {
  const { category } = useParams();
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const [filter, setFilter] = useState("");
  const plan = usePlan();
  const meta = useLoad(api.meta, []);
  const list = useLoad(() => api.services({ category, q, filter }), [category, q, filter]);

  const title = category
    ? meta.data?.categories.find((c) => c.id === category)?.title ?? "Services"
    : q ? `Results for “${q}”` : "All services";
  const count = list.data?.length ?? 0;
  const hasPlan = plan.items.length > 0;

  return (
    <main className={`screen ${hasPlan ? "with-bar" : "with-nav"}`}>
      <header className="head">
        <BackLink to="/home" className="teal stacked">Home</BackLink>
        <h1>{title}</h1>
        <p className="sub">
          {list.loading ? "Finding providers…" : `${count} ${count === 1 ? "provider" : "providers"}${category || q ? "" : " across Uganda"} · prices include VAT`}
        </p>
      </header>
      <div className="orange-rule" />
      <div className="body">
        <div className="chips" role="group" aria-label="Filter">
          {FILTERS.map(({ id, label }) => (
            <button key={id} className={`chip ${filter === id ? "on" : ""}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>

        <ErrorNote>{list.error}</ErrorNote>
        {list.loading && !list.data && <Loading />}
        {list.data && count === 0 && (
          <p className="callout">Nothing matches yet. Try another filter, or <Link to="/browse" className="text-link">see all services</Link>.</p>
        )}
        <ul className="results">
          {list.data?.map((service) => {
            const added = plan.items.includes(service.id);
            return (
              <li key={service.id} className="card result">
                <div className="result-photo">
                  <Photo category={service.category} caption={service.photoCaption} />
                  {service.wasPrice && <span className="badge">{discountPercent(service)}% off</span>}
                </div>
                <div className="result-text">
                  <h3>{service.name}</h3>
                  <p className="meta">{service.vendor}{service.verified ? " · Verified" : ""}</p>
                  <p className="meta">Rated {service.rating} of 5 · {service.reviews} reviews</p>
                  <p className="price">{money(service.price)} / {service.unit}</p>
                  <Link to={`/service/${service.id}`} className="btn btn-dark btn-small">{added ? "In my plan · view" : "View and add"}</Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      {hasPlan ? <PlanBar /> : <BottomNav />}
    </main>
  );
}
