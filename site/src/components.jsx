import { useEffect, useRef, useState } from "react";
import { Bell, ChevronLeft, ChevronRight, Scale } from "lucide-react";
import { toISODate } from "../../src/format.js";
import { useLoad } from "../../src/api.js";
import { more } from "./extra.js";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Building2, CakeSlice, Camera, Gamepad2, Martini, Mic, Search, Shirt, Speaker, Tent, Utensils, X } from "lucide-react";
import { discountPercent, money } from "../../src/format.js";
import { usePlan } from "../../src/plan.jsx";
import { PHOTOS } from "./photos.js";
import { useAccount } from "./account.jsx";
import { COMPARE_LIMIT, useCompare } from "./compare.jsx";

const ICONS = {
  venues: Building2, tents: Tent, catering: Utensils, cakes: CakeSlice,
  sound: Speaker, photos: Camera, mcs: Mic, games: Gamepad2, drinks: Martini, attire: Shirt,
};

/**
 * Stand-in for photography: a dark, grained colour field with a fine line drawing.
 * `seed` shifts the light so neighbouring tiles do not look identical.
 */
export function Art({ category = "venues", seed = 0, className = "", label, photo, eager = false }) {
  const picture = PHOTOS[photo] ?? PHOTOS[`cat:${category}`];
  if (picture) {
    return (
      <div className={`art art-photo ${className}`}>
        <img src={picture.src} alt={picture.alt} loading={eager ? "eager" : "lazy"} decoding="async" onLoad={(e) => e.currentTarget.classList.add("in")} ref={(img) => img?.complete && img.classList.add("in")} />
      </div>
    );
  }
  const Icon = ICONS[category] ?? Building2;
  const x = 20 + ((seed * 37) % 60);
  const y = 15 + ((seed * 53) % 50);
  return (
    <div className={`art art-${category} ${className}`} style={{ "--lx": `${x}%`, "--ly": `${y}%` }} role="img" aria-label={label ?? "Photograph to come"}>
      <Icon strokeWidth={0.5} aria-hidden="true" />
    </div>
  );
}

export function Mark({ className = "" }) {
  return (
    <svg className={`mark ${className}`} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill="#d42b2b" />
      <g stroke="#fff7e6" strokeWidth="3" strokeLinecap="round">
        <path d="M32 7v7M19.5 10.5l3 6M44.5 10.5l-3 6" />
      </g>
      <path d="M17 27l5 23q10 6 20 0l5-23z" fill="#f2b31c" />
      <path d="M19.5 31l4.5 19 4-19 4 21 4-21 4 19 4.500-19" fill="none" stroke="#24140f" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
      <ellipse cx="32" cy="27" rx="15" ry="5.500" fill="#fff7e6" />
    </svg>
  );
}

/** The logo: the drum mark beside the name. */
export function Logo({ className = "" }) {
  return <span className={`logo ${className}`}><Mark /><span className="wordmark">CELEBRATE</span></span>;
}

/**
 * E2 and D5: the signed-in host's notifications (payments, vendors' answers, reminders 7 days and
 * 1 day before). A real backend also sends these by SMS. Read status is kept on this device.
 */
function Notifications() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem("celebrate.seen.v1") ?? "";
    } catch {
      return "";
    }
  });
  const { data } = useLoad(() => more.notifications().catch(() => []), [pathname]);
  const unread = (data ?? []).filter((note) => note.at > seen).length;
  const toggle = () => {
    if (!open && data?.length) {
      const latest = data[0].at;
      setSeen(latest);
      try {
        localStorage.setItem("celebrate.seen.v1", latest);
      } catch {
        // Counted again next visit.
      }
    }
    setOpen(!open);
  };
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="bell">
      <button className="icon-button" onClick={toggle} aria-expanded={open} aria-label={`Notifications${unread ? `, ${unread} new` : ""}`}>
        <Bell size={17} strokeWidth={1.6} />
        {unread > 0 && <span className="bell-count">{unread}</span>}
      </button>
      {open && (
        <div className="bell-list" role="dialog" aria-label="Notifications">
          {!data?.length && <p className="quiet">Nothing yet. Payments, vendors' answers and reminders appear here.</p>}
          {data?.slice(0, 12).map((note) => (
            <Link key={note.id} to={note.link ?? "/bookings"} className={note.at > seen ? "new" : ""}>
              <span>{note.text}</span>
              <small className="quiet">{new Date(note.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Header({ overHero }) {
  const { items } = usePlan();
  const { customer } = useAccount();
  const navigate = useNavigate();
  const [atTop, setAtTop] = useState(true);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onScroll = () => setAtTop(window.scrollY < window.innerHeight - 90);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const submit = (event) => {
    event.preventDefault();
    setSearching(false);
    navigate(query.trim() ? `/services?q=${encodeURIComponent(query.trim())}` : "/services");
  };

  const light = overHero && atTop && !searching;
  return (
    <header className={`header ${light ? "light" : ""}`}>
      <nav className="header-side" aria-label="Main">
        <NavLink to="/services">Services</NavLink>
        <NavLink to="/budget">Budget</NavLink>
        <Link to="/#offers" className="hide-small">Offers</Link>
        <NavLink to="/vendors" className="hide-small">For vendors</NavLink>
        <NavLink to="/about" className="hide-small">About</NavLink>
        <NavLink to="/blog" className="hide-small">Blog</NavLink>
      </nav>
      <Link to="/" className={`brand ${overHero && atTop ? "hidden" : ""}`} aria-label="Celebrate, home"><Logo /></Link>
      <nav className="header-side right" aria-label="Your account">
        <button className="icon-button" onClick={() => setSearching(!searching)} aria-label={searching ? "Close search" : "Search services"} aria-expanded={searching}>
          {searching ? <X size={16} strokeWidth={1.4} /> : <Search size={16} strokeWidth={1.4} />}
        </button>
        {customer && <Notifications />}
        <NavLink to="/account" className="hide-small">{customer ? customer.name.split(" ")[0] : "Log in"}</NavLink>
        <NavLink to="/bookings" className="hide-small">Bookings</NavLink>
        <NavLink to="/plan" className="plan-pill"><span className="hide-tiny">My plan</span> <span className="count">{items.length}</span></NavLink>
      </nav>
      {searching && (
        <form className="search-row" onSubmit={submit} role="search">
          <input autoFocus type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try: tents in Mukono" aria-label="Search services" />
          <button className="link-caps">Search</button>
        </form>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-lead">
          <p className="footer-line">Tukusanyukidde.</p>
          <p className="quiet">Every event service, one platform, one grand total.</p>
        </div>
        <nav aria-label="Plan">
          <h2 className="caps">Plan</h2>
          <Link to="/services">Services</Link>
          <Link to="/budget">Budget planner</Link>
          <Link to="/#offers">Offers</Link>
          <Link to="/plan">My plan</Link>
        </nav>
        <nav aria-label="Your account">
          <h2 className="caps">You</h2>
          <Link to="/account">Account</Link>
          <Link to="/bookings">Bookings</Link>
          <Link to="/bookings#visits">Appointments</Link>
        </nav>
        <nav aria-label="Celebrate">
          <h2 className="caps">Celebrate</h2>
          <Link to="/about">About us</Link>
          <Link to="/team">Our team</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/vendors">List my business</Link>
          <Link to="/vendor">Vendor sign in</Link>
          <Link to="/admin">Admin</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
      </div>
      <p className="footer-small">Central · Eastern · Northern · Western Uganda · Photographs from Pexels, for illustration.</p>
      <p className="footer-word" aria-hidden="true">CELEBRATE</p>
    </footer>
  );
}

/** One piece in a grid: image, name, price, vendor, and a tick box to compare it with others. */
export function ServiceCard({ service, index = 0 }) {
  const { items } = usePlan();
  const compare = useCompare();
  const off = discountPercent(service);
  const ticked = compare.ids.includes(service.id);
  const full = !ticked && compare.ids.length >= COMPARE_LIMIT;
  return (
    <div className="piece-wrap">
      <Link to={`/service/${service.id}`} className="piece">
        <div className="piece-art">
          {service.photoUrls?.length
            ? <div className="art art-photo"><img className="in" src={service.photoUrls[0]} alt={service.name} loading="lazy" /></div>
            : <Art category={service.category} photo={service.id} seed={index + service.name.length} label={service.photoCaption} />}
          {off > 0 && <span className="tag">{off}% off</span>}
          {items.includes(service.id) && <span className="tag in-plan">In my plan</span>}
          <span className="piece-view">View</span>
        </div>
        <h3>{service.name}</h3>
        <p className="piece-price">{money(service.price)} <span className="quiet">/ {service.unit}</span></p>
        <p className="quiet">{service.vendor} · {service.district} · {service.reviews ? `★ ${service.rating}` : "New"}</p>
      </Link>
      <label className={`compare-tick ${ticked ? "on" : ""}`}>
        <input type="checkbox" checked={ticked} disabled={full} onChange={() => compare.toggle(service.id)} />
        {full ? `Compare up to ${COMPARE_LIMIT}` : "Compare"}
      </label>
    </div>
  );
}

/** A bar along the bottom once something is ticked to compare. */
export function CompareBar() {
  const { ids, clear } = useCompare();
  if (!ids.length) return null;
  return (
    <div className="compare-bar" role="region" aria-label="Compare">
      <p><Scale size={18} aria-hidden="true" /> {ids.length} of {COMPARE_LIMIT} chosen</p>
      <button className="link-quiet" onClick={clear}>Clear</button>
      {ids.length > 1
        ? <Link to={`/compare?ids=${ids.join(",")}`} className="button fit sun">Compare</Link>
        : <span className="quiet">Tick one more to compare</span>}
    </div>
  );
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** A month of a vendor's availability. Free days can be picked; taken and past days cannot. */
export function Calendar({ serviceId, value, onPick }) {
  const [month, setMonth] = useState(value.slice(0, 7));
  const { data, error } = useLoad(() => more.month(serviceId, month), [serviceId, month]);
  const today = toISODate(new Date());
  const [year, m] = month.split("-").map(Number);
  const first = new Date(year, m - 1, 1);
  const blanks = (first.getDay() + 6) % 7; // weeks start on Monday
  const count = new Date(year, m, 0).getDate();
  const step = (by) => setMonth(toISODate(new Date(year, m - 1 + by, 1)).slice(0, 7));
  const booked = new Set(data?.booked);

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button type="button" className="icon-button" onClick={() => step(-1)} disabled={month <= today.slice(0, 7)} aria-label="Previous month"><ChevronLeft size={18} /></button>
        <p aria-live="polite">{first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
        <button type="button" className="icon-button" onClick={() => step(1)} aria-label="Next month"><ChevronRight size={18} /></button>
      </div>
      <div className="calendar-grid">
        {WEEKDAYS.map((day) => <span key={day} className="calendar-day-name">{day}</span>)}
        {Array.from({ length: blanks }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: count }, (_, i) => {
          const iso = `${month}-${String(i + 1).padStart(2, "0")}`;
          const taken = booked.has(iso);
          const past = iso < today;
          return (
            <button type="button" key={iso} disabled={taken || past || !data} onClick={() => onPick(iso)}
              className={`${taken ? "taken" : ""} ${iso === value ? "picked" : ""}`} aria-pressed={iso === value}
              aria-label={`${i + 1} ${first.toLocaleDateString("en-GB", { month: "long" })}${taken ? ", booked" : past ? ", past" : ", free"}`}>
              {i + 1}
            </button>
          );
        })}
      </div>
      {error && <p className="field-error">{error}</p>}
      <p className="calendar-key"><span className="key free" /> Free <span className="key taken" /> Booked <span className="key picked" /> Your date</p>
    </div>
  );
}

/** The loader: the drum beats and its three sparks pop in turn. */
export function Loading({ label = "Loading" }) {
  return (
    <div className="loader" role="status">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="32" fill="#d42b2b" />
        <g stroke="#fff7e6" strokeWidth="3" strokeLinecap="round">
          <path className="spark" d="M19.5 10.5l3 6" />
          <path className="spark" d="M32 7v7" />
          <path className="spark" d="M44.5 10.5l-3 6" />
        </g>
        <g className="beat">
          <path d="M17 27l5 23q10 6 20 0l5-23z" fill="#f2b31c" />
          <path d="M19.5 31l4.5 19 4-19 4 21 4-21 4 19 4.500-19" fill="none" stroke="#24140f" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
          <ellipse cx="32" cy="27" rx="15" ry="5.500" fill="#fff7e6" />
        </g>
      </svg>
      <p>{label}…</p>
    </div>
  );
}
export const ErrorNote = ({ children }) => (children ? <p className="error" role="alert">{children}</p> : null);

export const PageHead = ({ eyebrow, title, children }) => (
  <header className="page-head">
    {eyebrow && <p className="caps">{eyebrow}</p>}
    <h1>{title}</h1>
    {children}
  </header>
);

/** The itemised plan with every cost and the grand total. */
export function Summary({ quote, categories, onRemove, deposit }) {
  const titleFor = (id) => (categories?.find((c) => c.id === id)?.title ?? "");
  return (
    <>
      <ul className="lines">
        {quote.lines.map((line) => (
          <li key={line.id}>
            <div>
              <p>{titleFor(line.category)}</p>
              <p className="quiet">{line.detail} · {line.vendor}</p>
              {line.settings && <p className="line-settings">{line.settings}</p>}
              {onRemove && (
                <p className="line-actions">
                  <Link className="link-quiet" to={`/service/${line.id}`}>Change settings</Link>
                  <button className="link-quiet" onClick={() => onRemove(line.id)} aria-label={`Remove ${line.name}`}>Remove</button>
                </p>
              )}
            </div>
            <p className="num">{money(line.amount)}</p>
          </li>
        ))}
      </ul>
      <dl className="sums">
        <div><dt>Item cost</dt><dd>{money(quote.itemCost)}</dd></div>
        <div><dt>Labour and setup</dt><dd>{money(quote.labour)}</dd></div>
        <div><dt>Transport</dt><dd>{money(quote.transport)}</dd></div>
        <div><dt>Platform fee ({Math.round(quote.feeRate * 100)}%)</dt><dd>{money(quote.platformFee)}</dd></div>
      </dl>
      <div className="grand">
        <p className="caps">Grand total</p>
        <p className="grand-total">{money(quote.total)}</p>
        <p className="quiet">No hidden costs. This is all you pay.</p>
        {deposit && <p className="quiet">Pay {money(Math.round(quote.total * deposit))} now to book; the rest, {money(quote.total - Math.round(quote.total * deposit))}, on the day.</p>}
      </div>
    </>
  );
}

/**
 * Cloudflare Turnstile: a check that the visitor is a person. Calls onToken with the proof, or "" when it lapses.
 * A proof works once; change `resetKey` to ask for a new one after a failed try.
 */
export function HumanCheck({ siteKey, onToken, onProblem, resetKey = 0 }) {
  const box = useRef(null);
  useEffect(() => {
    if (!siteKey) return undefined;
    let widget;
    let gone = false;
    const show = () => {
      if (gone || !box.current || !window.turnstile) return;
      widget = window.turnstile.render(box.current, {
        sitekey: siteKey,
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onProblem("The security check could not run. Check your connection and reload the page."),
      });
    };
    if (window.turnstile) show();
    else {
      let script = document.getElementById("turnstile-script");
      if (!script) {
        script = document.createElement("script");
        script.id = "turnstile-script";
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        document.head.append(script);
      }
      script.addEventListener("load", show);
      script.addEventListener("error", () => onProblem("The security check could not load. Check your connection and reload the page."));
    }
    return () => {
      gone = true;
      if (widget !== undefined) window.turnstile?.remove(widget);
    };
  }, [siteKey, resetKey]);
  return <div ref={box} className="human-check" />;
}

/** The sign-in form shared by the vendor and admin interfaces. */
export function StaffSignIn({ title, eyebrow, intro, askName, demoHint, turnstile, onSubmit, children }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [tries, setTries] = useState(0);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      await onSubmit({ name, password, token });
    } catch (err) {
      setError(err.message);
      setSending(false);
      setToken("");
      setTries(tries + 1);
    }
  };

  return (
    <div className="page centre-page">
      <Mark className="big" />
      <PageHead eyebrow={eyebrow} title={title}><p className="quiet">{intro}</p></PageHead>
      <form className="form narrow" onSubmit={submit}>
        {askName && (
          <label className="field">
            <span className="caps">Business name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="organization" placeholder="e.g. Mama's Kitchen" maxLength={60} required />
          </label>
        )}
        <label className="field">
          <span className="caps">Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        <div className="field">
          <span className="caps">Security check</span>
          <HumanCheck siteKey={turnstile?.siteKey} onToken={setToken} onProblem={setError} resetKey={tries} />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button" disabled={!token || !password || sending}>{sending ? "Checking…" : "Sign in"}</button>
        {demoHint && <p className="aside-note"><strong>Demo mode.</strong> {demoHint}</p>}
      </form>
      {children}
    </div>
  );
}

const MONTH_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** A month the vendor controls: tap a day to mark it busy or free. Days with an event booked are fixed. */
export function BusyCalendar({ busy, events, onToggle }) {
  const today = toISODate(new Date());
  const [month, setMonth] = useState(today.slice(0, 7));
  const [year, m] = month.split("-").map(Number);
  const first = new Date(year, m - 1, 1);
  const blanks = (first.getDay() + 6) % 7;
  const count = new Date(year, m, 0).getDate();
  const step = (by) => setMonth(toISODate(new Date(year, m - 1 + by, 1)).slice(0, 7));

  return (
    <div className="calendar wide">
      <div className="calendar-head">
        <button type="button" className="icon-button" onClick={() => step(-1)} disabled={month <= today.slice(0, 7)} aria-label="Previous month"><ChevronLeft size={18} /></button>
        <p aria-live="polite">{first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
        <button type="button" className="icon-button" onClick={() => step(1)} aria-label="Next month"><ChevronRight size={18} /></button>
      </div>
      <div className="calendar-grid">
        {MONTH_DAYS.map((day) => <span key={day} className="calendar-day-name">{day}</span>)}
        {Array.from({ length: blanks }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: count }, (_, i) => {
          const iso = `${month}-${String(i + 1).padStart(2, "0")}`;
          const event = events.includes(iso);
          const blocked = busy.includes(iso);
          return (
            <button type="button" key={iso} disabled={iso < today || event} onClick={() => onToggle(iso, !blocked)}
              className={`${event ? "event" : ""} ${blocked ? "busy" : ""}`} aria-pressed={blocked}
              aria-label={`${i + 1} ${first.toLocaleDateString("en-GB", { month: "long" })}${event ? ", event booked" : blocked ? ", marked busy" : ", free"}`}>
              {i + 1}
            </button>
          );
        })}
      </div>
      <p className="calendar-key"><span className="key free" /> Free <span className="key busy" /> Busy (you) <span className="key event" /> Event booked</p>
    </div>
  );
}

/**
 * A file that only some people may see (a vendor's ID, complaint evidence). It is fetched with the
 * viewer's sign-in and shown from memory; `token` is that sign-in.
 */
export function PrivateFile({ file, token }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let made = "";
    fetch(file.url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((response) => (response.ok ? response.blob() : Promise.reject()))
      .then((blob) => {
        made = URL.createObjectURL(blob);
        setUrl(made);
      })
      .catch(() => setFailed(true));
    return () => made && URL.revokeObjectURL(made);
  }, [file.url, token]);
  if (failed) return <span className="quiet">{file.name} (could not be opened)</span>;
  if (!url) return <span className="quiet">Opening {file.name}…</span>;
  return file.type.startsWith("image/")
    ? <a href={url} target="_blank" rel="noreferrer" className="file-thumb"><img src={url} alt={file.name} /></a>
    : <a href={url} download={file.name} className="chip">Open {file.name}</a>;
}

/** A button that picks files and uploads them; calls onAdded with each uploaded file's details. */
export function FileButton({ label, purpose, accept = "image/*,application/pdf", multiple = false, upload, onAdded, onError }) {
  const [busy, setBusy] = useState(false);
  const pick = async (event) => {
    const files = [...event.target.files];
    event.target.value = "";
    setBusy(true);
    try {
      const { prepareFile } = await import("./upload.js");
      for (const file of files) onAdded(await upload(await prepareFile(file, purpose)));
    } catch (err) {
      onError?.(err.message);
    }
    setBusy(false);
  };
  return (
    <label className={`chip file-button ${busy ? "busy" : ""}`}>
      <input type="file" accept={accept} multiple={multiple} onChange={pick} disabled={busy} />
      {busy ? "Adding…" : label}
    </label>
  );
}

/**
 * A district picker with "Other…" at the end, which opens a box to type the area. `value` is the
 * district or the typed place; `onChange` gets the new value once it is a usable name.
 */
export function AreaSelect({ label = "District", value, onChange, districts = [], disabled = false }) {
  const listed = districts.includes(value);
  const [other, setOther] = useState(Boolean(value) && !listed);
  const [typed, setTyped] = useState(listed ? "" : value ?? "");
  const usable = (text) => /^[A-Za-z][A-Za-z .'-]{1,39}$/.test(text.trim());

  const pick = (choice) => {
    if (choice === "__other") {
      setOther(true);
      if (usable(typed)) onChange(typed.trim());
    } else {
      setOther(false);
      onChange(choice);
    }
  };
  const type = (text) => {
    setTyped(text);
    if (usable(text)) onChange(text.trim().replace(/\s+/g, " "));
  };

  return (
    <div className="field">
      <label className="field">
        <span className="caps">{label}</span>
        <select value={other ? "__other" : value} onChange={(e) => pick(e.target.value)} disabled={disabled}>
          {!value && !other && <option value="" disabled>Choose…</option>}
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          <option value="__other">Other…</option>
        </select>
      </label>
      {other && (
        <label className="field">
          <span className="caps">Your area</span>
          <input value={typed} onChange={(e) => type(e.target.value)} maxLength={40} placeholder="e.g. Kalangala" autoFocus disabled={disabled} aria-invalid={Boolean(typed) && !usable(typed)} />
          {typed && !usable(typed) && <small className="field-error">Use letters only, at least two.</small>}
        </label>
      )}
    </div>
  );
}
