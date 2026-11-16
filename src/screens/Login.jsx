import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackLink, Strip } from "../components/ui.jsx";
import { usePlan } from "../plan.jsx";

export default function Login() {
  const plan = usePlan();
  const navigate = useNavigate();
  const [name, setName] = useState(plan.name);

  const submit = (event) => {
    event.preventDefault();
    plan.setName(name.trim());
    navigate("/home");
  };

  return (
    <main className="screen">
      <header className="head">
        <BackLink to="/" className="teal" />
        <p className="eyebrow">Welcome back</p>
        <h1>Log in</h1>
      </header>
      <Strip />
      <form className="body" onSubmit={submit}>
        <label className="field">
          <span>Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nantongo" autoComplete="given-name" maxLength={40} required />
        </label>
        <p className="callout">Accounts are not set up yet. Your name is kept on this device so we can greet you and put it on your bookings.</p>
        <div className="spacer" />
        <button className="btn btn-primary">Continue</button>
      </form>
    </main>
  );
}
