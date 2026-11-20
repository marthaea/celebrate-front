import { Link } from "react-router-dom";
import { PageHead } from "../components.jsx";

const SECTIONS = [
  {
    title: "What we collect",
    points: [
      "Your name and mobile number, when you open an account, and when you accepted our terms. We send a one-time code by SMS to that number to sign you in; there is no password.",
      "The name given when someone makes a pledge on a shared plan.",
      "Your event details: the type of event, date, district, number of guests and the services you choose.",
      "Your mobile money number, only when you pay with mobile money. We never see or store your PIN, and we do not store card numbers.",
      "Messages you send to vendors through Celebrate.",
      "Your event's location, so vendors can deliver and set up.",
      "If you report a problem after your event: what you tell us and any photos or files you add as evidence.",
      "If you list a business: its details and contacts, a registration certificate or national ID, photos of your work, your services and prices, and your acceptance of the vendor agreement.",
      "Pledges made towards a shared plan: the name given, the amount and what it is for.",
    ],
  },
  {
    title: "What stays on your own device",
    points: [
      "Your plan, your language choice, your budget, your checklist ticks, your sign-in and a copy of your bookings are kept in your browser so the site works on a poor connection. Signing out removes the sign-in and the copy of your bookings; clearing your browser data removes the rest.",
      "We do not use advertising or tracking cookies.",
    ],
  },
  {
    title: "How we use it",
    points: [
      "To work out your grand total, take your booking and tell the vendors you chose.",
      "To let you and your vendors arrange the event through messages and appointments.",
      "To show a shared plan and its pledges to the people you send the link to.",
      "To check, with Cloudflare Turnstile, that a sign-in comes from a person and not an automated program.",
    ],
  },
  {
    title: "Who sees it",
    points: [
      "The vendors on your booking see your name, your event details and location, your settings for their service and the messages you send them. They never see your mobile number.",
      "A vendor's registration certificate or national ID is seen only by that vendor and the Celebrate team. Photos of their work are shown on their listings.",
      "Evidence for a complaint is seen by the host, the vendor concerned and the Celebrate team.",
      "Your bookings, receipts, messages and appointments can only be opened when you are signed in to your account. A vendor scanning your receipt's QR code sees what was booked and whether it is paid, and your first name.",
      "The Celebrate team can see your account, bookings and payments, to run the service, to help you, and to decide cancellations and complaints fairly.",
      "Vendors and customers do not receive each other's phone numbers or email addresses. Phone numbers and email addresses typed into a message are removed before it is delivered.",
      "Anyone with the link to a shared plan can see that plan and the pledges made to it. Share the link only with people you trust.",
      "Cloudflare receives technical details about your browser when it runs the login check, under its own privacy policy.",
      "Our payment providers receive what they need to take a payment.",
      "We do not sell your information.",
    ],
  },
  {
    title: "How long we keep it",
    points: [
      "Bookings, messages and appointments are kept for as long as they are needed to deliver your event and to meet legal and accounting duties, and are then deleted or made anonymous.",
    ],
  },
  {
    title: "Your rights",
    points: [
      "Under Uganda's Data Protection and Privacy Act, 2019, you can ask to see the information we hold about you, have it corrected, have it deleted, or object to how it is used.",
      "You can also complain to the Personal Data Protection Office.",
    ],
  },
];

export default function Privacy() {
  return (
    <div className="page prose">
      <PageHead eyebrow="Privacy" title="How Celebrate looks after your information">
        <p className="quiet">In plain words: what we collect, why, who sees it and what you can do about it.</p>
      </PageHead>

      <p className="aside-note">
        <strong>Draft.</strong> Celebrate is still being built: payments are simulated and accounts are not yet connected.
        This policy describes how the site is designed to handle information and must be reviewed by a lawyer, and
        completed with our contact details, before launch.
      </p>

      {SECTIONS.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>
        </section>
      ))}

      <section>
        <h2>Contact</h2>
        <p>Our contact details for privacy questions will be published here before launch.</p>
      </section>
      <Link to="/" className="link-caps">Back to home</Link>
    </div>
  );
}
