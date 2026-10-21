

export type Device = {
  id: string;
  name: string;
  bhxh: string;
  model: string;
  brand: string;
  serial: string;
  dept: string;
  cat: string;
  status: string;
  kk: string;
  buy: string;
  year: string;
  price: number;
  sup: string;
  src: string;
  fund: number;
  form: string;
  note: string;
};

export type Repair = {
  useYear?: string;
  keeper?: string;
  reporter?: string;
  d: string;
  e: string;
  issue: string;
  cause: string;
  by: string;
  cost: number;
  down: number;
  st: string;
};


export const STATUS = [
  "Đang hoạt động",
  "Chờ sửa chữa",
  "Đang sửa chữa",
  "Ngừng sử dụng",
  "Đã thanh lý",
] as const;

export const FUNDS: Record<number, string> = {
  1: "Ngân sách nhà nước",
  2: "Xã hội hóa / viện trợ / dự án",
  3: "Nguồn khác",
};



export function vnd(n: number) {
  return Math.round(n).toLocaleString("vi-VN") + " ₫";
}

export function dmy(s: string) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

export function badgeClass(s: string) {
  if (s === "Đang hoạt động" || s === "Hoàn thành") return "bg-ok text-surface";
  if (s === "Chờ sửa chữa") return "bg-warn text-surface";
  if (s === "Đang sửa chữa" || s === "Đang sửa") return "bg-info text-surface";
  if (s === "Ngừng sử dụng" || s === "Đã thanh lý") return "bg-bad text-surface";
  return "bg-muted text-surface";
}

export function depOf(d: Device, years: number, now = new Date()) {
  const y = Math.min(30, Math.max(1, Number.isFinite(years) ? years : 10));
  const mo = d.price / (y * 12);
  const [by, bm] = d.buy.split("-").map(Number);
  const baseYear = by || Number(d.year);
  if (!baseYear || !Number.isFinite(baseYear)) {
    return { mo: 0, tot: 0, el: 0, acc: 0, res: d.price, years: y };
  }
  const m0 = baseYear * 12 + (bm || 1) - 1;
  const nm = now.getFullYear() * 12 + now.getMonth();
  const tot = mo > 0 ? Math.ceil(d.price / mo - 1e-6) : 0;
  const el = Math.max(0, Math.min(tot, nm - m0 + 1));
  const acc = Math.min(d.price, el * mo);
  return { mo, tot, el, acc, res: d.price - acc, years: y };
}
