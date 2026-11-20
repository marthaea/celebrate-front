import { Link } from "react-router-dom";
import { TEAM } from "../team.js";
import { PageHead, Reveal } from "../components.jsx";

/** One person: photo, name, role and an optional short line. Each card gets its own accent tint. */
export function TeamCard({ person, index = 0, short = false }) {
  return (
    <Reveal as="li" index={index} className={`team-card accent-${index % 10}`}>
      <div className="team-photo">
        <img src={person.photo} alt={person.name} loading="lazy" width="400" height="500" />
      </div>
      <p className="team-name">{person.name}</p>
      <p className="caps quiet">{person.role}</p>
      {!short && person.bio && <p className="team-bio quiet">{person.bio}</p>}
    </Reveal>
  );
}

export default function Team() {
  return (
    <div className="page">
      <PageHead eyebrow="Our team" title="The people behind Celebrate">
        <p className="quiet">We are building one place where families anywhere in Uganda can find, compare and book everything for their celebration.</p>
      </PageHead>
      <ul className="team-grid">
        {TEAM.map((person, index) => <TeamCard key={index} person={person} index={index} />)}
      </ul>
      <section className="intro narrow">
        <h2 className="caps">Work with us</h2>
        <p className="lead">Run an events business? Bring it to the families planning their next celebration.</p>
        <Link to="/vendors" className="button fit dark">List my business</Link>
      </section>
    </div>
  );
}
