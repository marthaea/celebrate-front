// Pieces shared by the vendor onboarding and the vendor workspace.
import { useState } from "react";
import { money } from "../../src/format.js";
import { ErrorNote, FileButton } from "./components.jsx";

const QTY_LABEL = {
  flat: "One per event",
  perGuest: "One per guest",
  per100Guests: "One per 100 guests",
  perTent: "One per tent the host asks for",
};

const blank = { category: "", name: "", price: "", wasPrice: "", unit: "event", qtyRule: "flat", labour: "", labourPerQty: "", transport: "", included: "", summary: "", photoIds: [] };

/** B3: adding or changing one of the vendor's own services. */
export function ServiceForm({ initial, categories, units, defaultCategory, call, onSaved, onCancel }) {
  const [form, setForm] = useState(() => ({
    ...blank, category: defaultCategory ?? "", ...initial,
    included: (initial?.included ?? []).join("\n"),
    price: initial?.price ?? "", wasPrice: initial?.wasPrice ?? "",
  }));
  const [photos, setPhotos] = useState(() => (initial?.photoIds ?? []).map((id) => ({ id, url: `/api/uploads/${id}`, name: "photo" })));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const off = form.wasPrice && form.price && Number(form.wasPrice) > Number(form.price) ? Math.round((1 - form.price / form.wasPrice) * 100) : 0;

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const saved = await call("/vendor/services", {
        ...form, id: initial?.id,
        price: Number(form.price), wasPrice: form.wasPrice ? Number(form.wasPrice) : null,
        included: form.included.split("\n"), photoIds: photos.map((p) => p.id),
      });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form className="desk-card form" onSubmit={save}>
      <h2>{initial?.id ? `Change “${initial.name}”` : "Add a service"}</h2>
      <div className="fields">
        <label className="field"><span className="caps">Name</span><input value={form.name} onChange={set("name")} maxLength={80} placeholder="e.g. Buffet for kwanjula" required /></label>
        <label className="field"><span className="caps">Kind of service</span>
          <select value={form.category} onChange={set("category")} required>
            <option value="" disabled>Choose…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </label>
        <label className="field"><span className="caps">Price (UGX)</span><input inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, "") })} required /></label>
        <label className="field"><span className="caps">Price is per</span>
          <select value={form.unit} onChange={set("unit")}>{units.map((u) => <option key={u}>{u}</option>)}</select>
        </label>
        <label className="field"><span className="caps">How many a host needs</span>
          <select value={form.qtyRule} onChange={set("qtyRule")}>{Object.entries(QTY_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        </label>
        <label className="field">
          <span className="caps">Discount: old price (optional)</span>
          <input inputMode="numeric" value={form.wasPrice ?? ""} onChange={(e) => setForm({ ...form, wasPrice: e.target.value.replace(/\D/g, "") })} placeholder="Leave empty for no discount" />
          {off > 0 && <small className="quiet">Shown as {off}% off.</small>}
        </label>
        <label className="field"><span className="caps">Labour, per event (UGX)</span><input inputMode="numeric" value={form.labour} onChange={(e) => setForm({ ...form, labour: e.target.value.replace(/\D/g, "") })} placeholder="0" /></label>
        <label className="field"><span className="caps">Labour, per unit (UGX)</span><input inputMode="numeric" value={form.labourPerQty} onChange={(e) => setForm({ ...form, labourPerQty: e.target.value.replace(/\D/g, "") })} placeholder="0" /></label>
        <label className="field"><span className="caps">Transport (UGX)</span><input inputMode="numeric" value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value.replace(/\D/g, "") })} placeholder="0" /></label>
      </div>
      <label className="field">
        <span className="caps">What is included, one per line</span>
        <textarea rows={4} value={form.included} onChange={set("included")} placeholder={"Matooke, rice, chicken and greens\nServing team and plates"} />
      </label>
      <div className="files">
        {photos.map((photo) => (
          <span key={photo.id} className="photo-chip">
            <img src={photo.url} alt="" />
            <button type="button" className="link-quiet" onClick={() => setPhotos(photos.filter((p) => p.id !== photo.id))}>Remove</button>
          </span>
        ))}
        {photos.length < 6 && <FileButton label="Add photos of this service" purpose="service" accept="image/*" multiple upload={(data) => call("/uploads", data)} onAdded={(file) => setPhotos((list) => [...list, file])} onError={setError} />}
      </div>
      <p className="quiet">Labour is only charged when the host asks you to set up. Hosts choose settings that suit your kind of service (menu, hours, sizes…), priced on top of your price.</p>
      <ErrorNote>{error}</ErrorNote>
      <div className="vendor-actions">
        <button className="button fit" disabled={saving}>{saving ? "Saving…" : "Save service"}</button>
        {onCancel && <button type="button" className="button fit outline" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

/** The vendor's own services, with change and remove; sample listings are shown read-only. */
export function ServiceList({ services, categories, units, defaultCategory, call, onChange, readOnly = [] }) {
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const remove = async (service) => {
    if (!window.confirm(`Remove “${service.name}”? Bookings already made keep it.`)) return;
    try {
      await call(`/vendor/services/${service.id}/remove`, {});
      onChange();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <div className="desk-list">
      <ErrorNote>{error}</ErrorNote>
      {readOnly.map((service) => (
        <article key={service.id} className="desk-card">
          <h2>{service.name}</h2>
          <p>{money(service.price)} per {service.unit}{service.wasPrice ? ` (was ${money(service.wasPrice)})` : ""}</p>
          <p className="quiet">Listed by Celebrate for you. Ask the team to change it.</p>
        </article>
      ))}
      {services.map((service) => (editing === service.id ? (
        <ServiceForm key={service.id} initial={service} categories={categories} units={units} call={call} onSaved={() => { setEditing(null); onChange(); }} onCancel={() => setEditing(null)} />
      ) : (
        <article key={service.id} className="desk-card">
          <div className="desk-card-head">
            <div>
              <h2>{service.name}</h2>
              <p>{money(service.price)} per {service.unit}{service.wasPrice ? ` · was ${money(service.wasPrice)}` : ""}</p>
              <p className="quiet">{categories.find((c) => c.id === service.category)?.title} · {service.included?.length ?? 0} things included · {service.photoIds?.length ?? 0} photos</p>
            </div>
            <div className="vendor-actions">
              <button className="chip" onClick={() => setEditing(service.id)}>Change</button>
              <button className="chip" onClick={() => remove(service)}>Remove</button>
            </div>
          </div>
        </article>
      )))}
      {editing === "new"
        ? <ServiceForm categories={categories} units={units} defaultCategory={defaultCategory} call={call} onSaved={() => { setEditing(null); onChange(); }} onCancel={() => setEditing(null)} />
        : <button className="button fit outline" onClick={() => setEditing("new")}>Add a service</button>}
    </div>
  );
}
