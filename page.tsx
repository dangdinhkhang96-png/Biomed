"use client";

import { useEffect, useState } from "react";
import { AccessShell } from "@/components/access-shell";
import Home from "@/components/home";
import { PublicDeviceQr } from "@/components/public-device-qr";

function readPublicToken() {
  try { return new URLSearchParams(window.location.hash.slice(1)).get("qr") || ""; }
  catch { return ""; }
}

export default function Page() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => { setToken(readPublicToken()); setReady(true); };
    sync(); window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  if (!ready) return <main className="grid min-h-screen place-items-center bg-bg"><p role="status" className="text-teal-deep">Đang mở Bimedbd…</p></main>;
  if (token) return <PublicDeviceQr token={token} />;
  return <AccessShell><Home /></AccessShell>;
}
