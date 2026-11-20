import { Link } from "react-router-dom";
import { BadgeCheck, MapPin, ReceiptText, Wallet } from "lucide-react";
import { TEAM } from "../team.js";
import { Art } from "../components.jsx";
import { TeamCard } from "./Team.jsx";

// The words on this page are a first draft: change them to tell your own story.
const VALUES = [
  { icon: ReceiptText, title: "One honest total", text: "Every price shows what is included, labour and transport too, so the grand total you see is the total you pay." },
  { icon: BadgeCheck, title: "Vendors we have checked", text: "Every business is reviewed before it appears, and hosts' reviews come only from real bookings." },
  { icon: MapPin, title: "For every region", text: "Celebrations look different from Arua to Kabale and from Mbale to Masaka. Celebrate is built for all of them." },
  { icon: Wallet, title: "Pay your way", text: "Mobile money or card, a deposit now and the balance later, with refunds handled by clear rules." },
];

export default function About() {
  return (
    <div className="page">
      <section className="about-hero">
        <div>
          <p className="caps">About us</p>
          <h1>Every celebration deserves less stress and more joy.</h1>
          <p className="lead quiet">
            Celebrate brings every event service in Uganda into one place: venues, tents, catering, cakes, drinks,
            attire, sound, photography, MCs and games. Families compare trusted vendors, see one grand total and book
            everything together.
          </p>
        </div>
        <div className="about-photo"><Art photo="hero-right" eager /></div>
      </section>

      <section className="about-story">
        <h2 className="caps">Our story</h2>
        <div>
          <p>
            Planning an introduction, a wedding or a graduation party usually means weeks of phone calls, visits and
            negotiations, with prices that change and costs that appear at the last minute. We started Celebrate to
            change that.
          </p>
          <p>
            Our name says it: <em>Tukusanyukidde</em>, we are happy with you. We want families to spend their time
            celebrating, not chasing vendors, and we want the hard-working businesses behind every event to find new
            customers wherever they are.
          </p>
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>What we stand for</h2></div>
        <ul className="value-grid">
          {VALUES.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <Icon size={28} strokeWidth={1.4} aria-hidden="true" />
              <h3>{title}</h3>
              <p className="quiet">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="block">
        <div className="block-head"><h2>The team</h2><Link to="/team" className="link-caps">Meet everyone</Link></div>
        <ul className="team-grid compact">
          {TEAM.slice(0, 4).map((person, index) => <TeamCard key={index} person={person} short />)}
        </ul>
      </section>

      <section className="intro narrow">
        <h2 className="caps">Start planning</h2>
        <p className="lead">Tell us your budget and we will suggest a complete plan, with every shilling shown.</p>
        <div className="post-end center">
          <Link to="/budget" className="button fit dark">Plan my budget</Link>
          <Link to="/vendors" className="link-caps">List my business</Link>
        </div>
      </section>
    </div>
  );
}
