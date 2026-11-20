import { NavLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { api, useLoad } from "../../../src/api.js";
import { more } from "../extra.js";
import { CompareBar, ErrorNote, Loading, PageHead, ServiceCard } from "../components.jsx";

const FILTERS = [
  { id: "", label: "All" },
  { id: "under500k", label: "Under 500k" },
  { id: "top", label: "Top rated" },
  { id: "offers", label: "Offers" },
];

const PRICES = [
  { id: "", label: "Any price" },
  { id: "200000", label: "Up to UGX 200,000" },
  { id: "500000", label: "Up to UGX 500,000" },
  { id: "1000000", label: "Up to UGX 1 million" },
  { id: "3000000", label: "Up to UGX 3 million" },
];
const RATINGS = [
  { id: "", label: "Any rating" },
  { id: "4", label: "★ 4 and up" },
  { id: "4.5", label: "★ 4.5 and up" },
  { id: "4.8", label: "★ 4.8 and up" },
];
const SORTS = [
  { id: "", label: "Recommended" },
  { id: "price", label: "Price, low to high" },
  { id: "-price", label: "Price, high to low" },
  { id: "rating", label: "Best rated" },
];

export default function Services() {
  const { category } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const filter = params.get("filter") ?? "";
  // C2: filter by district, price and rating.
  const district = params.get("district") ?? "";
  const maxPrice = params.get("maxPrice") ?? "";
  const minRating = params.get("minRating") ?? "";
  const sort = params.get("sort") ?? "";
  const meta = useLoad(api.meta, []);
  const list = useLoad(
    () => more.services({ category, q, filter, district, maxPrice, minRating, sort }),
    [category, q, filter, district, maxPrice, minRating, sort]
  );
  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const narrowed = Boolean(district || maxPrice || minRating);
  const count = list.data?.length ?? 0;

  const setFilter = (id) => {
    const next = new URLSearchParams(params);
    if (id) next.set("filter", id);
    else next.delete("filter");
    setParams(next, { replace: true });
  };

  const search = (event) => {
    event.preventDefault();
    const text = new FormData(event.currentTarget).get("q").trim();
    navigate(text ? `/services?q=${encodeURIComponent(text)}` : "/services");
  };

  const title = category
    ? meta.data?.categories.find((c) => c.id === category)?.title ?? "Services"
    : q ? `Results for “${q}”` : "All services";

  return (
    <div className="page">
      <div className="band">
        <PageHead eyebrow="Services" title={title}>
          <p>{list.loading ? "Finding providers…" : `${count} ${count === 1 ? "provider" : "providers"} · prices include VAT`}</p>
        </PageHead>
        <form className="band-search" role="search" onSubmit={search}>
          <Search size={18} aria-hidden="true" />
          <input key={q} name="q" type="search" defaultValue={q} placeholder="Search, e.g. tents in Mukono" aria-label="Search services" />
          <button className="button fit">Search</button>
        </form>
      </div>

      <div className="toolbar">
        <nav className="toolbar-row" aria-label="Categories">
          <NavLink to="/services" end>All</NavLink>
          {meta.data?.categories.map((c) => <NavLink key={c.id} to={`/services/${c.id}`}>{c.name}</NavLink>)}
        </nav>
        <div className="toolbar-row" role="group" aria-label="Filter">
          {FILTERS.map(({ id, label }) => (
            <button key={id} className={filter === id ? "active" : ""} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="filters" role="group" aria-label="Narrow down">
        <label className="field">
          <span className="caps">District</span>
          <select value={district} onChange={(e) => setParam("district", e.target.value)}>
            <option value="">Anywhere</option>
            {meta.data?.districts.map((d) => <option key={d}>{d}</option>)}
            <option value="other">Other areas</option>
          </select>
        </label>
        <label className="field">
          <span className="caps">Price</span>
          <select value={maxPrice} onChange={(e) => setParam("maxPrice", e.target.value)}>
            {PRICES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="caps">Rating</span>
          <select value={minRating} onChange={(e) => setParam("minRating", e.target.value)}>
            {RATINGS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="caps">Sort</span>
          <select value={sort} onChange={(e) => setParam("sort", e.target.value)}>
            {SORTS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        {narrowed && <button className="link-quiet" onClick={() => { ["district", "maxPrice", "minRating"].forEach((k) => params.delete(k)); setParams(new URLSearchParams(params), { replace: true }); }}>Clear filters</button>}
      </div>

      <ErrorNote>{list.error}</ErrorNote>
      {list.loading && !list.data && <Loading />}
      {list.data && count === 0 && <p className="status">Nothing matches{narrowed ? " those filters" : " yet"}. Try another district, price or category.</p>}
      <div className="grid four">
        {list.data?.map((service, index) => <ServiceCard key={service.id} service={service} index={index} />)}
      </div>
      <CompareBar />
    </div>
  );
}
