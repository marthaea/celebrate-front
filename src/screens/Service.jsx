import { useNavigate, useParams } from "react-router-dom";
import { api, useLoad } from "../api.js";
import { discountPercent, formatDate, money } from "../format.js";
import { BackLink, ErrorNote, Loading, Photo } from "../components/ui.jsx";
import { usePlan } from "../plan.jsx";

export default function Service() {
  const { id } = useParams();
  const navigate = useNavigate();
  const plan = usePlan();
  const meta = useLoad(api.meta, []);
  const { data: service, error, loading } = useLoad(() => api.service(id), [id]);
  const backTo = service ? `/browse/${service.category}` : "/browse";
  const added = plan.items.includes(id);

  const toggle = () => {
    if (added) {
      plan.removeItem(id);
    } else {
      plan.addItem(id);
      navigate(backTo);
    }
  };

  return (
    <main className="screen">
      <div className="hero-photo">
        <Photo category={service?.category} caption={service?.photoCaption} />
        <BackLink to={backTo} className="pill" />
        {service && <span className="photo-count">1 of {service.photos} photos</span>}
        {service && <p className="photo-caption">{service.photoCaption}</p>}
      </div>
      <div className="orange-rule" />
      <div className="body">
        <ErrorNote>{error}</ErrorNote>
        {loading && <Loading />}
        {service && (
          <>
            <p className="eyebrow brown">{meta.data?.categories.find((c) => c.id === service.category)?.title}</p>
            <h1 className="title">{service.name}</h1>
            <p className="meta">by {service.vendor}{service.verified ? " · Verified vendor" : ""} · Rated {service.rating} of 5</p>
            <p className="big-price">
              <strong>{money(service.price)}</strong>
              <span>per {service.unit}</span>
              {service.wasPrice && <s>{service.wasPrice.toLocaleString("en-US")}</s>}
            </p>
            {service.wasPrice && <span className="badge">{discountPercent(service)}% off</span>}

            <section className="card included">
              <h2>What is included</h2>
              <ul>{service.included.map((line) => <li key={line}>{line}</li>)}</ul>
            </section>

            {service.review && (
              <section className="callout review">
                <p className="eyebrow brown">Sample review</p>
                <p>{service.review.text}</p>
                <p className="meta">{service.review.by}</p>
              </section>
            )}

            <div className="spacer" />
            <button className={`btn ${added ? "btn-ghost-dark" : "btn-primary"}`} onClick={toggle}>
              {added ? "Remove from my plan" : "Add to my plan"}
            </button>
            <p className="fine">Free on {formatDate(plan.event.date)}</p>
          </>
        )}
      </div>
    </main>
  );
}
