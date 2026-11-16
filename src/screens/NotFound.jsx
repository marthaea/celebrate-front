import { Link } from "react-router-dom";
import { Strip } from "../components/ui.jsx";

export default function NotFound() {
  return (
    <main className="screen">
      <header className="head">
        <h1>We could not find that page</h1>
      </header>
      <Strip />
      <div className="body">
        <Link to="/home" className="btn btn-primary">Back to home</Link>
      </div>
    </main>
  );
}
