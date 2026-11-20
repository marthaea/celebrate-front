import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, useLoad } from "../../../src/api.js";
import { usePlan } from "../../../src/plan.jsx";
import { more } from "../extra.js";
import { Art, Mark, ErrorNote, Loading, ServiceCard } from "../components.jsx";
import { TEAM } from "../team.js";
import { TeamCard } from "./Team.jsx";
import { PostCard } from "./Blog.jsx";
import { sortedPosts } from "../blog.js";

export default function Home() {
  const plan = usePlan();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const [filling, setFilling] = useState(false);

  // Fills in the sample introduction from the original design, on the nearest date when every vendor is free.
  const sample = async () => {
    setFilling(true);
    const items = ["lakeside-hall-gardens", "draped-tent-100", "buffet", "pa-dj", "photo-full-day"];
    let date = plan.event.date;
    try {
      date = (await more.availability(date, items)).nextFree ?? date;
    } catch {
      // Keep the date; the plan page will say if a vendor is taken.
    }
    plan.clearItems();
    items.forEach(plan.addItem);
    plan.setEvent({ type: "Introduction", guests: 250, tents: 6, district: "Mukono", setup: "vendor", date });
    navigate("/plan");
  };
  const meta = useLoad(api.meta, []);
  const offers = useLoad(api.offers, []);

  useEffect(() => {
    if (hash && offers.data) document.querySelector(hash)?.scrollIntoView();
  }, [hash, offers.data]);

  return (
    <>
      <section className="hero">
        <div className="hero-panel"><Art photo="hero-left" eager /></div>
        <div className="hero-panel"><Art photo="hero-right" eager /></div>
        <div className="hero-centre">
          <Mark className="hero-mark" />
          <h1 className="wordmark large">CELEBRATE</h1>
          <p className="hero-line">Tukusanyukidde. Every event service, one grand total.</p>
          <div className="hero-actions">
            <Link to="/services" className="button fit sun">Plan my event</Link>
            <Link to="/budget" className="button fit ghost">Plan by budget</Link>
          </div>
        </div>
      </section>

      <section className="intro" id="intro">
        <p className="caps">Tukusanyukidde · Welcome{plan.name ? `, ${plan.name}` : ""}</p>
        <p className="lead">Every event service. One platform. One grand total. Choose your venue, tents, food, sound and more from trusted vendors across Uganda, and see the full cost before you pay.</p>
        <div className="hero-actions">
          <Link to="/services" className="link-caps">Plan my event</Link>
          <button className="link-caps" onClick={sample} disabled={filling}>Try a sample introduction</button>
        </div>
      </section>

      <section className="occasions">
        <h2 className="caps">What are we celebrating?</h2>
        <ErrorNote>{meta.error}</ErrorNote>
        <div className="occasion-row" role="group" aria-label="Event type">
          {meta.data?.eventTypes.map((type) => (
            <button key={type} className={plan.event.type === type ? "on" : ""} aria-pressed={plan.event.type === type} onClick={() => plan.setEvent({ type })}>
              {type}
            </button>
          ))}
        </div>
        {meta.data?.eventNotes?.[plan.event.type] && <p className="quiet occasion-note">{meta.data.eventNotes[plan.event.type]}</p>}
      </section>

      <section className="block">
        <div className="block-head">
          <h2>Everything for the day</h2>
          <Link to="/services" className="link-caps">All services</Link>
        </div>
        {meta.loading && <Loading />}
        <div className="grid four">
          {meta.data?.categories.map((category, index) => (
            <Link key={category.id} to={`/services/${category.id}`} className="piece">
              <div className="piece-art tall"><Art category={category.id} photo={`cat:${category.id}`} seed={index * 3} label={category.title} /></div>
              <h3>{category.title}</h3>
            </Link>
          ))}
        </div>
      </section>

      <section className="block" id="offers">
        <div className="block-head">
          <h2>Offers this week</h2>
          <Link to="/services?filter=offers" className="link-caps">All offers</Link>
        </div>
        <ErrorNote>{offers.error}</ErrorNote>
        {offers.loading && <Loading />}
        <div className="grid four">
          {offers.data?.map((service, index) => <ServiceCard key={service.id} service={service} index={index} />)}
        </div>
      </section>

      <section className="feature">
        <Art photo="feature" className="feature-art" />
        <div className="feature-text">
          <h2>One number. Every detail.</h2>
          <p>Tell us the date, the district and how many guests. We match tents and chairs to your numbers, add labour, transport and our 3% fee, and show you a single grand total.</p>
          <ol className="steps">
            <li><span className="caps">01</span>Choose your services</li>
            <li><span className="caps">02</span>Tell us the details</li>
            <li><span className="caps">03</span>See your grand total</li>
            <li><span className="caps">04</span>Pay your way</li>
          </ol>
          <Link to="/plan" className="button fit sun">See my plan</Link>
        </div>
      </section>

      <section className="block" id="blog">
        <div className="block-head">
          <h2>From the blog</h2>
          <Link to="/blog" className="link-caps">All posts</Link>
        </div>
        <ul className="post-grid">
          {sortedPosts().slice(0, 3).map((post) => <PostCard key={post.slug} post={post} />)}
        </ul>
      </section>

      <section className="block" id="team">
        <div className="block-head">
          <h2>Meet the team</h2>
          <Link to="/team" className="link-caps">Our team</Link>
        </div>
        <ul className="team-grid compact">
          {TEAM.slice(0, 4).map((person, index) => <TeamCard key={index} person={person} short />)}
        </ul>
      </section>

      <section className="intro narrow">
        <h2 className="caps">For vendors</h2>
        <p className="lead">Tent hire, caterers, venues, MCs and photographers: bring your business to the families planning their next celebration.</p>
        <Link to="/vendors" className="button fit dark">List my business</Link>
      </section>
    </>
  );
}
