import { Link, NavLink } from "react-router-dom";
import {
  ArrowLeft, Building2, CakeSlice, Camera, ClipboardList, Gamepad2, Home, Mic, Search, Speaker, Tent, Ticket, Utensils,
} from "lucide-react";
import { api, useLoad } from "../api.js";
import { money } from "../format.js";
import { usePlan } from "../plan.jsx";

export const CATEGORY_ICONS = {
  venues: Building2, tents: Tent, catering: Utensils, cakes: CakeSlice,
  sound: Speaker, photos: Camera, mcs: Mic, games: Gamepad2,
};

/** The patterned band that separates sections, after the wireframe's kitenge-style strip. */
export const Strip = () => <div className="strip" aria-hidden="true" />;

export function Logo({ size = 84 }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 84 84" role="img" aria-label="CELEBRATE drum logo">
      <circle cx="42" cy="42" r="39.5" fill="none" stroke="var(--teal)" strokeWidth="3" />
      <path d="M26 32v20c0 4.4 7.2 8 16 8s16-3.6 16-8V32z" fill="var(--orange)" />
      <ellipse cx="42" cy="31" rx="16" ry="6" fill="#fff" />
      <path d="M30 40l12 16 12-16" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export const BackLink = ({ to, children = "Back", className = "" }) => (
  <Link to={to} className={`back ${className}`}>
    <ArrowLeft size={16} aria-hidden="true" /> {children}
  </Link>
);

/** Stand-in for a vendor photo until real photos are uploaded. */
export function Photo({ category, caption, className = "" }) {
  const Icon = CATEGORY_ICONS[category] ?? Building2;
  return (
    <div className={`photo ${className}`} role="img" aria-label={caption ?? "Photo coming soon"}>
      <Icon size={36} strokeWidth={1.4} aria-hidden="true" />
    </div>
  );
}

export const Loading = ({ label = "Loading…" }) => <p className="note" role="status">{label}</p>;

export const ErrorNote = ({ children }) => (children ? <p className="error" role="alert">{children}</p> : null);

export function BottomNav() {
  const tabs = [
    { to: "/home", label: "Home", Icon: Home },
    { to: "/browse", label: "Browse", Icon: Search },
    { to: "/plan", label: "My plan", Icon: ClipboardList },
    { to: "/bookings", label: "Bookings", Icon: Ticket },
  ];
  return (
    <nav className="bottom-nav" aria-label="Main">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
          <Icon size={22} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/** Sticky summary of the plan so far, shown while browsing. */
export function PlanBar() {
  const { items, event } = usePlan();
  const quote = useLoad(() => (items.length ? api.quote(event, items) : Promise.resolve(null)), [items.join(","), JSON.stringify(event)]);
  if (!items.length) return null;
  return (
    <div className="plan-bar">
      <div>
        <p className="plan-bar-label">My plan · {items.length} {items.length === 1 ? "service" : "services"}</p>
        <p className="plan-bar-total">{quote.data ? money(quote.data.itemCost) : quote.error ? "Ready to total" : "Adding up…"}</p>
      </div>
      <Link to="/details" className="btn btn-primary btn-small">View plan</Link>
    </div>
  );
}
