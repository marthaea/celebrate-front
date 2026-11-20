import { Link } from "react-router-dom";
import { useLoad, api } from "../../../src/api.js";
import { PageHead } from "../components.jsx";

/** A draft that must be checked by a lawyer before launch, and says so. */
function Draft() {
  return (
    <p className="aside-note">
      <strong>Draft.</strong> Celebrate is still being built: payments are simulated. This text sets out how the
      service is designed to work and must be reviewed by a lawyer, and completed with our company details, before launch.
    </p>
  );
}

function Sections({ sections }) {
  return sections.map((section) => (
    <section key={section.title}>
      <h2>{section.title}</h2>
      <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>
    </section>
  ));
}

export function Terms() {
  const meta = useLoad(api.meta, []);
  const rules = meta.data?.rules;
  const deposit = Math.round((meta.data?.depositRate ?? 0.3) * 100);
  const sections = [
    {
      title: "Your account",
      points: [
        "You sign up with your name and a Ugandan mobile number. We send a code by SMS to check the number is yours; there is no password.",
        "Keep your phone safe: anyone who can read your SMS can sign in as you.",
        "You must be 18 or over to book and pay.",
      ],
    },
    {
      title: "Booking and paying",
      points: [
        "Celebrate shows one grand total: each vendor's price, labour, transport and our platform fee of 3%. That is all you pay.",
        `You pay a ${deposit}% deposit to book, and the balance on the day of the event. You can pay the balance earlier.`,
        "A payment is only taken once you approve it on your phone (or in your bank or card page). If it fails, nothing is booked until you pay.",
        `Each vendor accepts or declines your booking within ${rules?.respondHours ?? 24} hours. If a vendor cannot do it, we offer you a replacement or a full refund for that vendor.`,
      ],
    },
    {
      title: "Cancelling",
      points: [
        "You can cancel from your receipt and must give a reason. How much comes back depends on how early you cancel:",
        ...(rules?.refunds.map((rule) => rule.text) ?? ["Loading the refund rule…"]),
        "Refunds go back to the method you paid with.",
      ],
    },
    {
      title: "On the day, and after",
      points: [
        "Each vendor marks their part delivered. Confirm it on your receipt, or report a problem.",
        `If you do neither within ${rules?.confirmHours ?? 48} hours, delivery is confirmed for you and the vendor is paid.`,
        `If you report a problem, the vendor is not paid until we have looked at it. We review evidence from both sides within ${rules?.caseWorkingDays ?? 3} working days and decide any refund.`,
      ],
    },
    {
      title: "Fair use",
      points: [
        "Keep messages with vendors on Celebrate. Phone numbers and email addresses are removed from messages, so there is a record if anything goes wrong.",
        "Reviews must be honest and about your own event. We remove reviews that are abusive or not genuine.",
        "We may suspend an account that is used to mislead vendors or other hosts.",
      ],
    },
  ];
  return (
    <div className="page prose">
      <PageHead eyebrow="Terms" title="Terms of use for hosts">
        <p className="quiet">Version {meta.data?.versions.terms ?? ""}. What you agree to when you sign up and book. Read with our <Link to="/privacy" className="link-quiet">privacy notice</Link>.</p>
      </PageHead>
      <Draft />
      <Sections sections={sections} />
      <Link to="/" className="link-caps">Back to home</Link>
    </div>
  );
}

export function VendorAgreement() {
  const meta = useLoad(api.meta, []);
  const rules = meta.data?.rules;
  const sections = [
    {
      title: "Being listed",
      points: [
        "You give true details about your business and proof of who you are: a registration certificate or a national ID, and photos of work you have done.",
        "Celebrate checks every application before it goes live and may refuse it, giving a reason so you can fix it.",
        "Your listings show your own prices, discounts and what is included. Keep them accurate.",
        "Keep your calendar up to date: mark the days you cannot work, so hosts cannot book you then.",
      ],
    },
    {
      title: "Bookings",
      points: [
        `You accept or decline each booking within ${rules?.respondHours ?? 24} hours. If you do not answer, Celebrate may treat it as declined and offer the host someone else.`,
        "If you have to cancel an accepted booking, do it as early as you can and give the reason. Repeated cancellations can lead to your listing being suspended.",
        "Talk to hosts through Celebrate only. Do not ask for their phone number or for payment outside Celebrate.",
        "Mark your part delivered on the day.",
      ],
    },
    {
      title: "Getting paid",
      points: [
        "You are paid your listed price, labour and transport for each booking. Celebrate's platform fee of 3% is paid by the host on top.",
        `You are paid once the host confirms delivery, or ${rules?.confirmHours ?? 48} hours after you mark it delivered if they do not answer.`,
        `If the host reports a problem, your payment waits while Celebrate reviews both sides, within ${rules?.caseWorkingDays ?? 3} working days. Any refund the host is given comes out of that payment.`,
      ],
    },
    {
      title: "Accountability",
      points: [
        "Celebrate can see your bookings, messages, answers and reviews in order to run the marketplace fairly.",
        "Celebrate may suspend a listing for false information, poor service shown by complaints, or breaking this agreement.",
      ],
    },
  ];
  return (
    <div className="page prose">
      <PageHead eyebrow="For vendors" title="Vendor agreement">
        <p className="quiet">Version {meta.data?.versions.vendorAgreement ?? ""}. What you agree to when you list your business on Celebrate.</p>
      </PageHead>
      <Draft />
      <Sections sections={sections} />
      <Link to="/vendors" className="link-caps">List my business</Link>
    </div>
  );
}
