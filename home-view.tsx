"use client";
import { TenderManager } from '@/components/tender-manager';
import { useEffect, useMemo, useState } from "react";
import { useDevices, useTeamUser } from "@/components/access-shell";
import { Search, Stethoscope, Wrench } from "lucide-react";
import {
  FUNDS,
  STATUS,
  badgeClass,
  depOf,
  dmy,
  vnd,
  type Device,
  type Repair,
} from "@/lib/inventory";


import { DeviceQr, QrScanner } from "@/components/device-qr";
import { readDeviceQr } from "@/lib/device-qr";

import { downloadRepair } from "@/lib/repair-export";



type Store = { st: Record<string, string>; r: Record<string, Repair[]> };

function loadStore(key: string): Store {
  try {
    const x = JSON.parse(localStorage.getItem(key) || "");
    if (x && typeof x === "object") {
      const st = Object.fromEntries(Object.entries(x.st || {}).filter(([, v]) => STATUS.includes(v as typeof STATUS[number])));
      const r = Object.fromEntries(Object.entries(x.r || {}).filter(([, v]) => Array.isArray(v) && v.every((rep) => rep && typeof rep.issue === "string" && typeof rep.cost === "number")));
      return { st: st as Store["st"], r: r as Store["r"] };
    }
  } catch {
    /* empty */
  }
  return { st: {}, r: {} };
}

export default function HomeView() {
  const DEVICES = useDevices();
  const user = useTeamUser();
  const KEY = user?.role === "admin" ? "tbyt-kk2023" : `tbyt-kk2023:${user?.id}`;
  const [store, setStore] = useState<Store>({ st: {}, r: {} });
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [q, setQ] = useState("");
  const [fs, setFs] = useState("");
  const [fd, setFd] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [show, setShow] = useState(80);
  const [years, setYears] = useState(10);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"inventory" | "qr" | "tenders">("inventory");
  const [camera, setCamera] = useState(false);
  const [linkError, setLinkError] = useState("");

  function openDevice(id: string) {
    setSel(id); setTab("inventory"); setCamera(false); setLinkError("");
    const url = new URL(window.location.href);
    url.hash = new URLSearchParams({ device: id }).toString();
    window.history.replaceState(null, "", url);
  }

  useEffect(() => {
    if (!ready) return;
    function fromLink() {
      const id = readDeviceQr(window.location.href);
      if (id) {
        if (DEVICES.some(d => d.id === id)) { setSel(id); setTab("inventory"); setLinkError(""); }
        else setLinkError("Liên kết QR không khớp thiết bị trong danh mục.");
      }
    }
    fromLink(); window.addEventListener("hashchange", fromLink);
    return () => window.removeEventListener("hashchange", fromLink);
  }, [ready]);

  useEffect(() => {
    setStore(loadStore(KEY));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      try { localStorage.setItem(KEY, JSON.stringify(store)); }
      catch { setSaveError(true); }
    }
  }, [store, ready, KEY]);

  const depts = useMemo(() => {
    const s = new Set(DEVICES.map((d) => d.dept).filter(Boolean));
    return [...s].sort((a, b) => a.localeCompare(b, "vi"));
  }, []);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return DEVICES.filter((d) => {
      const st = store.st[d.id] || d.status;
      if (fs && st !== fs) return false;
      if (fd && d.dept !== fd) return false;
      if (!needle) return true;
      return [d.id, d.name, d.model, d.serial, d.bhxh, d.dept, d.brand, d.sup]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [q, fs, fd, store.st]);

  useEffect(() => {
    setShow(80);
  }, [q, fs, fd]);

  const current = DEVICES.find((d) => d.id === sel) || null;
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of STATUS) c[s] = 0;
    let val = 0;
    for (const d of DEVICES) {
      const st = store.st[d.id] || d.status;
      c[st] = (c[st] || 0) + 1;
      val += d.price;
    }
    return { c, val };
  }, [store.st]);

  function setStatus(id: string, st: string) {
    setStore((p) => ({ ...p, st: { ...p.st, [id]: st } }));
  }

  function addRepair(id: string, rep: Repair) {
    setStore((p) => ({ ...p, r: { ...p.r, [id]: [...(p.r[id] || []), rep] } }));
    setStatus(id, rep.st === "Hoàn thành" ? "Đang hoạt động" : "Đang sửa chữa");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center gap-3 bg-header px-4 py-3 text-surface sm:px-6">
        <Stethoscope className="size-5 shrink-0 text-teal-soft" aria-hidden />
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold tracking-tight sm:text-lg">
            Bimedbd · Trang thiết bị y tế · BVĐK Bình Dương
          </h1>
          <p className="text-xs text-teal-soft">Kiểm kê 10/2023 · Mã cơ sở 74001</p>
        </div>
        <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{DEVICES.length} thiết bị</span>
      </header>

      <nav aria-label="Chức năng" className="flex flex-wrap gap-2 border-b border-line bg-surface px-4 py-3">
        <button type="button" aria-pressed={tab === "inventory"} onClick={() => setTab("inventory")} className={`rounded-lg px-4 py-2 text-sm ${tab === "inventory" ? "bg-teal text-surface" : "bg-bg"}`}>Danh mục thiết bị</button>
        <button type="button" aria-pressed={tab === "qr"} onClick={() => setTab("qr")} className={`rounded-lg px-4 py-2 text-sm ${tab === "qr" ? "bg-teal text-surface" : "bg-bg"}`}>QR thiết bị · Xuất tem</button>
        <button type="button" onClick={() => setCamera(true)} className="rounded-lg border border-line px-4 py-2 text-sm">Camera quét QR</button>
        <button type="button" aria-pressed={tab === "tenders"} onClick={() => setTab("tenders")} className="rounded-lg border border-line px-4 py-2 text-sm">Quản lý gói thầu</button>
      </nav>
      {linkError && <p role="alert" className="p-3 text-bad">{linkError}</p>}
      {saveError && <p role="alert" className="bg-warn p-3 text-surface">Không lưu được thay đổi. Hãy kiểm tra quyền lưu trữ của trình duyệt.</p>}
      {tab === "tenders" ? <TenderManager /> : <main className="mx-auto grid w-full max-w-[1440px] flex-1 gap-4 p-3 lg:grid-cols-[320px_1fr] lg:p-4">
        <section className="flex max-h-[46vh] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-6.5rem)] lg:self-start">
          <div className="grid gap-2 border-b border-line p-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Mã tài sản, BHXH, tên, serial…"
                className="w-full rounded-lg border border-line bg-surface py-2 pr-3 pl-8 text-sm outline-none focus:border-teal"
                aria-label="Tìm thiết bị"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={fs}
                onChange={(e) => setFs(e.target.value)}
                className="rounded-lg border border-line bg-surface px-2 py-2 text-sm"
                aria-label="Lọc tình trạng"
              >
                <option value="">Mọi tình trạng</option>
                {STATUS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                value={fd}
                onChange={(e) => setFd(e.target.value)}
                className="rounded-lg border border-line bg-surface px-2 py-2 text-sm"
                aria-label="Lọc khoa"
              >
                <option value="">Mọi khoa</option>
                {depts.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted">{rows.length} kết quả</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {rows.slice(0, show).map((d) => {
              const st = store.st[d.id] || d.status;
              const on = d.id === sel;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSel(d.id)}
                  className={`block w-full border-b border-line border-l-4 px-3 py-2.5 text-left ${on ? "border-l-teal bg-teal-soft" : "border-l-transparent hover:bg-bg"}`}
                >
                  <span className="block text-sm font-semibold">{d.name}</span>
                  <span className="block text-xs text-muted">
                    {d.id} · {d.dept}
                  </span>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass(st)}`}>
                    {st}
                  </span>
                </button>
              );
            })}
            {rows.length === 0 && <p className="p-6 text-center text-sm text-muted">Không có thiết bị khớp bộ lọc.</p>}
            {show < rows.length && (
              <button
                type="button"
                className="w-full py-3 text-sm font-medium text-teal hover:bg-teal-soft"
                onClick={() => setShow((n) => n + 80)}
              >
                Xem thêm {Math.min(80, rows.length - show)} / {rows.length - show}
              </button>
            )}
          </div>
        </section>

        <section className="min-w-0">
          {tab === "qr" ? <DeviceQr devices={rows} current={current} onOpen={openDevice} /> : <>
          {current && <button type="button" onClick={() => { setSel(null); const u = new URL(window.location.href); u.hash = ""; window.history.replaceState(null, "", u); }} className="mb-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm">← Về tổng quan</button>}
          {!current ? (
            <Overview counts={counts.c} value={counts.val} onPick={setFs} />
          ) : (
            <Detail
              d={current}
              status={store.st[current.id] || current.status}
              repairs={store.r[current.id] || []}
              years={years}
              onYears={setYears}
              onStatus={(st) => setStatus(current.id, st)}
              onAdd={() => setOpen(true)}
            />
          )}
          {current && <button type="button" onClick={() => setTab("qr")} className="mt-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm">QR của thiết bị này</button>}
          </>}
        </section>
      </main>}

      {camera && <QrScanner onClose={() => setCamera(false)} onRead={text => { const id = readDeviceQr(text) || text.trim(); if (!DEVICES.some(d => d.id === id)) return false; openDevice(id); return true; }} />}
      {open && current && (
        <RepairDialog
          device={current}
          previousRepairs={(store.r[current.id] || []).filter(r => r.st === "Hoàn thành").length}
          onClose={() => setOpen(false)}
          onSave={(rep) => {
            addRepair(current.id, rep);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Overview({
  counts,
  value,
  onPick,
}: {
  counts: Record<string, number>;
  value: number;
  onPick: (s: string) => void;
}) {
  const DEVICES = useDevices();
  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 text-base font-semibold">Tổng hợp kiểm kê 10/2023</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat n={String(DEVICES.length)} l="Thiết bị" />
          <Stat n={vnd(value)} l="Tổng nguyên giá" />
          <Stat n={String(counts["Đang hoạt động"] || 0)} l="Đang sử dụng" />
          <Stat n={String((counts["Chờ sửa chữa"] || 0) + (counts["Đang sửa chữa"] || 0))} l="Hỏng / đang sửa" />
        </div>
      </div>
      <div className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 text-sm font-semibold">Theo tình trạng kiểm kê</h2>
        <div className="flex flex-wrap gap-2">
          {STATUS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPick(s)}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-bg px-3 py-1.5 text-sm"
            >
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass(s)}`}>{s}</span>
              <span className="font-semibold">{counts[s] || 0}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">
          Chọn một thiết bị bên trái để xem mã tài sản, mã Bảo hiểm xã hội, nguồn mua và khấu hao. Phiếu sửa chữa lưu trên trình duyệt này.
        </p>
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div className="rounded-lg border border-line bg-bg px-3 py-3">
      <b className="block text-lg font-semibold tracking-tight text-teal-deep">{n}</b>
      <span className="text-xs text-muted">{l}</span>
    </div>
  );
}

function Detail({
  d,
  status,
  repairs,
  years,
  onYears,
  onStatus,
  onAdd,
}: {
  d: Device;
  status: string;
  repairs: Repair[];
  years: number;
  onYears: (n: number) => void;
  onStatus: (s: string) => void;
  onAdd: () => void;
}) {
  const x = depOf(d, years);
  const fields: [string, string][] = [
    ["Mã tài sản", d.id],
    ["Mã Bảo hiểm xã hội", d.bhxh || "—"],
    ["Model", d.model || "—"],
    ["Hãng / nước SX", d.brand || "—"],
    ["Số serial", d.serial || "—"],
    ["Khoa (kiểm kê)", d.dept],
    ["Nhóm", d.cat || "—"],
    ["Năm sản xuất", d.year || "—"],
    ["Ngày ghi nhận", dmy(d.buy)],
    ["Nguyên giá", vnd(d.price)],
    ["Nguồn kinh phí", d.src || FUNDS[d.fund] || "—"],
    ["Phân loại nguồn", `${d.fund} · ${FUNDS[d.fund]}`],
    ["Nhà cung cấp", d.sup || "—"],
    ["Hình thức mua", d.form || "—"],
    ["Tình trạng sổ KK", d.kk || "—"],
  ];
  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{d.name}</h2>
            <p className="text-sm text-muted">
              {d.id}
              {d.model ? ` · ${d.model}` : ""}
              {d.serial ? ` · SN ${d.serial}` : ""}
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(status)}`}>{status}</span>
          <select
            value={status}
            onChange={(e) => onStatus(e.target.value)}
            className="rounded-lg border border-line bg-surface px-2 py-2 text-sm"
            aria-label="Đổi tình trạng"
          >
            {STATUS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-2 text-sm font-medium text-surface hover:bg-teal-deep"
          >
            <Wrench className="size-4" />
            Phiếu sửa
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <h3 className="mb-3 text-sm font-semibold">Thông tin thiết bị</h3>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {fields.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted">{k}</dt>
              <dd className={`text-sm font-medium ${k === "Mã Bảo hiểm xã hội" ? "font-mono break-all" : ""}`}>{v}</dd>
            </div>
          ))}
        </dl>
        {d.note && <p className="mt-3 rounded-lg bg-bg px-3 py-2 text-sm text-muted">Ghi chú kiểm kê: {d.note}</p>}
      </div>

      <div className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <h3 className="flex-1 text-sm font-semibold">Khấu hao tham khảo (đường thẳng)</h3>
          <label className="text-xs text-muted">
            Số năm
            <input
              type="number"
              min={1}
              max={30}
              value={years}
              onChange={(e) => onYears(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
              className="mt-1 block w-24 rounded-lg border border-line px-2 py-1.5 text-sm text-ink"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat n={vnd(d.price)} l="Nguyên giá" />
          <Stat n={vnd(x.mo * 12)} l="Mức một năm" />
          <Stat n={vnd(x.acc)} l={`Lũy kế ${x.el}/${x.tot} tháng`} />
          <Stat n={vnd(x.res)} l="Giá trị còn lại" />
        </div>
        <p className="mt-3 text-xs text-muted">
          Số liệu quản lý, không thay sổ kế toán. Cơ sở công lập: đối chiếu tỷ lệ hao mòn theo TT 141/2025/TT-BTC. Ngày gốc lấy theo hóa đơn, nếu thiếu thì lấy 01/01 năm sản xuất.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <h3 className="mb-3 text-sm font-semibold">Lịch sử sửa chữa ({repairs.length})</h3>
        {repairs.length === 0 ? (
          <p className="text-sm text-muted">Chưa ghi phiếu sửa trên ứng dụng. Sổ kiểm kê không kèm lịch sử sửa.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-line">
                  {["Ngày báo", "Sự cố", "Nguyên nhân", "Đơn vị", "Chi phí", "Ngừng", "TT", "Phiếu"].map((h) => (
                    <th key={h} className="py-2 pr-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {repairs.map((r, i) => (
                  <tr key={i} className="border-b border-line">
                    <td className="py-2 pr-3">{dmy(r.d)}</td>
                    <td className="py-2 pr-3">{r.issue}</td>
                    <td className="py-2 pr-3">{r.cause}</td>
                    <td className="py-2 pr-3">{r.by}</td>
                    <td className="py-2 pr-3">{vnd(r.cost)}</td>
                    <td className="py-2 pr-3">{r.down} giờ</td>
                    <td className="py-2 pr-3">{r.st}</td>
                    <td className="py-2 pr-3"><button type="button" className="text-teal underline" onClick={() => downloadRepair(d, r, repairs.slice(0, i).filter(x => x.st === "Hoàn thành").length)}>Xuất Word</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RepairDialog({ device, previousRepairs, onClose, onSave }: { device: Device; previousRepairs: number; onClose: () => void; onSave: (r: Repair) => void }) {
  const [exportWord, setExportWord] = useState(true);
  const [exportError, setExportError] = useState("");
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-header/40 p-3 sm:items-center" role="presentation" onClick={onClose}>
      <form
        role="dialog" aria-modal="true" aria-label="Thêm phiếu sửa chữa"
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const rep: Repair = {
            useYear: String(f.get("useYear") || "").trim(),
            keeper: String(f.get("keeper") || "").trim(),
            reporter: String(f.get("reporter") || "").trim(),
            d: String(f.get("d") || ""),
            e: String(f.get("st")) === "Hoàn thành" ? String(f.get("d") || "") : "",
            issue: String(f.get("issue") || ""),
            cause: String(f.get("cause") || ""),
            by: String(f.get("by") || ""),
            cost: Number(f.get("cost") || 0),
            down: Number(f.get("down") || 0),
            st: String(f.get("st") || "Đang sửa"),
          };
          try {
            if (exportWord) downloadRepair(device, rep, previousRepairs);
            onSave(rep);
          } catch { setExportError("Không xuất được phiếu Word. Bạn có thể bỏ chọn xuất Word để lưu phiếu trước."); }
        }}
      >
        <h2 className="text-base font-semibold">Phiếu yêu cầu và sửa chữa thiết bị</h2>
        <p className="mt-1 text-xs text-muted">{device.name} · {device.id} · {device.dept}</p>
        <p className="mt-1 text-xs text-muted">Số lần đã sửa: {previousRepairs} (theo các phiếu hoàn thành đã lưu trong ứng dụng).</p>
        {exportError && <p role="alert" className="mt-2 text-sm text-bad">{exportError}</p>}
        <label className="mt-2 block text-xs text-muted">Năm đưa vào sử dụng (xác nhận theo hồ sơ)<input name="useYear" type="number" min="1900" max={new Date().getFullYear()} className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm" /></label>
        <label className="mt-2 block text-xs text-muted">Người bảo quản thiết bị<input name="keeper" className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm" /></label>
        <label className="mt-2 block text-xs text-muted">Người phát hiện sự cố<input name="reporter" className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm" /></label>
        <label className="mt-3 block text-xs text-muted">
          Ngày báo hỏng
          <input name="d" type="date" required defaultValue={new Date().toLocaleDateString("en-CA")} className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm" />
        </label>
        <label className="mt-2 block text-xs text-muted">
          Mô tả sự cố
          <textarea name="issue" required rows={2} className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm" />
        </label>
        <label className="mt-2 block text-xs text-muted">
          Nguyên nhân
          <select name="cause" className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm">
            {["Hao mòn", "Lỗi người dùng", "Lỗi điện - nguồn", "Lỗi phần mềm", "Lỗi linh kiện", "Không xác định"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="mt-2 block text-xs text-muted">
          Đơn vị sửa
          <input name="by" className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm" />
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">
            Chi phí (₫)
            <input name="cost" type="number" min={0} defaultValue={0} className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm" />
          </label>
          <label className="text-xs text-muted">
            Ngừng máy (giờ)
            <input name="down" type="number" min={0} defaultValue={0} className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm" />
          </label>
        </div>
        <label className="mt-2 block text-xs text-muted">
          Trạng thái
          <select name="st" className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm">
            <option>Đang sửa</option>
            <option>Hoàn thành</option>
          </select>
        </label>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={exportWord} onChange={e => setExportWord(e.target.checked)} />Xuất Word theo mẫu khi lưu phiếu</label>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-3 py-2 text-sm">
            Hủy
          </button>
          <button type="submit" className="rounded-lg bg-teal px-3 py-2 text-sm font-medium text-surface">
            {exportWord ? "Lưu và xuất Word" : "Lưu phiếu"}
          </button>
        </div>
      </form>
    </div>
  );
}
