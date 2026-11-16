import { Link } from "react-router-dom";
import { Logo, Strip } from "../components/ui.jsx";

export default function Welcome() {
  return (
    <main className="screen welcome">
      <Strip />
      <div className="welcome-body">
        <Logo />
        <p className="eyebrow">Tukusanyukidde · Welcome</p>
        <h1 className="wordmark">CELEBRATE</h1>
        <p className="welcome-lead">
          Every event service.<br />One platform.<br /><strong>One grand total.</strong>
        </p>
        <div className="welcome-actions">
          <Link to="/home" className="btn btn-primary">Plan my event</Link>
          <Link to="/login" className="btn btn-ghost">Log in</Link>
          <Link to="/vendor" className="text-link teal">I am a vendor: list my business</Link>
        </div>
        <p className="sign-off">see you at the party…</p>
      </div>
      <div className="orange-rule" />
    </main>
  );
}
