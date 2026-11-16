import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Footer, Header } from "./components.jsx";
import Home from "./pages/Home.jsx";
import Services from "./pages/Services.jsx";
import Service from "./pages/Service.jsx";
import Plan from "./pages/Plan.jsx";
import Pay from "./pages/Pay.jsx";
import Receipt from "./pages/Receipt.jsx";
import Bookings from "./pages/Bookings.jsx";
import Budget from "./pages/Budget.jsx";
import Share from "./pages/Share.jsx";
import Compare from "./pages/Compare.jsx";
import Verify from "./pages/Verify.jsx";
import Privacy from "./pages/Privacy.jsx";
import Vendor from "./pages/Vendor.jsx";
import Admin from "./pages/Admin.jsx";
import { Account, NotFound, Vendors } from "./pages/Simple.jsx";

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      {!online && <p className="offline" role="status">You are offline. Your plan is saved on this device, and pages you have opened still work. Prices and booking need a connection.</p>}
      <Header overHero={pathname === "/"} />
      <main id="main" key={pathname} className="fade">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:category" element={<Services />} />
          <Route path="/service/:id" element={<Service />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/pay" element={<Pay />} />
          <Route path="/share/:code" element={<Share />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/receipt/:id" element={<Receipt />} />
          <Route path="/verify/:id" element={<Verify />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/account" element={<Account />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/vendor" element={<Vendor />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
