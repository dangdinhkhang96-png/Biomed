"use client";

import { useEffect, useState } from "react";
import { Stethoscope } from "lucide-react";
import type { Device } from "@/lib/inventory";

type PublicDevice = Pick<Device, "id" | "name" | "bhxh" | "model" | "brand" | "serial" | "dept" | "cat" | "status" | "year" | "buy">;
const fields: Array<[keyof PublicDevice, string]> = [
  ["id", "Mã thiết bị"], ["bhxh", "Mã quản lý"], ["brand", "Hãng / xuất xứ"],
  ["model", "Model"], ["serial", "Số serial"], ["dept", "Khoa / phòng"],
  ["cat", "Nhóm thiết bị"], ["status", "Tình trạng"], ["year", "Năm đưa vào sử dụng"], ["buy", "Ngày ghi nhận mua"],
];

export function PublicDeviceQr({ token }: { token: string }) {
  const [device, setDevice] = useState<PublicDevice | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/team/public-qr", {
      method: "POST", credentials: "omit", cache: "no-store",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ token }),
    }).then(async response => {
      const result = await response.json() as { device?: PublicDevice; error?: string };
      if (!response.ok || !result.device) throw new Error(result.error || "Không tìm thấy thiết bị.");
      if (active) setDevice(result.device);
    }).catch(() => { if (active) setError("Không tìm thấy thông tin cho mã QR này."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  return <main className="min-h-screen bg-bg px-4 py-8 text-ink sm:py-12">
    <section className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <header className="flex items-center gap-3 bg-teal px-5 py-5 text-surface sm:px-7">
        <Stethoscope className="size-8 shrink-0" aria-hidden="true" />
        <div><p className="text-xs font-semibold tracking-wide">BIMEDBD · BVĐK BÌNH DƯƠNG</p><h1 className="mt-1 text-xl font-semibold">Thông tin thiết bị</h1></div>
      </header>
      {loading ? <p role="status" className="p-6 text-sm text-muted">Đang tra cứu thiết bị…</p>
        : error ? <p role="alert" className="p-6 text-sm text-bad">{error}</p>
        : device && <div className="p-5 sm:p-7">
          <h2 className="text-2xl font-semibold leading-snug">{device.name}</h2>
          <dl className="mt-5 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
            {fields.map(([key, label]) => <div key={key} className="min-w-0 bg-surface p-3.5">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-1 break-words text-sm font-medium">{String(device[key] || "—")}</dd>
            </div>)}
          </dl>
          <p className="mt-5 text-xs leading-relaxed text-muted">Trang này chỉ hiển thị thông tin công khai của thiết bị gắn với mã QR. Danh sách thiết bị và chức năng quản lý không được mở từ trang này.</p>
        </div>}
    </section>
  </main>;
}
