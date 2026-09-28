"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
type User = { merchantId: string };
type Store = { id: string; name: string };
type Task = { id: string; status: string; objective: string; plan?: unknown; events?: string[] };
type Workspace = { status: string; previewUrl: string | null };
type View = "Preview" | "Code" | "Files";

export default function WorkspacePage() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [content, setContent] = useState("");
  const [view, setView] = useState<View>("Preview");
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("seltra.session");
    if (!saved) { router.push("/"); return; }
    try { setUser((JSON.parse(saved) as { user: User }).user); }
    catch { router.push("/"); }
  }, [router]);

  useEffect(() => {
    if (!user || !projectId) return;
    const headers = { "x-merchant-id": user.merchantId };
    void fetch(`${apiUrl}/stores/${projectId}`, { headers }).then(async (r) => { if (r.ok) setStore((await r.json() as { data: Store }).data); });
    void fetch(`${apiUrl}/stores/${projectId}/tasks`, { headers }).then(async (r) => {
      if (!r.ok) return;
      const latest = (await r.json() as { data: Task | null }).data;
      if (latest) { setTask(latest); setPrompt(latest.objective); return; }
      const seed = window.sessionStorage.getItem("seltra.seed");
      const objective = seed ? (JSON.parse(seed) as { objective?: string }).objective ?? "" : "";
      setPrompt(objective);
      if (!objective) return;
      window.sessionStorage.removeItem("seltra.seed");
      const created = await fetch(`${apiUrl}/tasks`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ objective, storeId: projectId }) });
      if (created.ok) setTask((await created.json() as { data: Task }).data);
    });
  }, [user, projectId]);

  useEffect(() => {
    if (!user || !task || ["COMPLETED", "NEEDS_REVIEW", "FAILED", "BLOCKED", "CANCELLED"].includes(task.status)) return;
    const poll = window.setInterval(() => void fetch(`${apiUrl}/tasks/${task.id}`, { headers: { "x-merchant-id": user.merchantId } }).then(async (r) => { if (r.ok) setTask((await r.json() as { data: Task }).data); }), 2000);
    return () => window.clearInterval(poll);
  }, [user, task]);

  useEffect(() => {
    if (!user || !projectId) return;
    let stopped = false;
    const refresh = async () => {
      const headers = { "x-merchant-id": user.merchantId };
      const response = await fetch(`${apiUrl}/stores/${projectId}/workspace`, { headers });
      if (!response.ok || stopped) return;
      const current = (await response.json() as { data: Workspace }).data;
      setWorkspace(current);
      if (current.status === "READY") {
        const list = await fetch(`${apiUrl}/stores/${projectId}/workspace/files`, { headers });
        if (list.ok && !stopped) {
          const next = (await list.json() as { data: string[] }).data;
          setFiles(next);
          setSelectedFile((existing) => next.includes(existing) ? existing : next[0] ?? "");
        }
      }
    };
    void refresh();
    const poll = window.setInterval(() => void refresh(), 3000);
    return () => { stopped = true; window.clearInterval(poll); };
  }, [user, projectId, task?.status]);

  useEffect(() => {
    if (!user || !projectId || !selectedFile) { setContent(""); return; }
    void fetch(`${apiUrl}/stores/${projectId}/workspace/file?path=${encodeURIComponent(selectedFile)}`, { headers: { "x-merchant-id": user.merchantId } })
      .then(async (r) => r.ok ? (await r.json() as { data: string }).data : "")
      .then(setContent).catch(() => setContent(""));
  }, [user, projectId, selectedFile]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || !prompt.trim()) return;
    void fetch(`${apiUrl}/tasks`, { method: "POST", headers: { "x-merchant-id": user.merchantId, "Content-Type": "application/json" }, body: JSON.stringify({ objective: prompt.trim(), storeId: projectId }) })
      .then(async (r) => { if (r.ok) setTask((await r.json() as { data: Task }).data); });
  }

  return <main className="workspace-shell panel-open">
    <aside className="conversation-pane">
      <div className="conversation-scroll">
        <div className="conversation-head"><button className="workspace-back" onClick={() => router.push("/")}>← Dashboard</button><span className="agent-state">{task?.status ?? "Ready"}</span></div>
        <div className="conversation-turn user-turn"><b>Business brief</b><p>{task?.objective ?? "Describe the application you want to build."}</p></div>
        <div className="conversation-turn agent-turn"><b>Seltra</b><p className="thought">{task?.status === "COMPLETED" ? "The source was built and verified in an isolated workspace." : task?.status === "NEEDS_REVIEW" ? "Automated repairs reached their limit. This application needs review." : task?.status === "FAILED" ? "The build failed. Review its task status and logs." : "Seltra will write, build and run the application in an isolated workspace."}</p>
          {files.length > 0 && <p>{files.length} actual workspace files</p>}
          <ol className="agent-events">{(task?.events ?? []).filter((event) => event.startsWith("agent.") || event.startsWith("application.") || event.startsWith("workspace.")).map((event, index) => <li key={`${event}-${index}`}>{event.replaceAll(".", " ")}</li>)}</ol>
        </div>
      </div>
      <form className="workspace-composer" onSubmit={submit}><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe a new build or change…" /><button type="submit">Run</button></form>
    </aside>
    <section className="application-pane">
      <header className="workspace-toolbar"><button className="toolbar-icon" onClick={() => router.push("/")}>←</button><strong className="project-name">{store?.name ?? "Workspace"}</strong><div className="view-tabs">{(["Preview", "Code", "Files"] as View[]).map((item) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item}</button>)}</div>
        {workspace?.previewUrl && <a className="share-button" href={workspace.previewUrl} target="_blank" rel="noreferrer">Open preview</a>}
      </header>
      <section className="application-content">
        {view === "Preview" && (workspace?.previewUrl ? <iframe className="workspace-preview" title="Application preview" src={workspace.previewUrl} /> : <div className="workspace-empty">{workspace?.status === "FAILED" ? "Sandbox provisioning failed." : "A real application preview will appear after the build succeeds."}</div>)}
        {view === "Code" && <div className="code-view"><nav>{files.map((file) => <button type="button" key={file} className={selectedFile === file ? "active" : ""} onClick={() => setSelectedFile(file)}>{file}</button>)}</nav><pre>{content || "Select a workspace file."}</pre></div>}
        {view === "Files" && <div className="layers-view"><section><span className="eyebrow">Workspace files</span>{files.map((file) => <p key={file}>{file}</p>)}</section></div>}
      </section>
    </section>
  </main>;
}
