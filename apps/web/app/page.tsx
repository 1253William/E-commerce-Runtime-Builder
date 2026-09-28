"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
type User = { name: string; email: string; merchantId: string };
type Store = { id: string; name: string; status?: string };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [objective, setObjective] = useState("");
  const [briefAttached, setBriefAttached] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("seltra.session");
    if (!saved) return;
    try { setUser(JSON.parse(saved).user as User); } catch { window.localStorage.removeItem("seltra.session"); }
  }, []);

  useEffect(() => {
    if (!user) return;
    void fetch(`${apiUrl}/stores`, { headers: { "x-merchant-id": user.merchantId } }).then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json() as Store[] | { data: Store[] };
      setStores(Array.isArray(payload) ? payload : payload.data);
    });
  }, [user]);

  async function submit() {
    if (!user) { setStatus("Sign in to start building."); return; }
    if (!objective.trim()) { setStatus("Describe what you want to build first."); return; }
    let project = stores[0];
    if (!project) {
      const response = await fetch(`${apiUrl}/stores`, { method: "POST", headers: { "Content-Type": "application/json", "x-merchant-id": user.merchantId }, body: JSON.stringify({ name: `${objective.trim().split(/\s+/).slice(0, 3).join(" ")} Store` }) });
      if (!response.ok) { setStatus("Could not create your project."); return; }
      const payload = await response.json() as Store | { data: Store };
      project = "data" in payload ? payload.data : payload;
      setStores([project]);
    }
    window.sessionStorage.setItem("seltra.seed", JSON.stringify({ objective: objective.trim(), briefAttached }));
    router.push(`/workspace/${project.id}`);
  }

  return <main className="app-shell landing-screen"><aside className="sidebar"><div className="brand-mark">SELTRA<span>●</span></div><nav><button className="nav-active" type="button">◈ Dashboard</button><button type="button">⌕ Search</button><button type="button">⌁ Connectors</button><button type="button">▢ Chats</button><button type="button" onClick={() => stores[0] && router.push(`/workspace/${stores[0].id}`)}>◇ Projects</button></nav><div className="recents"><span className="eyebrow">Recents</span>{stores.slice(0, 4).map((store) => <button key={store.id} type="button" onClick={() => router.push(`/workspace/${store.id}`)}>{store.name}</button>)}</div><div className="sidebar-footer"><div className="status-dot" />{user ? <button className="account-button" type="button" onClick={() => { window.localStorage.removeItem("seltra.session"); setUser(null); }}>Sign out</button> : <span>Guest workspace</span>}</div></aside><section className="landing-main"><div className="landing-content"><span className="eyebrow">Merchant workspace</span><h1>What should we build{user ? `, ${user.name.split(" ")[0]}` : ""}?</h1>{briefAttached && <div className="context-chip"><span>▤ Merchant brief attached</span><button type="button" onClick={() => setBriefOpen((open) => !open)}>{briefOpen ? "Hide" : "Show more"}</button><button type="button" aria-label="Remove merchant brief" onClick={() => setBriefAttached(false)}>×</button></div>}{briefOpen && <div className="context-card">Merchant brief is attached as context and will not be inserted into your editable prompt.</div>}<div className="landing-composer"><textarea value={objective} onChange={(event) => setObjective(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="Describe the store you want to build…" aria-label="Build prompt" /><div className="composer-actions"><button type="button" className="composer-plus" aria-label="Attach merchant brief" onClick={() => setBriefAttached((attached) => !attached)}>＋</button><span className="composer-mode">Build⌄</span><button type="button" className="composer-submit" onClick={submit}>{objective.trim() ? "Start building →" : ""}</button></div></div>{status && <p className="landing-status">{status}</p>}</div></section></main>;
}