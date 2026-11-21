import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Footer, Header } from "./components.jsx";
import { useSeo } from "./seo.js";
import { usePlan } from "../../src/plan.jsx";
import Home from "./pages/Home.jsx";
import Services from "./pages/Services.jsx";
import Service from "./pages/Service.jsx";
import Plan from "./pages/Plan.jsx";
import Pay, { PayStatus } from "./pages/Pay.jsx";
import Receipt from "./pages/Receipt.jsx";
import Bookings from "./pages/Bookings.jsx";
import Budget from "./pages/Budget.jsx";
import Share from "./pages/Share.jsx";
import Compare from "./pages/Compare.jsx";
import Verify from "./pages/Verify.jsx";
import Privacy from "./pages/Privacy.jsx";
import { Terms, VendorAgreement } from "./pages/Legal.jsx";
import Vendor from "./pages/Vendor.jsx";
import VendorReset from "./pages/VendorReset.jsx";
import Admin from "./pages/Admin.jsx";
import Team from "./pages/Team.jsx";
import About from "./pages/About.jsx";
import Blog, { BlogPost } from "./pages/Blog.jsx";
import { Account, NotFound, Vendors } from "./pages/Simple.jsx";

export default function App() {
  const { pathname } = useLocation();
  const plan = usePlan();
  useEffect(() => {
    if (plan.event.type === "Kwanjula") plan.setEvent({ type: "Introduction" });
  }, [plan.event.type]);
  // Service pages set their own head once the service has loaded.
  useSeo(pathname, undefined, !pathname.startsWith("/service/"));
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
          <Route path="/pay/:id" element={<PayStatus />} />
          <Route path="/share/:code" element={<Share />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/receipt/:id" element={<Receipt />} />
          <Route path="/verify/:id" element={<Verify />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/vendor-agreement" element={<VendorAgreement />} />
          <Route path="/account" element={<Account />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/team" element={<Team />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/vendor" element={<Vendor />} />
          <Route path="/vendor/reset" element={<VendorReset />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
