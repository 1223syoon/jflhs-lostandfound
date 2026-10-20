import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link, Route, Switch, Router as WouterRouter, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { CalendarDays, Check, ImagePlus, LoaderCircle, MapPin, Plus, Save, School, Search, Trash2, X } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import type { ItemCategory, ItemStatus, LostItem } from "@/data/items";

const queryClient = new QueryClient();
const categories: Array<"전체" | ItemCategory> = ["전체", "교복", "전자기기", "문구류", "생활용품", "기타"];
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const MAX_SOURCE_IMAGE_SIZE = 50 * 1024 * 1024;
const MAX_SOURCE_IMAGE_PIXELS = 80_000_000;
const MAX_STORED_IMAGE_SIZE = 8 * 1024 * 1024;

function apiUrl(path: string) {
  return `${API_ORIGIN}/api${path}`;
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), { credentials: "include", ...options, headers: { "Content-Type": "application/json", ...(options?.headers || {}) } });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "요청을 처리하지 못했습니다.");
  return response.status === 204 ? (undefined as T) : response.json();
}

function imageSource(imageUrl: string | null | undefined) {
  if (!imageUrl) return "";
  if (!imageUrl.startsWith("/objects/")) return imageUrl;
  const encodedPath = imageUrl.split("/").map((part) => encodeURIComponent(part)).join("/");
  return apiUrl(`/storage${encodedPath}`);
}

async function detectImageType(file: File): Promise<"image/jpeg" | "image/png" | "image/webp" | "image/heic" | null> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) return "image/png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" &&
    ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(String.fromCharCode(...bytes.slice(8, 12)))
  ) return "image/heic";
  return null;
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("이미지를 변환하지 못했습니다.")), "image/jpeg", quality);
  });
}

async function prepareImage(file: File): Promise<File> {
  if (file.size === 0) throw new Error("빈 파일은 업로드할 수 없습니다.");
  if (file.size > MAX_SOURCE_IMAGE_SIZE) throw new Error("원본 사진은 50MB 이하만 선택할 수 있습니다.");

  const detectedType = await detectImageType(file);
  if (!detectedType) throw new Error("실제 파일 형식을 확인할 수 없습니다. JPEG, PNG, WebP 또는 HEIC 사진을 선택해 주세요.");

  let bitmap: ImageBitmap;
  try {
    // createImageBitmap applies EXIF orientation before drawing into the canvas.
    bitmap = await createImageBitmap(file);
  } catch {
    if (detectedType === "image/heic") {
      throw new Error("이 브라우저에서 HEIC 사진을 열 수 없습니다. JPEG로 변환하거나 카메라 설정을 '호환성 우선'으로 바꿔 주세요.");
    }
    throw new Error("사진을 열 수 없습니다. 손상되지 않은 JPEG, PNG 또는 WebP 파일을 선택해 주세요.");
  }

  try {
    const { width, height } = bitmap;
    if (width <= 0 || height <= 0 || width * height > MAX_SOURCE_IMAGE_PIXELS) {
      throw new Error("사진 해상도가 너무 큽니다. 8천만 픽셀 이하의 사진을 선택해 주세요.");
    }
    const scale = Math.min(1, 2000 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("사진 변환 기능을 사용할 수 없습니다.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let output: Blob | undefined;
    for (const maxDimension of [2000, 1800, 1600]) {
      if (maxDimension !== 2000) {
        const nextScale = Math.min(1, maxDimension / Math.max(width, height));
        canvas.width = Math.max(1, Math.round(width * nextScale));
        canvas.height = Math.max(1, Math.round(height * nextScale));
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      }
      for (const quality of [0.9, 0.86, 0.82, 0.78]) {
        const candidate = await canvasBlob(canvas, quality);
        if (candidate.size <= MAX_STORED_IMAGE_SIZE) {
          output = candidate;
          break;
        }
      }
      if (output) break;
    }
    if (!output) throw new Error("변환 후에도 사진이 8MB를 넘습니다. 해상도가 더 낮은 사진을 선택해 주세요.");

    const originalName = file.name.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 220) || "lost-item";
    const jpegName = `${originalName.replace(/\.[^.]+$/, "")}.jpg`;
    return new File([output], jpegName, { type: "image/jpeg", lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}

function LostItemImage({ imageUrl, alt, className, iconSize = 30 }: {
  imageUrl: string | null | undefined;
  alt: string;
  className: string;
  iconSize?: number;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [imageUrl]);
  return <div className={`${className} overflow-hidden`}>
    {imageUrl && !failed
      ? <img src={imageSource(imageUrl)} alt={alt} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      : <div className="flex h-full w-full items-center justify-center text-[#9baabd]"><ImagePlus size={iconSize} /></div>}
  </div>;
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const done = status === "수령 완료";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${done ? "bg-slate-100 text-slate-500" : "bg-[#e6f4ee] text-[#28765b]"}`}>{done ? <Check size={13} /> : <span className="h-1.5 w-1.5 rounded-full bg-[#42a681]" />}{status}</span>;
}

function Header() {
  const [location] = useLocation();
  const { isAuthenticated, logout } = useAuth(API_ORIGIN);
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
  return <Link href={`/items/${item.id}`} className="group overflow-hidden rounded-[22px] border border-[#dfe6ef] bg-white shadow-[0_12px_30px_-25px_hsl(222_55%_20%/.7)] transition hover:-translate-y-1"><div className="relative aspect-[1.25] bg-[#edf2f7]"><LostItemImage imageUrl={item.imageUrl} alt="" className="absolute inset-0" /><span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#60718b]">{item.category}</span></div><div className="p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-extrabold text-[#182746]">{item.itemName}</h3><StatusBadge status={item.status} /></div><p className="mt-2 flex items-center gap-1.5 text-xs text-[#8794a6]"><MapPin size={13} />{item.foundLocation}</p></div></Link>;
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
  return <div className="min-h-screen"><Header /><main className="mx-auto max-w-[900px] px-5 py-10 sm:px-8 sm:py-16"><Link href="/" className="text-sm font-bold text-[#55708e]">← 목록으로 돌아가기</Link><div className="mt-7 grid gap-8 rounded-[28px] border border-[#dfe6ef] bg-white p-5 shadow-[0_20px_45px_-34px_hsl(222_55%_20%/.8)] sm:grid-cols-2 sm:p-8"><LostItemImage imageUrl={item.imageUrl} alt={item.itemName} iconSize={42} className="aspect-square rounded-2xl bg-[#edf2f7]" /><div><div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-[#71819a]">{item.category}</span><StatusBadge status={item.status} /></div><h1 className="mt-5 text-3xl font-extrabold tracking-[-.07em] text-[#101d3a]">{item.itemName}</h1><dl className="mt-8 space-y-4 text-sm"><div className="flex gap-3"><CalendarDays className="text-[#7895b0]" size={18} /><div><dt className="text-xs text-[#9aa8b8]">발견 날짜</dt><dd className="mt-1 font-bold text-[#425875]">{item.foundDate}</dd></div></div><div className="flex gap-3"><MapPin className="text-[#7895b0]" size={18} /><div><dt className="text-xs text-[#9aa8b8]">발견 장소</dt><dd className="mt-1 font-bold text-[#425875]">{item.foundLocation}</dd></div></div></dl><p className="mt-8 whitespace-pre-wrap border-t border-[#e7edf3] pt-6 text-sm leading-7 text-[#66738a]">{item.description || "등록된 상세 설명이 없습니다."}</p>{item.status === "보관 중" && <div className="mt-7 rounded-2xl bg-[#f0f6fb] p-4 text-sm font-semibold leading-6 text-[#43627f]">본인의 물품이라면 학생자치회 임원에게 알려주세요. 본인 확인 후 분실물을 수령할 수 있습니다.</div>}</div></div></main><Footer /></div>;
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
  const { login } = useAuth(API_ORIGIN);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const addDigit = (digit: string) => {
    setPin((current) => current.length < 4 ? `${current}${digit}` : current);
    setError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setError("숫자 비밀번호 4자리를 입력해 주세요.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await login(pin);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
      setPin("");
      pinInputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };
  return <><Header /><main className="mx-auto max-w-[460px] px-5 py-16 sm:py-24"><div className="rounded-[26px] border border-[#dbe2ec] bg-white p-6 shadow-[0_18px_40px_-30px_hsl(222_55%_20%/.8)] sm:p-8"><p className="text-[11px] font-extrabold tracking-[.2em] text-[#68809a]">STUDENT COUNCIL ADMIN</p><h1 className="mt-3 text-3xl font-extrabold tracking-[-.08em] text-[#101d3a]">관리자 로그인</h1><p className="mt-3 text-sm leading-6 text-[#66738a]">숫자 비밀번호를 입력하면 관리자 모드로 들어갑니다.</p>{error && <p className="mt-5 rounded-xl bg-[#fff2f2] px-3 py-2.5 text-sm font-semibold text-[#a34c56]" role="alert">{error}</p>}<form onSubmit={submit} className="mt-7">
      <label htmlFor="admin-pin" className="sr-only">4자리 숫자 비밀번호</label>
      <input ref={pinInputRef} id="admin-pin" autoFocus type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]*" maxLength={4} value={pin} onChange={(event) => { setPin(event.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }} className="sr-only" aria-describedby="admin-pin-help" />
      <p id="admin-pin-help" className="mb-5 text-center text-xs font-medium text-[#71809a]">4자리 숫자를 입력한 뒤 확인을 눌러 주세요.</p>
      <div className="mb-6 flex justify-center gap-4" aria-label={`${pin.length} / 4자리 입력`}>
        {[0, 1, 2, 3].map((index) => <span key={index} className={`h-3.5 w-3.5 rounded-full border-2 ${index < pin.length ? "border-[#125d96] bg-[#125d96]" : "border-[#b9c6d6] bg-white"}`} aria-hidden="true" />)}
      </div>
      <div className="mx-auto grid max-w-[270px] grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => <button key={digit} type="button" aria-label={`${digit}`} onClick={() => addDigit(digit)} disabled={submitting} className="flex h-14 items-center justify-center rounded-2xl border border-[#e1e7ef] bg-[#f8fafc] text-xl font-bold text-[#182746] transition hover:bg-[#edf5fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#125d96] disabled:opacity-50">{digit}</button>)}
        <button type="button" onClick={() => { setPin(""); setError(""); }} disabled={submitting} className="flex h-14 items-center justify-center rounded-2xl text-xs font-bold text-[#71809a] hover:bg-[#f3f6fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#125d96] disabled:opacity-50">초기화</button>
        <button type="button" aria-label="0" onClick={() => addDigit("0")} disabled={submitting} className="flex h-14 items-center justify-center rounded-2xl border border-[#e1e7ef] bg-[#f8fafc] text-xl font-bold text-[#182746] transition hover:bg-[#edf5fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#125d96] disabled:opacity-50">0</button>
        <button type="button" aria-label="마지막 숫자 지우기" onClick={() => { setPin((current) => current.slice(0, -1)); setError(""); }} disabled={submitting} className="flex h-14 items-center justify-center rounded-2xl text-lg font-bold text-[#71809a] hover:bg-[#f3f6fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#125d96] disabled:opacity-50">⌫</button>
      </div>
      <button type="submit" disabled={submitting || pin.length !== 4} className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-[#101d3a] text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "확인 중..." : "확인"}</button>
    </form></div></main><Footer /></>;
}

function Admin() {
  const { isAuthenticated, isLoading: authLoading } = useAuth(API_ORIGIN);
  const { items, loading, refresh } = useItems();
  const [editing, setEditing] = useState<LostItem | null>(null);
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [pendingImagePath, setPendingImagePath] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageStage, setImageStage] = useState<"preparing" | "uploading" | "verifying" | null>(null);
  const [imageError, setImageError] = useState("");
  const [imageSuccess, setImageSuccess] = useState(false);
  const blank = { itemName: "", category: "교복" as ItemCategory, foundDate: new Date().toISOString().slice(0, 10), foundLocation: "", description: "", status: "보관 중" as ItemStatus };
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (editing) {
      setForm({
        itemName: editing.itemName,
        category: editing.category,
        foundDate: editing.foundDate,
        foundLocation: editing.foundLocation,
        description: editing.description,
        status: editing.status,
      });
      setImageUrl(editing.imageUrl || "");
      setImagePreview("");
      setPendingImagePath("");
      setImageError("");
      setImageSuccess(false);
    }
  }, [editing]);

  if (authLoading) return <><Header /><main className="mx-auto max-w-[700px] px-5 py-20 text-center text-[#8794a6]">관리자 권한을 확인하는 중입니다.</main></>;
  if (!isAuthenticated) return <AdminLogin />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (imageUploading) return;
    try {
      const payloadData: Record<string, unknown> = { ...form };
      if (!editing || imageUrl !== (editing.imageUrl || "")) {
        payloadData.imageUrl = imageUrl || null;
      }
      const payload = JSON.stringify(payloadData);
      if (editing) await api(`/lost-items/${editing.id}`, { method: "PATCH", body: payload });
      else await api("/lost-items", { method: "POST", body: payload });
      setNotice(editing ? "분실물 정보를 수정했습니다." : "분실물을 등록했습니다.");
      setNoticeError(false);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setEditing(null);
      setForm(blank);
      setImageUrl("");
      setImagePreview("");
      setPendingImagePath("");
      setImageError("");
      setImageSuccess(false);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "저장에 실패했습니다.");
      setNoticeError(true);
    }
  };

  const selectImage = async (file?: File) => {
    if (!file || imageUploading) return;
    setImageError("");
    setImageSuccess(false);
    setImageUploading(true);
    setImageStage("preparing");
    let localPreview = "";
    try {
      const uploadFile = await prepareImage(file);
      localPreview = URL.createObjectURL(uploadFile);
      setImagePreview(localPreview);
      setImageStage("uploading");
      const upload = await api<{ uploadURL: string; objectPath: string }>("/storage/uploads/request-url", {
        method: "POST",
        body: JSON.stringify({ name: uploadFile.name, size: uploadFile.size, contentType: uploadFile.type }),
      });
      const response = await fetch(upload.uploadURL, {
        method: "PUT",
        headers: { "Content-Type": uploadFile.type },
        body: uploadFile,
      });
      if (!response.ok) {
        if (response.status === 413) throw new Error("압축한 사진이 저장 한도(8MB)를 넘었습니다. 더 작은 사진을 선택해 주세요.");
        if (response.status === 403) throw new Error("업로드 주소가 만료됐습니다. 사진을 다시 선택해 주세요.");
        throw new Error(`Object Storage에 사진을 올리지 못했습니다 (HTTP ${response.status}).`);
      }

      setImageStage("verifying");
      const confirmed = await api<{ objectPath: string; contentType: string; size: number; width: number; height: number }>(
        "/storage/uploads/confirm",
        { method: "POST", body: JSON.stringify({ objectPath: upload.objectPath }) },
      );
      if (!confirmed.objectPath || confirmed.contentType !== "image/jpeg" || confirmed.size <= 0) {
        throw new Error("저장된 사진을 확인하지 못했습니다. 다시 선택해 주세요.");
      }

      const previousPendingPath = pendingImagePath;
      setImageUrl(confirmed.objectPath);
      setPendingImagePath(confirmed.objectPath);
      setImageSuccess(true);
      setImageError("");
      if (previousPendingPath && previousPendingPath !== confirmed.objectPath) {
        await api(`/storage${previousPendingPath}`, { method: "DELETE" }).catch(() => undefined);
      }
      if (localPreview) URL.revokeObjectURL(localPreview);
      localPreview = "";
      setImagePreview("");
    } catch (error) {
      if (localPreview) URL.revokeObjectURL(localPreview);
      setImagePreview("");
      setImageError(error instanceof Error ? error.message : "사진 업로드에 실패했습니다.");
      setImageSuccess(false);
    } finally {
      setImageUploading(false);
      setImageStage(null);
    }
  };

  const clearImage = async () => {
    setImageUrl("");
    setImageSuccess(false);
    setImageError("");
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview("");
    if (pendingImagePath) {
      const pathToDelete = pendingImagePath;
      setPendingImagePath("");
      await api(`/storage${pathToDelete}`, { method: "DELETE" }).catch(() => undefined);
    }
  };

  const editItem = async (item: LostItem) => {
    if (imageUploading) return;
    if (pendingImagePath) {
      await api(`/storage${pendingImagePath}`, { method: "DELETE" }).catch(() => undefined);
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview("");
    setPendingImagePath("");
    setEditing(item);
  };

  const remove = async (id: string) => {
    if (!window.confirm("정말 이 분실물을 삭제하시겠습니까?")) return;
    try {
      await api(`/lost-items/${id}`, { method: "DELETE" });
      await refresh();
      setNotice("분실물을 삭제했습니다.");
      setNoticeError(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "삭제에 실패했습니다.");
      setNoticeError(true);
    }
  };

  return <div className="min-h-screen"><Header /><main className="mx-auto max-w-[1180px] px-5 pb-16 pt-10 sm:px-8 sm:pt-14"><div className="flex items-end justify-between border-b border-[#dfe5ee] pb-8"><div><p className="text-[11px] font-extrabold tracking-[.2em] text-[#687891]">STUDENT COUNCIL ADMIN</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-.08em] text-[#101d3a]">분실물 관리</h1></div><Link href="/" className="text-sm font-bold text-[#60718b]">목록으로</Link></div>
    {notice && <p className={`mt-5 rounded-2xl px-4 py-3 text-sm font-bold ${noticeError ? "bg-[#fff2f2] text-[#a34c56]" : "bg-[#f0faf5] text-[#28765b]"}`} role={noticeError ? "alert" : "status"}>{notice}</p>}
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_.85fr]">
      <form onSubmit={submit} className="rounded-[26px] border border-[#dbe2ec] bg-white p-5 shadow-[0_16px_35px_-26px_hsl(222_55%_20%/.5)] sm:p-7">
        <div className="flex items-center gap-3 border-b border-[#e6ebf2] pb-5"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#101d3a] text-white">{editing ? <Save size={19} /> : <Plus size={19} />}</span><h2 className="text-lg font-extrabold text-[#182746]">{editing ? "분실물 수정" : "새 분실물 등록"}</h2></div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="form-label">물품명</span><input required className="admin-input" value={form.itemName} onChange={(event) => setForm({ ...form, itemName: event.target.value })} /></label>
          <label><span className="form-label">카테고리</span><select className="admin-input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ItemCategory })}>{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label>
          <label><span className="form-label">발견 날짜</span><input required type="date" className="admin-input" value={form.foundDate} onChange={(event) => setForm({ ...form, foundDate: event.target.value })} /></label>
          <label className="sm:col-span-2"><span className="form-label">발견 장소</span><input required className="admin-input" value={form.foundLocation} onChange={(event) => setForm({ ...form, foundLocation: event.target.value })} /></label>
          <label className="sm:col-span-2"><span className="form-label">설명</span><textarea className="admin-input min-h-28 resize-y" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label><span className="form-label">상태</span><select className="admin-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ItemStatus })}><option>보관 중</option><option>수령 완료</option></select></label>
          <div>
            <span className="form-label">이미지</span>
            <label className={`relative mt-1 flex h-[46px] cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#b9c7d9] px-3 text-sm font-semibold text-[#60718b] ${imageUploading ? "cursor-wait opacity-60" : ""}`}>
              <ImagePlus size={17} />{imageUploading ? "사진 처리 중..." : "사진 선택"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                disabled={imageUploading}
                onChange={(event) => { const file = event.currentTarget.files?.[0]; void selectImage(file); event.currentTarget.value = ""; }}
                className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-wait"
              />
            </label>
            <p className="mt-2 text-xs leading-5 text-[#8492a5]">JPEG, PNG, WebP, HEIC · 원본 최대 50MB · 저장 전 긴 변 2,000px 이하로 변환</p>
          </div>
        </div>

        {(imagePreview || imageUrl) && <div className="relative mt-5 w-40">
          <LostItemImage imageUrl={imagePreview || imageUrl} alt="분실물 사진 미리보기" className="h-32 w-40 rounded-2xl bg-[#edf2f7]" />
          <button type="button" onClick={() => void clearImage()} disabled={imageUploading} aria-label="사진 삭제" className="absolute -right-2 -top-2 rounded-full bg-[#101d3a] p-1 text-white disabled:opacity-50"><X size={14} /></button>
        </div>}
        {imageStage && <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#55708e]" role="status"><LoaderCircle size={16} className="animate-spin" />{imageStage === "preparing" ? "사진을 확인하고 크기를 조정하고 있습니다." : imageStage === "uploading" ? "영구 저장소에 사진을 업로드하고 있습니다." : "저장된 파일과 사진 방향을 확인하고 있습니다."}</p>}
        {imageError && <p className="mt-3 rounded-xl bg-[#fff2f2] px-3 py-2.5 text-sm font-semibold text-[#a34c56]" role="alert">{imageError}</p>}
        {imageSuccess && <p className="mt-3 text-sm font-semibold text-[#28765b]" role="status">사진 저장이 확인됐습니다. 미리보기에도 표시됩니다.</p>}
        <button disabled={imageUploading} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#101d3a] text-sm font-extrabold text-white disabled:opacity-60"><Save size={17} />{imageUploading ? "이미지 처리 중..." : editing ? "수정 저장" : "분실물 등록하기"}</button>
      </form>
      <section className="rounded-[26px] border border-[#dbe2ec] bg-[#f8fafc] p-5 sm:p-7">
        <div className="flex justify-between"><h2 className="text-lg font-extrabold text-[#182746]">등록된 물품 관리</h2><span className="text-xs font-bold text-[#71809a]">{items.length}개</span></div>
        <div className="mt-5 space-y-3">{!loading && items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-[#e0e6ef] bg-white p-3"><LostItemImage imageUrl={item.imageUrl} alt="" iconSize={20} className="h-14 w-14 shrink-0 rounded-xl bg-[#edf2f7]" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-[#182746]">{item.itemName}</p><StatusBadge status={item.status} /></div><button disabled={imageUploading} onClick={() => void editItem(item)} className="text-xs font-bold text-[#55708e] disabled:opacity-50">수정</button><button disabled={imageUploading} onClick={() => void remove(item.id)} className="text-[#b06b75] disabled:opacity-50" aria-label="삭제"><Trash2 size={16} /></button></div>)}</div>
      </section>
    </div>
  </main><Footer /></div>;
}

function Router() { return <Switch><Route path="/" component={Home} /><Route path="/items/:id">{(params) => <Detail id={params.id} />}</Route><Route path="/info" component={Info} /><Route path="/admin" component={Admin} /><Route component={NotFound} /></Switch>; }
export default function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}><ErrorBoundary><Router /></ErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>; }