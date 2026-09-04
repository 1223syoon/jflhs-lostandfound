import { useEffect, useMemo, useState, type FormEvent } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link, Route, Switch, Router as WouterRouter, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { CalendarDays, Check, ChevronRight, ImagePlus, MapPin, Plus, Save, School, Search, Trash2, X } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import type { ItemCategory, ItemStatus, LostItem } from "@/data/items";

const queryClient = new QueryClient();
const categories: Array<"전체" | ItemCategory> = ["전체", "교복", "전자기기", "문구류", "생활용품", "기타"];

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { credentials: "include", ...options, headers: { "Content-Type": "application/json", ...(options?.headers || {}) } });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "요청을 처리하지 못했습니다.");
  return response.status === 204 ? (undefined as T) : response.json();
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const done = status === "수령 완료";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${done ? "bg-slate-100 text-slate-500" : "bg-[#e6f4ee] text-[#28765b]"}`}>{done ? <Check size={13} /> : <span className="h-1.5 w-1.5 rounded-full bg-[#42a681]" />}{status}</span>;
}

function Header() {
  const [location] = useLocation();
  const { isAuthenticated, logout } = useAuth();
  return <header className="relative z-10 border-b border-[hsl(var(--border)/.68)] bg-white/90 backdrop-blur-md"><div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-5 sm:px-8">
    <Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#101d3a] text-white"><School size={20} /></span><span className="flex flex-col leading-none"><b className="text-[15px] text-[#173653]">제주외고</b><small className="mt-1.5 text-[10px] font-semibold tracking-[.13em] text-[#6d879d]">LOST & FOUND</small></span></Link>
    <nav className="flex items-center gap-1.5" aria-label="주요 메뉴"><Link href="/" className={`rounded-lg px-3 py-2 text-sm font-semibold ${location === "/" ? "bg-[#edf5fb] text-[#125d96]" : "text-[#6b7d8c]"}`}>분실물 둘러보기</Link><Link href="/info" className={`rounded-lg px-3 py-2 text-sm font-semibold ${location === "/info" ? "bg-[#edf5fb] text-[#125d96]" : "text-[#6b7d8c]"}`}>분실물 안내</Link><Link href="/admin" className={`rounded-lg px-3 py-2 text-sm font-semibold ${location === "/admin" ? "bg-[#edf5fb] text-[#125d96]" : "text-[#6b7d8c]"}`}>{isAuthenticated ? "관리자" : "관리자 로그인"}</Link>{isAuthenticated && <button onClick={logout} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#6b7d8c]">로그아웃</button>}</nav>
  </div></header>;
}

function Footer() { return <footer className="border-t border-[#e1e7ef] bg-white"><div className="mx-auto max-w-[1180px] px-5 py-8 text-xs text-[#8794a6] sm:px-8"><span>제주외국어고등학교 학생자치회</span></div></footer>; }

function useItems() {
  const [items, setItems] = useState<LostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = () => api<LostItem[]>("/lost-items").then(setItems).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);
  return { items, loading, refresh };
}

function ItemCard({ item }: { item: LostItem }) {
  return <Link href={`/items/${item.id}`} className="group overflow-hidden rounded-[22px] border border-[#dfe6ef] bg-white shadow-[0_12px_30px_-25px_hsl(222_55%_20%/.7)] transition hover:-translate-y-1"><div className="relative aspect-[1.25] bg-[#edf2f7]">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#9baabd]"><ImagePlus size={30} /></div>}<span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#60718b]">{item.category}</span></div><div className="p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-extrabold text-[#182746]">{item.itemName}</h3><StatusBadge status={item.status} /></div><p className="mt-2 flex items-center gap-1.5 text-xs text-[#8794a6]"><MapPin size={13} />{item.foundLocation}</p></div></Link>;
}

function Home() {
  const { items, loading } = useItems(); const [query, setQuery] = useState(""); const [category, setCategory] = useState<"전체" | ItemCategory>("전체");
  const visible = useMemo(() => items.filter((i) => (category === "전체" || i.category === category) && i.itemName.toLowerCase().includes(query.toLowerCase())), [items, query, category]);
  return <div className="min-h-screen"><Header /><main className="page-enter"><section className="mx-auto max-w-[1180px] px-5 pb-8 pt-14 sm:px-8 sm:pt-20"><p className="text-[11px] font-extrabold tracking-[.2em] text-[#68809a]">JEJU FOREIGN LANGUAGE HIGH SCHOOL</p><h1 className="mt-4 text-[clamp(2.4rem,7vw,5rem)] font-extrabold tracking-[-.09em] text-[#101d3a]">분실물 센터</h1><p className="mt-4 text-base text-[#66738a]">잃어버린 물건을 찾아보세요.</p><div className="mt-9 flex h-14 items-center gap-3 rounded-2xl border border-[#cfd9e6] bg-white px-4 shadow-[0_14px_35px_-27px_hsl(222_55%_20%/.8)]"><Search className="text-[#7690aa]" size={20} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="물품 이름으로 검색" className="w-full bg-transparent text-sm outline-none placeholder:text-[#9aa9ba]" /></div></section><section className="mx-auto max-w-[1180px] px-5 pb-16 sm:px-8"><div className="flex gap-2 overflow-x-auto pb-3">{categories.map((c) => <button key={c} onClick={() => setCategory(c)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${category === c ? "bg-[#101d3a] text-white" : "border border-[#d7e0eb] bg-white text-[#71819a]"}`}>{c}</button>)}</div>{loading ? <p className="py-20 text-center text-sm text-[#8794a6]">분실물을 불러오는 중입니다.</p> : visible.length === 0 ? <div className="rounded-[26px] border border-dashed border-[#ccd8e5] bg-white py-20 text-center"><p className="font-bold text-[#5d6f88]">현재 등록된 분실물이 없습니다.</p><p className="mt-2 text-sm text-[#9aa8b8]">새로운 분실물이 등록되면 이곳에서 확인할 수 있어요.</p></div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">{visible.map((item) => <ItemCard item={item} key={item.id} />)}</div>}</section></main><Footer /></div>;
}

function Detail({ id }: { id: string }) {
  const { items, loading } = useItems(); const item = items.find((i) => i.id === id);
  if (loading) return <><Header /><main className="mx-auto max-w-[800px] px-5 py-20 text-center text-[#8794a6]">불러오는 중입니다.</main></>;
  if (!item) return <NotFound />;
  return <div className="min-h-screen"><Header /><main className="mx-auto max-w-[900px] px-5 py-10 sm:px-8 sm:py-16"><Link href="/" className="text-sm font-bold text-[#55708e]">← 목록으로 돌아가기</Link><div className="mt-7 grid gap-8 rounded-[28px] border border-[#dfe6ef] bg-white p-5 shadow-[0_20px_45px_-34px_hsl(222_55%_20%/.8)] sm:grid-cols-2 sm:p-8"><div className="aspect-square overflow-hidden rounded-2xl bg-[#edf2f7]">{item.imageUrl ? <img src={item.imageUrl} alt={item.itemName} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#9baabd]"><ImagePlus size={42} /></div>}</div><div><div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-[#71819a]">{item.category}</span><StatusBadge status={item.status} /></div><h1 className="mt-5 text-3xl font-extrabold tracking-[-.07em] text-[#101d3a]">{item.itemName}</h1><dl className="mt-8 space-y-4 text-sm"><div className="flex gap-3"><CalendarDays className="text-[#7895b0]" size={18} /><div><dt className="text-xs text-[#9aa8b8]">발견 날짜</dt><dd className="mt-1 font-bold text-[#425875]">{item.foundDate}</dd></div></div><div className="flex gap-3"><MapPin className="text-[#7895b0]" size={18} /><div><dt className="text-xs text-[#9aa8b8]">발견 장소</dt><dd className="mt-1 font-bold text-[#425875]">{item.foundLocation}</dd></div></div></dl><p className="mt-8 whitespace-pre-wrap border-t border-[#e7edf3] pt-6 text-sm leading-7 text-[#66738a]">{item.description || "등록된 상세 설명이 없습니다."}</p>{item.status === "보관 중" && <div className="mt-7 rounded-2xl bg-[#f0f6fb] p-4 text-sm font-semibold leading-6 text-[#43627f]">본인의 물품이라면 학생자치회 임원에게 알려주세요. 본인 확인 후 분실물을 수령할 수 있습니다.</div>}</div></div></main><Footer /></div>;
}

function Info() {
  const sections = [
    { title: "분실물을 발견했다면", text: "분실물을 발견한 경우 자율생활부 부원에게 전달해주세요.", icon: Plus },
    { title: "분실물을 찾고 있다면", text: "자신의 분실물이 사이트에 등록되어 있다면 학생자치회 임원에게 전달하여 수령해주세요.", icon: Check },
    { title: "보관 및 폐기 안내", text: "등록된 분실물은 매달 말까지 보관되며, 기간이 지난 분실물은 폐기됩니다.", icon: CalendarDays },
  ];
  return <div className="min-h-screen"><Header /><main className="mx-auto max-w-[820px] px-5 pb-16 pt-12 sm:px-8 sm:pt-16"><Link href="/" className="text-sm font-bold text-[#55708e]">← 목록으로 돌아가기</Link><p className="mt-10 text-[11px] font-extrabold tracking-[.2em] text-[#68809a]">GUIDE</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-.08em] text-[#101d3a]">분실물 안내</h1><p className="mt-4 text-sm leading-6 text-[#66738a]">분실물을 발견했거나 찾고 있을 때 아래 안내를 확인해 주세요.</p><div className="mt-9 space-y-4">{sections.map(({ title, text, icon: Icon }) => <section key={title} className="rounded-[24px] border border-[#dfe6ef] bg-white p-5 shadow-[0_14px_30px_-26px_hsl(222_55%_20%/.7)] sm:p-7"><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf5fb] text-[#125d96]"><Icon size={21} /></span><div><h2 className="text-lg font-extrabold tracking-[-.04em] text-[#182746]">{title}</h2><p className="mt-3 text-sm leading-7 text-[#66738a]">{text}</p></div></div></section>)}</div></main><Footer /></div>;
}

function AdminLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      window.location.href = "/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };
  return <><Header /><main className="mx-auto max-w-[460px] px-5 py-16 sm:py-24"><div className="rounded-[26px] border border-[#dbe2ec] bg-white p-6 shadow-[0_18px_40px_-30px_hsl(222_55%_20%/.8)] sm:p-8"><p className="text-[11px] font-extrabold tracking-[.2em] text-[#68809a]">STUDENT COUNCIL ADMIN</p><h1 className="mt-3 text-3xl font-extrabold tracking-[-.08em] text-[#101d3a]">관리자 로그인</h1><p className="mt-3 text-sm leading-6 text-[#66738a]">관리자 계정으로 로그인하면 분실물을 등록하고 관리할 수 있습니다.</p>{error && <p className="mt-5 rounded-xl bg-[#fff2f2] px-3 py-2.5 text-sm font-semibold text-[#a34c56]" role="alert">{error}</p>}<form onSubmit={submit} className="mt-7 space-y-4"><label><span className="form-label">이메일</span><input required autoComplete="username" className="admin-input" value={email} onChange={(e) => setEmail(e.target.value)} /></label><label><span className="form-label">비밀번호</span><input required type="password" autoComplete="current-password" className="admin-input" value={password} onChange={(e) => setPassword(e.target.value)} /></label><button disabled={submitting} className="mt-2 flex h-12 w-full items-center justify-center rounded-full bg-[#101d3a] text-sm font-extrabold text-white disabled:opacity-60">{submitting ? "로그인 중..." : "로그인하기"}</button></form></div></main><Footer /></>;
}

function Admin() {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth(); const { items, loading, refresh } = useItems(); const [editing, setEditing] = useState<LostItem | null>(null); const [notice, setNotice] = useState(""); const [imageUrl, setImageUrl] = useState("");
  const blank = { itemName: "", category: "교복" as ItemCategory, foundDate: new Date().toISOString().slice(0, 10), foundLocation: "", description: "", status: "보관 중" as ItemStatus };
  const [form, setForm] = useState(blank);
  useEffect(() => { if (editing) { setForm({ itemName: editing.itemName, category: editing.category, foundDate: editing.foundDate, foundLocation: editing.foundLocation, description: editing.description, status: editing.status }); setImageUrl(editing.imageUrl || ""); } }, [editing]);
  if (authLoading) return <><Header /><main className="mx-auto max-w-[700px] px-5 py-20 text-center text-[#8794a6]">관리자 권한을 확인하는 중입니다.</main></>;
  if (!isAuthenticated) return <AdminLogin />;
  const submit = async (e: FormEvent) => { e.preventDefault(); try { const payload = JSON.stringify({ ...form, imageUrl: imageUrl || null }); if (editing) await api(`/lost-items/${editing.id}`, { method: "PATCH", body: payload }); else await api("/lost-items", { method: "POST", body: payload }); setNotice(editing ? "분실물 정보를 수정했습니다." : "분실물을 등록했습니다."); setEditing(null); setForm(blank); setImageUrl(""); await refresh(); } catch (err) { setNotice(err instanceof Error ? err.message : "저장에 실패했습니다."); } };
  const selectImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const source = new Image();
      source.onload = () => {
        const scale = Math.min(1, 1280 / Math.max(source.naturalWidth, source.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
        canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
        setImageUrl(canvas.toDataURL("image/jpeg", 0.82));
      };
      source.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };
  const remove = async (id: string) => {
    if (!window.confirm("정말 이 분실물을 삭제하시겠습니까?")) return;
    try {
      await api(`/lost-items/${id}`, { method: "DELETE" });
      await refresh();
      setNotice("분실물을 삭제했습니다.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  };
  return <div className="min-h-screen"><Header /><main className="mx-auto max-w-[1180px] px-5 pb-16 pt-10 sm:px-8 sm:pt-14"><div className="flex items-end justify-between border-b border-[#dfe5ee] pb-8"><div><p className="text-[11px] font-extrabold tracking-[.2em] text-[#687891]">STUDENT COUNCIL ADMIN</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-.08em] text-[#101d3a]">분실물 관리</h1></div><Link href="/" className="text-sm font-bold text-[#60718b]">목록으로</Link></div>{notice && <p className="mt-5 rounded-2xl bg-[#f0faf5] px-4 py-3 text-sm font-bold text-[#28765b]">{notice}</p>}<div className="mt-8 grid gap-8 lg:grid-cols-[1fr_.85fr]"><form onSubmit={submit} className="rounded-[26px] border border-[#dbe2ec] bg-white p-5 shadow-[0_16px_35px_-26px_hsl(222_55%_20%/.5)] sm:p-7"><div className="flex items-center gap-3 border-b border-[#e6ebf2] pb-5"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#101d3a] text-white">{editing ? <Save size={19} /> : <Plus size={19} />}</span><h2 className="text-lg font-extrabold text-[#182746]">{editing ? "분실물 수정" : "새 분실물 등록"}</h2></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="sm:col-span-2"><span className="form-label">물품명</span><input required className="admin-input" value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} /></label><label><span className="form-label">카테고리</span><select className="admin-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ItemCategory })}>{categories.slice(1).map((c) => <option key={c}>{c}</option>)}</select></label><label><span className="form-label">발견 날짜</span><input required type="date" className="admin-input" value={form.foundDate} onChange={(e) => setForm({ ...form, foundDate: e.target.value })} /></label><label className="sm:col-span-2"><span className="form-label">발견 장소</span><input required className="admin-input" value={form.foundLocation} onChange={(e) => setForm({ ...form, foundLocation: e.target.value })} /></label><label className="sm:col-span-2"><span className="form-label">설명</span><textarea className="admin-input min-h-28 resize-y" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label><span className="form-label">상태</span><select className="admin-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ItemStatus })}><option>보관 중</option><option>수령 완료</option></select></label><label><span className="form-label">이미지</span><span className="relative flex h-[46px] cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#b9c7d9] px-3 text-sm font-semibold text-[#60718b]"><ImagePlus size={17} />사진 선택<input type="file" accept="image/*" onChange={(e) => selectImage(e.target.files?.[0])} className="absolute inset-0 opacity-0" /></span></label></div>{imageUrl && <div className="relative mt-5 w-40"><img src={imageUrl} alt="미리보기" className="h-32 w-40 rounded-2xl object-cover" /><button type="button" onClick={() => setImageUrl("")} className="absolute -right-2 -top-2 rounded-full bg-[#101d3a] p-1 text-white"><X size={14} /></button></div>}<button className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#101d3a] text-sm font-extrabold text-white"><Save size={17} />{editing ? "수정 저장" : "분실물 등록하기"}</button></form><section className="rounded-[26px] border border-[#dbe2ec] bg-[#f8fafc] p-5 sm:p-7"><div className="flex justify-between"><h2 className="text-lg font-extrabold text-[#182746]">등록된 물품 관리</h2><span className="text-xs font-bold text-[#71809a]">{items.length}개</span></div><div className="mt-5 space-y-3">{!loading && items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-[#e0e6ef] bg-white p-3"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#edf2f7]">{item.imageUrl && <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-[#182746]">{item.itemName}</p><StatusBadge status={item.status} /></div><button onClick={() => setEditing(item)} className="text-xs font-bold text-[#55708e]">수정</button><button onClick={() => remove(item.id)} className="text-[#b06b75]" aria-label="삭제"><Trash2 size={16} /></button></div>)}</div></section></div></main><Footer /></div>;
}

function Router() { return <Switch><Route path="/" component={Home} /><Route path="/items/:id">{(params) => <Detail id={params.id} />}</Route><Route path="/info" component={Info} /><Route path="/admin" component={Admin} /><Route component={NotFound} /></Switch>; }
export default function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}><ErrorBoundary><Router /></ErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>; }