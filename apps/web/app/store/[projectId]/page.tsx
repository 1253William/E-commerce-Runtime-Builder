"use client";

import { useEffect, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
type Product = { name: string; price: number; description: string; category: string };
type Application = { brandName?: string; hero?: { eyebrow?: string; title?: string; description?: string; primaryAction?: string }; collections?: string[]; products?: Product[]; fulfillment?: string[]; payment?: string };
type Task = { objective?: string; plan?: unknown };

function getApplication(task: Task | null, name: string): Application {
  try {
    const parsed = typeof task?.plan === "string" ? JSON.parse(task.plan) as { build?: { application?: Application } } : task?.plan as { build?: { application?: Application } } | undefined;
    const application = parsed?.build?.application;
    if (application && application.brandName !== "Seltra Commerce") return application;
    const objective = task?.objective ?? "";
    const brand = objective.match(/\bcalled\s+([^.!\n]+)/i)?.[1]?.trim() ?? objective.match(/(?:business name|store name)\s*:\s*([^\n]+)/i)?.[1]?.trim() ?? name;
    const skincare = /skin|beauty|cosmetic/i.test(objective);
    return skincare ? { brandName: brand, hero: { eyebrow: `${brand} · Editorial skincare`, title: "A quieter ritual for radiant skin.", description: "Considered skincare essentials selected to make every day feel more intentional.", primaryAction: "Shop the ritual" }, collections: ["Cleansers", "Serums", "Moisturizers", "Best Sellers"], products: [{ name: "Daily Renewal Serum", price: 48, category: "Serums", description: "A lightweight ritual for visibly brighter, calmer skin." }, { name: "Cloud Cream Moisturizer", price: 42, category: "Moisturizers", description: "A soft, nourishing finish for every morning and night." }, { name: "Gentle Milk Cleanser", price: 34, category: "Cleansers", description: "A quiet first step that leaves skin comfortable and fresh." }], fulfillment: ["Delivery", "Collection"], payment: "Paystack" } : { brandName: brand, collections: ["Featured", "Best Sellers"], products: [] };
  } catch { return { brandName: name, collections: [], products: [] }; }
}

export default function StorefrontPage({ params }: { params: Promise<{ projectId: string }> }) {
  const [application, setApplication] = useState<Application | null>(null);
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState(0);

  useEffect(() => { void params.then(async ({ projectId }) => { const saved = window.localStorage.getItem("seltra.session"); const merchantId = saved ? (JSON.parse(saved) as { user?: { merchantId?: string } }).user?.merchantId : undefined; const headers: HeadersInit = merchantId ? { "x-merchant-id": merchantId } : {}; const storeResponse = await fetch(`${apiUrl}/stores/${projectId}`, { headers }); const store = storeResponse.ok ? (await storeResponse.json() as { data: { name: string } }).data : { name: "Seltra Commerce" }; const taskResponse = await fetch(`${apiUrl}/stores/${projectId}/tasks`, { headers }); const task = taskResponse.ok ? (await taskResponse.json() as { data: Task | null }).data : null; setApplication(getApplication(task, store.name)); }); }, [params]);

  const products = application?.products ?? [];
  const collections = application?.collections ?? [];
  const visible = category === "All" ? products : products.filter((product) => product.category === category);
  if (!application) return <main className="standalone-store"><section><p>Loading generated storefront…</p></section></main>;
  return <main className="generated-storefront standalone-generated"><header><strong>{application.brandName}</strong><nav>{collections.slice(0, 4).map((item) => <button type="button" key={item} onClick={() => setCategory(item)}>{item}</button>)}<button type="button" className="generated-cart">Cart ({cart})</button></nav></header><section className="generated-hero"><small>{application.hero?.eyebrow}</small><h1>{application.hero?.title}</h1><p>{application.hero?.description}</p><button type="button" onClick={() => document.getElementById("store-products")?.scrollIntoView({ behavior: "smooth" })}>{application.hero?.primaryAction}</button></section><section className="generated-content" id="store-products"><div className="generated-section-heading"><div><small>CURATED FOR YOU</small><h2>Build your ritual.</h2></div><span>{cart} items in cart</span></div><div className="category-tabs">{["All", ...collections].map((item) => <button type="button" className={category === item ? "selected" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="generated-products">{visible.map((product) => <article className="generated-product" key={product.name}><div className="product-image">{product.name.slice(0, 1)}</div><small>{product.category}</small><h3>{product.name}</h3><p>{product.description}</p><strong>GHS {product.price}</strong><button type="button" onClick={() => setCart((count) => count + 1)}>Add to bag</button></article>)}</div><footer><span>{application.fulfillment?.join(" · ")}</span><span>{application.payment}</span></footer></section></main>;
}