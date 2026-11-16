import { Link, useParams } from "react-router-dom";
import { Check } from "lucide-react";
import { api, useLoad } from "../api.js";
import { formatDate, money } from "../format.js";
import { ErrorNote, Loading, Strip } from "../components/ui.jsx";

export default function Receipt() {
  const { id } = useParams();
  const { data: booking, error, loading } = useLoad(() => api.booking(id), [id]);

  return (
    <main className="screen">
      <Strip />
      <header className="head center">
        <span className="tick"><Check size={30} strokeWidth={3.5} aria-hidden="true" /></span>
        <h1 className="thanks">Webale nnyo!</h1>
        <p className="sub">Thank you{booking?.customer ? `, ${booking.customer}` : ""}. Your event is booked.</p>
      </header>
      <div className="body">
        <ErrorNote>{error}</ErrorNote>
        {loading && <Loading />}
        {booking && (
          <>
            <dl className="card receipt">
              <div><dt>E-receipt no.</dt><dd>{booking.id}</dd></div>
              <div><dt>Paid</dt><dd>{money(booking.paid)}</dd></div>
              <div><dt>Method</dt><dd>{booking.method}</dd></div>
              <div><dt>Event</dt><dd>{formatDate(booking.event.date)} · {booking.event.district}</dd></div>
            </dl>

            <h2>Track your vendors</h2>
            <ul className="vendors">
              {booking.vendors.map((v) => (
                <li key={`${v.category}-${v.vendor}`} className="card">
                  <span>{v.category} · {v.vendor}</span>
                  <span className={`status ${v.status === "Confirmed" ? "confirmed" : "waiting"}`}>{v.status}</span>
                </li>
              ))}
            </ul>

            <a className="btn btn-primary" href={`/api/bookings/${booking.id}/receipt`} download>Download e-receipt</a>
          </>
        )}
        <Link to="/home" className="text-link center-link">Back to home</Link>
      </div>
    </main>
  );
}
