import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Welcome from "./screens/Welcome.jsx";
import Login from "./screens/Login.jsx";
import Vendor from "./screens/Vendor.jsx";
import Home from "./screens/Home.jsx";
import Browse from "./screens/Browse.jsx";
import Service from "./screens/Service.jsx";
import Details from "./screens/Details.jsx";
import Total from "./screens/Total.jsx";
import Pay from "./screens/Pay.jsx";
import Receipt from "./screens/Receipt.jsx";
import Bookings from "./screens/Bookings.jsx";
import NotFound from "./screens/NotFound.jsx";

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.getElementById("screen")?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="stage">
      <div className="phone" id="screen">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/vendor" element={<Vendor />} />
          <Route path="/home" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/browse/:category" element={<Browse />} />
          <Route path="/service/:id" element={<Service />} />
          <Route path="/details" element={<Details />} />
          <Route path="/plan" element={<Total />} />
          <Route path="/pay" element={<Pay />} />
          <Route path="/receipt/:id" element={<Receipt />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}
