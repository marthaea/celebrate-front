import { Link } from "react-router-dom";
import { api, useLoad } from "../api.js";
import { formatDate, money } from "../format.js";
import { BottomNav, ErrorNote, Loading, Strip } from "../components/ui.jsx";

export default function Bookings() {
  const { data, error, loading } = useLoad(api.bookings, []);
  return (
    <main className="screen with-nav">
      <header className="head">
        <p className="eyebrow">Bookings</p>
        <h1>Your events</h1>
      </header>
      <Strip />
      <div className="body">
        <ErrorNote>{error}</ErrorNote>
        {loading && <Loading />}
        {data && data.length === 0 && (
          <>
            <p className="callout">No bookings yet. Once you pay for a plan, its receipt and vendor updates appear here.</p>
            <Link to="/browse" className="btn btn-primary">Browse services</Link>
          </>
        )}
        <ul className="vendors">
          {data?.map((booking) => {
            const waiting = booking.vendors.filter((v) => v.status !== "Confirmed").length;
            return (
              <li key={booking.id}>
                <Link to={`/receipt/${booking.id}`} className="card booking">
                  <span>
                    <strong>{booking.event.type} · {formatDate(booking.event.date)}</strong>
                    <small>{booking.id} · {booking.event.district} · {money(booking.paid)}</small>
                  </span>
                  <span className={`status ${waiting ? "waiting" : "confirmed"}`}>{waiting ? `${waiting} waiting` : "Confirmed"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <BottomNav />
    </main>
  );
}
