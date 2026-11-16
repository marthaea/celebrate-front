import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, useLoad } from "../api.js";
import { discountPercent, money } from "../format.js";
import { BottomNav, CATEGORY_ICONS, ErrorNote, Loading, Photo, Strip } from "../components/ui.jsx";
import { usePlan } from "../plan.jsx";

export default function Home() {
  const plan = usePlan();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const meta = useLoad(api.meta, []);
  const offers = useLoad(api.offers, []);

  const search = (event) => {
    event.preventDefault();
    navigate(query.trim() ? `/browse?q=${encodeURIComponent(query.trim())}` : "/browse");
  };

  return (
    <main className="screen with-nav">
      <header className="head">
        <p className="hello">Hello{plan.name ? `, ${plan.name}` : ""}</p>
        <h1>What are we celebrating?</h1>
        <form onSubmit={search} role="search">
          <input className="search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try: tents in Mukono" aria-label="Search services" />
        </form>
      </header>
      <Strip />
      <div className="body">
        <ErrorNote>{meta.error}</ErrorNote>
        {meta.loading && <Loading />}
        {meta.data && (
          <>
            <div className="chips" role="group" aria-label="Event type">
              {meta.data.eventTypes.map((type) => (
                <button key={type} className={`chip ${plan.event.type === type ? "on" : ""}`} aria-pressed={plan.event.type === type} onClick={() => plan.setEvent({ type })}>
                  {type}
                </button>
              ))}
            </div>

            <h2>Services</h2>
            <div className="service-grid">
              {meta.data.categories.map((category) => {
                const Icon = CATEGORY_ICONS[category.id];
                return (
                  <Link key={category.id} to={`/browse/${category.id}`} className="tile">
                    <Icon size={26} strokeWidth={1.6} aria-hidden="true" />
                    <span>{category.name}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        <h2>Offers this week</h2>
        <ErrorNote>{offers.error}</ErrorNote>
        {offers.loading && <Loading />}
        <div className="offers">
          {offers.data?.map((service) => (
            <Link key={service.id} to={`/service/${service.id}`} className="card offer">
              <Photo category={service.category} caption={service.photoCaption} />
              <h3>{service.name}</h3>
              <p className="meta">{service.vendor} · {service.district}</p>
              <p className="offer-price">
                <strong>{money(service.price)}</strong>
                <span className="badge">{discountPercent(service)}% off</span>
              </p>
            </Link>
          ))}
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
