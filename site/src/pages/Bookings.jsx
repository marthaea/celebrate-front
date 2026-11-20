import { Link } from "react-router-dom";
import { useLoad } from "../../../src/api.js";
import { formatDate, money } from "../../../src/format.js";
import { ErrorNote, Loading, PageHead } from "../components.jsx";
import { useState } from "react";
import { daysUntil, localBookings, more, Offline } from "../extra.js";
import { useAccount } from "../account.jsx";

export default function Bookings() {
  const { customer } = useAccount();
  // The account's bookings from the server; offline, the copies kept in this browser.
  const { data, error, loading } = useLoad(async () => {
    if (!customer) return [];
    try {
      return await more.myBookings();
    } catch (problem) {
      const mine = localBookings.all();
      if (problem instanceof Offline && mine.length) return mine;
      throw problem;
    }
  }, [customer?.id]);
  const [changed, setChanged] = useState(0);
  const visits = useLoad(() => (customer ? more.myVisits() : Promise.resolve([])), [changed, customer?.id]);
  const cancel = async (visitId) => {
    await more.cancelVisit(visitId).catch(() => {});
    setChanged(changed + 1);
  };

  if (!customer) {
    return (
      <div className="page centre-page">
        <PageHead eyebrow="Bookings" title="Your events">
          <p className="quiet">Sign in to see your bookings, receipts, messages with vendors and appointments.</p>
        </PageHead>
        <Link to="/account?next=/bookings" className="button fit">Log in</Link>
      </div>
    );
  }

  return (
    <div className="page centre-page wide">
      <PageHead eyebrow="Bookings" title="Your events" />
      <ErrorNote>{error}</ErrorNote>
      {loading && <Loading />}
      {data && data.length === 0 && (
        <>
          <p className="quiet">No bookings yet. Once you pay for a plan, its receipt and vendor updates appear here.</p>
          <Link to="/services" className="button fit">Browse services</Link>
        </>
      )}
      {data && data.length > 0 && (
        <ul className="lines bookings">
          {[...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((booking) => {
            const waiting = booking.vendors.filter((v) => v.status === "Waiting").length;
            const trouble = booking.vendors.filter((v) => ["Declined", "Cancelled"].includes(v.status) && v.cancelled?.by !== "customer").length;
            const state = booking.status === "awaiting_payment" ? ["waiting", "Finish paying"]
              : booking.status === "cancelled" ? ["off", "Cancelled"]
              : trouble ? ["waiting", `${trouble} to replace`]
              : waiting ? ["waiting", `${waiting} waiting`] : ["confirmed", "Confirmed"];
            return (
              <li key={booking.id}>
                <Link to={booking.status === "awaiting_payment" ? `/pay/${booking.id}` : `/receipt/${booking.id}`}>
                  <span>{booking.event.type} · {formatDate(booking.event.date)}<small className="quiet">{booking.id} · {booking.event.district} · {money(booking.paid)}{daysUntil(booking.event.date) > 0 ? ` · ${daysUntil(booking.event.date)} days to go` : ""}</small></span>
                  <span className={`state ${state[0]}`}>{state[1]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <section className="visits" id="visits">
        <h2 className="caps">Appointments</h2>
        <ErrorNote>{visits.error}</ErrorNote>
        {visits.data?.length === 0 && <p className="quiet">No tastings, fittings or viewings yet. Open any service and choose a time to meet the vendor.</p>}
        {visits.data?.length > 0 && (
          <ul className="lines">
            {[...visits.data].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map((visit) => (
              <li key={visit.id}>
                <div>
                  <p><strong>{visit.kind}</strong> · {formatDate(visit.date)} at {visit.time}</p>
                  <p className="quiet"><Link to={`/service/${visit.serviceId}`} className="link-quiet">{visit.service}</Link> · {visit.vendor} · {visit.district} · {visit.id}</p>
                </div>
                {visit.status === "Cancelled"
                  ? <span className="state">Cancelled</span>
                  : <span className="visit-actions"><span className="state waiting">{visit.status}</span><button className="link-quiet" onClick={() => cancel(visit.id)}>Cancel</button></span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
