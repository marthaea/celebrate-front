export const money = (amount) => `UGX ${Number(amount).toLocaleString("en-US")}`;

/** "2026-12-12" becomes "Sat, 12 Dec 2026". */
export const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export const discountPercent = (service) =>
  service.wasPrice ? Math.round((1 - service.price / service.wasPrice) * 100) : 0;

export const toISODate = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
