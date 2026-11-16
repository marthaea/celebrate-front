import { Link, useParams } from "react-router-dom";
import { BadgeCheck, CircleAlert } from "lucide-react";
import { formatDate, money } from "../../../src/format.js";
import { Loading, PageHead } from "../components.jsx";
import { useBooking } from "./Receipt.jsx";

/** Where a receipt's QR code leads: vendors use it to check that a booking is real. */
export default function Verify() {
  const { id } = useParams();
  const { data: booking, error, loading } = useBooking(id);

  if (loading) return <div className="page centre-page"><Loading label="Checking this receipt" /></div>;
  if (error || !booking) {
    return (
      <div className="page centre-page">
        <span className="verdict bad"><CircleAlert size={40} aria-hidden="true" /></span>
        <PageHead eyebrow="Receipt check" title="We have no booking with this number">
          <p className="quiet">{id} does not match any booking. Ask the customer to show their receipt again, or do not go ahead.</p>
        </PageHead>
        <Link to="/" className="link-caps">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="page centre-page">
      <span className="verdict good"><BadgeCheck size={40} aria-hidden="true" /></span>
      <PageHead eyebrow="Receipt check" title="This booking is genuine">
        <p className="quiet">{booking.id} · {booking.balance ? `deposit of ${money(booking.paid)} paid, ${money(booking.balance)} due on the day` : `paid in full, ${money(booking.paid)}`}</p>
      </PageHead>
      <div className="receipt">
        <dl className="sums ruled">
          {booking.customer && <div><dt>Booked by</dt><dd>{booking.customer}</dd></div>}
          <div><dt>Event</dt><dd>{booking.event.type} · {formatDate(booking.event.date)}</dd></div>
          <div><dt>District</dt><dd>{booking.event.district}</dd></div>
          <div><dt>Guests</dt><dd>{booking.event.guests.toLocaleString("en-US")}</dd></div>
        </dl>
        <h2 className="caps">What was booked</h2>
        <ul className="lines">
          {booking.quote.lines.map((line) => (
            <li key={line.id}>
              <div><p>{line.name}</p><p className="quiet">{line.detail} · {line.vendor}</p></div>
              <p className="num">{money(line.amount)}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
