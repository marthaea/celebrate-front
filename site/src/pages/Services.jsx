import { NavLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { api, useLoad } from "../../../src/api.js";
import { CompareBar, ErrorNote, Loading, PageHead, ServiceCard } from "../components.jsx";
import { useT } from "../i18n.jsx";

const FILTERS = [
  { id: "", label: "All" },
  { id: "under500k", label: "Under 500k" },
  { id: "top", label: "Top rated" },
  { id: "offers", label: "Offers" },
];

export default function Services() {
  const { category } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const filter = params.get("filter") ?? "";
  const meta = useLoad(api.meta, []);
  const list = useLoad(() => api.services({ category, q, filter }), [category, q, filter]);
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
        <PageHead eyebrow={t("Services")} title={t(title)}>
          <p>{list.loading ? "Finding providers…" : `${count} ${count === 1 ? "provider" : "providers"} · prices include VAT`}</p>
        </PageHead>
        <form className="band-search" role="search" onSubmit={search}>
          <Search size={18} aria-hidden="true" />
          <input key={q} name="q" type="search" defaultValue={q} placeholder="Search, e.g. tents in Mukono" aria-label="Search services" />
          <button className="button fit">{t("Search")}</button>
        </form>
      </div>

      <div className="toolbar">
        <nav className="toolbar-row" aria-label="Categories">
          <NavLink to="/services" end>{t("All")}</NavLink>
          {meta.data?.categories.map((c) => <NavLink key={c.id} to={`/services/${c.id}`}>{t(c.name)}</NavLink>)}
        </nav>
        <div className="toolbar-row" role="group" aria-label="Filter">
          {FILTERS.map(({ id, label }) => (
            <button key={id} className={filter === id ? "active" : ""} aria-pressed={filter === id} onClick={() => setFilter(id)}>{t(label)}</button>
          ))}
        </div>
      </div>

      <ErrorNote>{list.error}</ErrorNote>
      {list.loading && !list.data && <Loading />}
      {list.data && count === 0 && <p className="status">Nothing matches yet. Try another filter or category.</p>}
      <div className="grid four">
        {list.data?.map((service, index) => <ServiceCard key={service.id} service={service} index={index} />)}
      </div>
      <CompareBar />
    </div>
  );
}
