import { BackLink, Strip } from "../components/ui.jsx";

export default function Vendor() {
  return (
    <main className="screen">
      <header className="head">
        <BackLink to="/" className="teal" />
        <p className="eyebrow">For vendors</p>
        <h1>List my business</h1>
      </header>
      <Strip />
      <div className="body">
        <p className="callout">Vendor sign-up is not open yet. This is where tent hire, caterers, venues and other providers will list their services and prices.</p>
      </div>
    </main>
  );
}
