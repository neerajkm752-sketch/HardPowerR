"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Metrics = Record<string, number>;
type Country = { rank: number; name: string; code: string; score: number; dominant: string; metrics: Metrics };
type Comment = { _id: string; name: string; comment: string; createdAt: string };
type Payload = { rankings: Country[]; criteria: { key: string; label: string; weight: number }[]; updatedAt: string };

const colorFor = (country: Country) => country.dominant === "military" ? "#ef4444" : country.dominant === "gdp" || country.dominant === "industry" || country.dominant === "trade" ? "#0ea5e9" : "#6366f1";
const flag = (code: string) => `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function Flag({ code, name }: { code: string; name: string }) { return <img className="flag" src={flag(code)} alt={`${name} flag`} loading="lazy" />; }

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Country }[] }) {
  const country = payload?.[0]?.payload;
  if (!active || !country) return null;
  return <div className="bar-tooltip flex items-center gap-2"><Flag code={country.code} name={country.name} /><span>{country.name}</span><strong className="text-sky-800">{country.score}</strong></div>;
}

export default function Home() {
  const [data, setData] = useState<Payload | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState("");

  const loadRankings = async () => {
    try { const response = await fetch("/api/rankings", { cache: "no-store" }); if (!response.ok) throw new Error(); setData(await response.json()); }
    catch { setNotice("The intelligence feed is reconnecting. Start the API server on port 4000."); }
    finally { setLoading(false); }
  };
  const loadComments = async () => { try { const r = await fetch("/api/comments"); const body = await r.json(); if (Array.isArray(body.comments)) setComments(body.comments); } catch { /* keep any comments already shown */ } };
  useEffect(() => { loadRankings(); loadComments(); const timer = setInterval(loadRankings, 60_000); return () => clearInterval(timer); }, []);
  const topTen = useMemo(() => data?.rankings.slice(0, 10) || [], [data]);

  async function ask(event: FormEvent) {
    event.preventDefault(); if (!question.trim()) return; setAsking(true); setAnswer("");
    try { const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) }); const b = await r.json(); setAnswer(b.answer || b.error); }
    catch { setAnswer("The analyst is unavailable. Please try again shortly."); }
    finally { setAsking(false); }
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    const author = name.trim();
    const text = comment.trim();
    if (!author || !text) return;
    setPosting(true);
    setNotice("");
    const local: Comment = { _id: `local-${Date.now()}`, name: author, comment: text, createdAt: new Date().toISOString() };
    setComments(current => [local, ...current]);
    setComment("");
    try {
      const r = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: author, comment: text }) });
      const b = await r.json();
      if (r.ok && b.comment) {
        setComments(current => [b.comment, ...current.filter(item => item._id !== local._id)]);
        setNotice("Your comment is now visible in the discussion.");
      } else {
        setNotice("Saved on this page so you can see it now. Server storage is optional.");
      }
    } catch {
      setNotice("Saved on this page so you can see it now.");
    } finally {
      setPosting(false);
    }
  }

  return <main className="grid-bg relative min-h-screen overflow-hidden">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,.28),transparent_62%)]" />
    <div className="relative mx-auto max-w-7xl px-5 pb-16 sm:px-8">
      <nav className="flex items-center justify-between border-b border-sky-200/80 py-5">
        <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg border border-sky-300 bg-sky-100 font-display text-lg text-sky-700">H</div><div><p className="font-display text-sm tracking-wide text-slate-800">HARD POWER INDEX</p><p className="text-[10px] uppercase tracking-[.18em] text-sky-600">Global capability monitor</p></div></div>
        <div className="hidden items-center gap-3 text-xs text-sky-700 sm:flex"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />LIVE INTELLIGENCE</div>
      </nav>

      <section className="grid gap-10 py-16 lg:grid-cols-[1.2fr_.8fr] lg:py-24">
        <div><p className="eyebrow">The hard-power lens / 2026</p><h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.04] text-slate-900 sm:text-6xl">Power is the ability to shape the world.</h1><p className="mt-6 max-w-2xl text-base leading-7 text-slate-600">The Hard Power Index measures the forms of national capacity that command geopolitical weight: force, production, resources, reach, and financial leverage. It is deliberately not a quality-of-life index.</p><div className="mt-8 flex flex-wrap gap-3"><a href="#rankings" className="btn-primary">View the rankings</a><a href="#analyst" className="rounded-lg border border-sky-300 bg-white px-5 py-3 text-sm font-medium text-sky-800 transition hover:bg-sky-50">Ask the analyst</a></div></div>
        <div className="panel relative overflow-hidden p-6"><div className="absolute -right-14 -top-12 h-48 w-48 rounded-full bg-sky-300/30 blur-3xl" /><p className="eyebrow">About this index</p><p className="mt-4 text-lg leading-8 text-slate-700">Built from a hard-power worldview: nations shape events through strategic capability, not comfort metrics.</p><div className="mt-7 grid grid-cols-2 gap-y-5 border-t border-sky-100 pt-6"><div><p className="metric-label">Model</p><p className="mt-1 font-display text-xl text-slate-900">9 criteria</p></div><div><p className="metric-label">Update cycle</p><p className="mt-1 font-display text-xl text-slate-900">24 hours</p></div><div><p className="metric-label">Coverage</p><p className="mt-1 font-display text-xl text-slate-900">Top 50</p></div><div><p className="metric-label">Precision</p><p className="mt-1 font-display text-xl text-slate-900">Approximate</p></div></div></div>
      </section>

      {notice && <div className="mb-6 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">{notice}</div>}
      <section className="panel p-5 sm:p-7"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Command hierarchy</p><h2 className="mt-2 font-display text-2xl text-slate-900">Top 10 power positions</h2></div><p className="max-w-xs text-xs leading-5 text-slate-500">Bar color signals the leading source of hard power: <span className="text-red-500">military</span>, <span className="text-sky-600">economic</span>, <span className="text-indigo-500">balanced/resources</span>.</p></div>
        <div className="h-[365px] w-full">{loading ? <div className="grid h-full place-items-center text-sm text-slate-500">Loading intelligence feed…</div> : <ResponsiveContainer><BarChart data={topTen} layout="vertical" margin={{ left: 6, right: 34, top: 0, bottom: 0 }}><XAxis type="number" domain={[0, 100]} hide /><YAxis type="category" dataKey="name" width={108} tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(14,165,233,.08)" }} /><Bar dataKey="score" radius={[0, 7, 7, 0]} barSize={20} animationDuration={900}>{topTen.map(c => <Cell key={c.code} fill={colorFor(c)} />)}</Bar></BarChart></ResponsiveContainer>}</div>
      </section>

      <section id="rankings" className="mt-16 scroll-mt-8"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Country ledger</p><h2 className="mt-2 font-display text-2xl text-slate-900">Top 50 rankings</h2></div><p className="text-xs text-slate-500">Weighted score / 100 · refreshed {data ? new Date(data.updatedAt).toLocaleDateString() : "—"}</p></div>
        <div className="panel overflow-hidden"><div className="grid grid-cols-[54px_1fr_80px] border-b border-sky-100 bg-sky-50/70 px-4 py-3 text-[10px] font-semibold uppercase tracking-[.16em] text-sky-700 sm:grid-cols-[70px_1fr_250px_100px]"><span>Rank</span><span>Country</span><span className="hidden sm:block">Power composition</span><span className="text-right">Score</span></div>{data?.rankings.map(country => <div key={country.code} className={`grid grid-cols-[54px_1fr_80px] items-center px-4 py-3.5 transition hover:bg-sky-50 sm:grid-cols-[70px_1fr_250px_100px] ${country.rank <= 3 ? "bg-sky-50/80" : ""}`}><div className={`font-display text-lg ${country.rank === 1 ? "text-amber-500" : country.rank === 2 ? "text-slate-500" : country.rank === 3 ? "text-orange-400" : "text-slate-400"}`}>#{String(country.rank).padStart(2, "0")}</div><div className="flex items-center gap-3"><Flag code={country.code} name={country.name} /><span className="font-medium text-slate-800">{country.name}</span></div><div className="hidden sm:block"><div className="flex h-1.5 w-48 overflow-hidden rounded-full bg-sky-100">{["military","gdp","industry","trade","energy"].map(k => <span key={k} style={{ width: `${country.metrics[k] / 5}%`, opacity: .45 + country.metrics[k] / 155, background: k === "military" ? "#ef4444" : k === "gdp" ? "#0ea5e9" : "#6366f1" }} />)}</div></div><div className="text-right font-display text-lg text-slate-900">{formatter.format(country.score)}</div></div>)}</div>
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-[1.08fr_.92fr]" id="analyst"><div className="panel p-6 sm:p-8"><p className="eyebrow">Model interpretation</p><h2 className="mt-2 font-display text-2xl text-slate-900">Ask the Index AI</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Index AI Analyst explains rank positions through the HPI model. Answers are analytical estimates, not definitive geopolitical fact.</p><form onSubmit={ask} className="mt-6"><label className="metric-label" htmlFor="question">Your question</label><div className="mt-2 flex gap-2"><input id="question" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Why is China ahead of India?" className="field min-w-0 flex-1" /><button disabled={asking} className="btn-primary whitespace-nowrap px-5 py-3">{asking ? "Analyzing…" : "Ask"}</button></div></form><div className="mt-4 flex flex-wrap gap-2">{["Why is USA ranked #1?", "Why is China ahead of India?"].map(q => <button key={q} onClick={() => setQuestion(q)} className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs text-sky-700 hover:border-sky-400 hover:bg-sky-50">{q}</button>)}</div>{answer && <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-5 text-sm leading-7 text-slate-700"><p className="mb-2 font-display text-xs uppercase tracking-[.16em] text-sky-700">Index AI Analyst</p>{answer}</div>}</div>
        <div className="panel p-6 sm:p-8"><p className="eyebrow">Weight architecture</p><h2 className="mt-2 font-display text-2xl text-slate-900">What drives a score</h2><div className="mt-6 space-y-4">{data?.criteria.map(({ key, label, weight }) => <div key={key}><div className="mb-1.5 flex justify-between text-xs"><span className="text-slate-600">{label}</span><span className="font-display text-sky-600">{weight}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-sky-100"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" style={{ width: `${weight * 3.5}%` }} /></div></div>)}</div></div>
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-[.82fr_1.18fr]" id="discussion"><div className="panel h-fit p-6 sm:p-8"><p className="eyebrow">Signal exchange</p><h2 className="mt-2 font-display text-2xl text-slate-900">Discussion</h2><p className="mt-3 text-sm leading-6 text-slate-600">Add a concise view on the ranking methodology.</p><form onSubmit={submitComment} className="mt-6 space-y-3"><input value={name} onChange={e => setName(e.target.value)} placeholder="Name" maxLength={60} className="field" /><textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Your analysis…" maxLength={800} rows={4} className="field resize-none" /><button disabled={posting} className="btn-primary w-full">{posting ? "Publishing…" : "Submit comment"}</button></form></div>
        <div className="panel divide-y divide-sky-100 overflow-hidden">{comments.length ? comments.map(item => <article key={item._id} className="p-6"><div className="flex items-baseline justify-between gap-3"><time className="text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</time><h3 className="font-semibold text-sky-800">{item.name}</h3></div><p className="mt-2 text-sm leading-6 text-slate-600">{item.comment}</p></article>) : <div className="grid min-h-56 place-items-center p-6 text-center"><div><p className="font-display text-sm text-slate-700">No comments yet</p><p className="mt-2 text-xs text-slate-500">Post on the left and your name plus comment will appear here.</p></div></div>}</div>
      </section>
      <footer className="mt-16 border-t border-sky-200 py-7 text-center text-[11px] leading-5 text-slate-500">HARD POWER INDEX · Scores are approximate and intended for comparative analysis. No human-development, health, happiness, or lifestyle factors are included.</footer>
    </div>
  </main>;
}
