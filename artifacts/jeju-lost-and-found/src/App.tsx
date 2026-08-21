import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { lostItems, type ItemCategory, type LostItem } from '@/data/items';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  HelpCircle,
  ImagePlus,
  Info,
  MapPin,
  PackageOpen,
  Plus,
  Save,
  School,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const categories: Array<'전체' | ItemCategory> = ['전체', '교복', '전자기기', '문구류', '생활용품', '기타'];
const categoryIcon: Record<'전체' | ItemCategory, string> = {
  전체: '◎',
  교복: '✦',
  전자기기: '⌁',
  문구류: '✎',
  생활용품: '□',
  기타: '＋',
};
const ITEMS_STORAGE_KEY = 'jeju-foreign-language-high-school-lost-items';

function loadItems() {
  try {
    const saved = window.localStorage.getItem(ITEMS_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as LostItem[]) : lostItems;
  } catch {
    return lostItems;
  }
}

function saveItems(items: LostItem[]) {
  window.localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(items));
}

function StatusBadge({ status }: { status: LostItem['status'] }) {
  const received = status === '수령 완료';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${received ? 'bg-slate-100 text-slate-500' : 'bg-[#e6f4ee] text-[#28765b]'}`} data-testid={`status-item-${received ? 'received' : 'stored'}`}>
      {received ? <Check size={13} strokeWidth={2.5} /> : <span className="h-1.5 w-1.5 rounded-full bg-[#42a681]" />}
      {status}
    </span>
  );
}

function BrandMark() {
  return (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#101d3a] text-white shadow-[0_8px_18px_-8px_hsl(222_55%_20%/.7)]">
      <span className="absolute top-[7px] h-1 w-4 rounded-full bg-[#91b6dc]" />
      <School size={20} strokeWidth={1.8} />
    </span>
  );
}

function Header() {
  const [location] = useLocation();
  return (
    <header className="relative z-10 border-b border-[hsl(var(--border)/.68)] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-5 sm:px-8">
        <Link href="/" className="focus-ring group flex items-center gap-3 rounded-xl" data-testid="link-home-brand">
          <BrandMark />
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-extrabold tracking-[-.04em] text-[#173653]">제주외고</span>
            <span className="mt-1.5 text-[10px] font-semibold tracking-[.13em] text-[#6d879d]">LOST & FOUND</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1.5 sm:flex" aria-label="주요 메뉴">
          <Link href="/" className={`focus-ring rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${location === '/' ? 'bg-[#edf5fb] text-[#125d96]' : 'text-[#6b7d8c] hover:bg-[#f3f7fa] hover:text-[#173653]'}`} data-testid="link-nav-items">분실물 둘러보기</Link>
          <button type="button" className="focus-ring flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-semibold text-[#6b7d8c] transition-colors hover:bg-[#f3f7fa] hover:text-[#173653]" onClick={() => document.getElementById('how-to-claim')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-nav-guide">이용 안내 <ChevronRight size={15} /></button>
          <Link href="/admin" className={`focus-ring flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${location === '/admin' ? 'bg-[#101d3a] text-white' : 'text-[#6b7d8c] hover:bg-[#f3f7fa] hover:text-[#173653]'}`} data-testid="link-nav-admin"><Plus size={15} /> 학생회 관리</Link>
        </nav>
        <div className="hidden items-center gap-2 text-xs font-medium text-[#8295a5] sm:flex"><span className="h-2 w-2 rounded-full bg-[#48a983]" /><span>학교 안에서 찾고 있어요</span></div>
        <Link href="/" className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl text-[#527084] transition-colors hover:bg-[#edf5fb] hover:text-[#125d96] sm:hidden" data-testid="link-mobile-home"><PackageOpen size={20} /></Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-[hsl(var(--border)/.7)] bg-[#f5f9fc]">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-7 px-5 py-9 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-3"><BrandMark /><div><p className="text-sm font-bold text-[#173653]">제주외국어고등학교</p><p className="mt-1 text-xs text-[#8295a5]">분실물 센터 · 학생지원실</p></div></div>
        <p className="text-xs leading-5 text-[#8295a5] sm:text-right">물건을 찾았다면, 주인을 기다리고 있는 분실물도<br className="sm:hidden" /> 함께 확인해 주세요.</p>
      </div>
    </footer>
  );
}

function EmptyState({ query, onReset }: { query: string; onReset: () => void }) {
  return (
    <div className="flex min-h-[330px] flex-col items-center justify-center rounded-3xl border border-dashed border-[#c6d8e4] bg-white px-5 py-12 text-center shadow-[0_4px_22px_-18px_hsl(216_38%_18%/.3)]" data-testid="empty-search-results">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf5fb] text-[#3c81b1]"><Search size={27} strokeWidth={1.7} /></span>
      <h3 className="text-lg font-bold tracking-[-.03em] text-[#24415c]">{query ? '찾는 물건이 아직 보이지 않아요' : '등록된 분실물이 없어요'}</h3>
      <p className="mt-2 max-w-[300px] text-sm leading-6 text-[#8193a2]">{query ? '물건 이름이나 장소를 조금 다르게 검색해 보세요.' : '새로운 분실물이 등록되면 이곳에서 확인할 수 있어요.'}</p>
      {query && <button type="button" className="focus-ring mt-6 rounded-xl border border-[#bfd4e2] px-4 py-2.5 text-sm font-semibold text-[#24648f] transition-colors hover:bg-[#edf5fb]" onClick={onReset} data-testid="button-reset-search">검색 초기화</button>}
    </div>
  );
}

function ItemCard({ item }: { item: LostItem }) {
  return (
    <Link href={`/items/${item.id}`} className={`item-card focus-ring group flex min-h-[334px] flex-col overflow-hidden rounded-[22px] border border-[#dbe7ee] bg-white shadow-[0_5px_20px_-18px_hsl(216_38%_18%/.5)] ${item.status === '수령 완료' ? 'opacity-[.76]' : ''}`} data-testid={`card-item-${item.id}`}>
      <div className="image-shine relative aspect-[1.42] shrink-0 bg-[#edf4f8]">
        <img src={item.image} alt={`${item.name} 사진`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]" data-testid={`img-item-${item.id}`} />
        <div className="absolute left-3.5 top-3.5"><StatusBadge status={item.status} /></div>
        <div className="absolute bottom-3.5 right-3.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/88 text-[#527084] opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100"><ArrowUpRight size={16} /></div>
      </div>
      <div className="flex flex-1 flex-col px-4.5 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-2"><div><p className="mb-1 text-[11px] font-bold tracking-[.04em] text-[#7390a5]">{item.category}</p><h3 className="text-[16px] font-bold tracking-[-.035em] text-[#24415c]">{item.name}</h3></div><ChevronRight size={18} className="mt-1 shrink-0 text-[#aec1ce] transition-transform group-hover:translate-x-0.5 group-hover:text-[#2d79aa]" /></div>
        <div className="mt-auto flex items-center gap-3 pt-5 text-xs font-medium text-[#8295a5]"><span className="flex items-center gap-1.5"><CalendarDays size={14} /> {item.foundDate}</span><span className="h-1 w-1 rounded-full bg-[#b5c6d2]" /><span className="flex min-w-0 items-center gap-1.5 truncate"><MapPin size={14} /> {item.foundLocation}</span></div>
      </div>
    </Link>
  );
}

function Home() {
  const [items] = useState<LostItem[]>(loadItems);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'전체' | ItemCategory>('전체');
  const [showOnlyStored, setShowOnlyStored] = useState(false);
  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = activeCategory === '전체' || item.category === activeCategory;
      const matchesStatus = !showOnlyStored || item.status === '보관 중';
      const matchesQuery = !normalized || [item.name, item.category, item.foundLocation, item.description].some((value) => value.toLowerCase().includes(normalized));
      return matchesCategory && matchesStatus && matchesQuery;
    });
  }, [activeCategory, items, query, showOnlyStored]);
  const clearFilters = () => { setQuery(''); setActiveCategory('전체'); setShowOnlyStored(false); };
  const hasFilter = Boolean(query.trim()) || activeCategory !== '전체' || showOnlyStored;
  return (
    <div className="min-h-[100dvh] overflow-hidden">
      <Header />
      <main className="page-enter">
        <section className="relative isolate overflow-hidden border-b border-[#e2edf3] bg-[#f3f8fc]">
          <div className="soft-grid pointer-events-none absolute inset-x-0 top-0 h-full opacity-70" />
          <div className="relative mx-auto grid max-w-[1180px] items-center gap-9 px-5 pb-11 pt-14 sm:px-8 sm:pb-16 sm:pt-20 lg:grid-cols-[1fr_340px] lg:gap-20">
            <div>
               <p className="mb-4 text-[11px] font-extrabold tracking-[.2em] text-[#60718b]">JEJU FOREIGN LANGUAGE HIGH SCHOOL</p>
               <h1 className="max-w-[650px] text-[clamp(2.7rem,7vw,5.2rem)] font-extrabold leading-[1.05] tracking-[-.09em] text-[#101d3a]">분실물 센터</h1>
               <p className="mt-5 max-w-[495px] text-[16px] font-medium leading-7 text-[#66738a] sm:text-[18px]">잃어버린 물건을 찾아보세요.</p>
              <div className="mt-8 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#688397]"><span className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-[#2f82ac]" /> 안전하게 보관 중</span><span className="h-1 w-1 rounded-full bg-[#b3c9d8]" /><span>마지막 업데이트 5월 21일</span></div>
            </div>
            <div className="relative hidden h-[250px] lg:block"><div className="absolute right-2 top-1 flex h-[220px] w-[280px] rotate-[4deg] items-center justify-center rounded-[32px] border border-white bg-white/68 shadow-[0_25px_55px_-28px_hsl(212_81%_43%/.42)] backdrop-blur-sm"><div className="absolute left-8 top-8 h-11 w-11 rounded-2xl bg-[#edf5fb] text-center text-[#2876a6]"><PackageOpen className="mx-auto mt-2.5" size={22} strokeWidth={1.7} /></div><div className="mt-7 text-center"><p className="text-[47px] font-extrabold tracking-[-.08em] text-[#1a628e]">{items.filter((item) => item.status === '보관 중').length}</p><p className="mt-1 text-sm font-bold text-[#527084]">현재 보관 중인 물건</p></div><div className="absolute bottom-7 right-8 flex items-center gap-1.5 text-[11px] font-bold text-[#55a985]"><CheckCircle2 size={14} /> 확인 가능</div></div><div className="absolute bottom-2 left-1 h-24 w-24 rounded-full bg-[#f6cc64]/45 blur-[1px]" /></div>
          </div>
        </section>

         <section className="mx-auto max-w-[1180px] px-5 pb-7 pt-10 sm:px-8 sm:pt-14" aria-label="분실물 검색">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-extrabold tracking-[.14em] text-[#2a7aa8]">FOUND ITEMS</p><div className="mt-2 flex items-baseline gap-2.5"><h2 className="text-[25px] font-extrabold tracking-[-.06em] text-[#203f5a]">분실물 둘러보기</h2><span className="text-sm font-semibold text-[#8ba0af]" data-testid="text-item-count">{filteredItems.length}개</span></div></div><button type="button" onClick={() => setShowOnlyStored((current) => !current)} className={`focus-ring flex h-10 items-center gap-2 self-start rounded-xl border px-3.5 text-xs font-bold transition-colors sm:self-auto ${showOnlyStored ? 'border-[#9ac5dd] bg-[#edf7fc] text-[#1d709f]' : 'border-[#d8e5ec] bg-white text-[#708797] hover:border-[#b7cfde] hover:text-[#2e6d93]'}`} data-testid="button-filter-stored"><SlidersHorizontal size={15} /> 보관 중만 보기 {showOnlyStored && <span className="h-1.5 w-1.5 rounded-full bg-[#2d8db9]" />}</button></div>
           <div className="relative mt-7"><Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#7b8ba4]" size={21} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="물건 이름, 장소, 종류로 검색해 보세요" className="focus-ring h-[64px] w-full rounded-full border border-[#d7dfeb] bg-white pl-14 pr-12 text-[15px] font-medium text-[#182746] shadow-[0_12px_28px_-22px_hsl(222_55%_20%/.9)] transition-shadow placeholder:text-[#9aa6b7] focus:border-[#809dcc] focus:shadow-[0_16px_30px_-20px_hsl(222_55%_20%/.45)]" data-testid="input-search-items" />{query && <button type="button" onClick={() => setQuery('')} className="focus-ring absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#8290a4] hover:bg-[#eef2f7] hover:text-[#182746]" aria-label="검색어 지우기" data-testid="button-clear-search"><X size={16} /></button>}</div>
           <div className="-mx-5 mt-6 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0"><div className="flex min-w-max gap-2.5" role="tablist" aria-label="분실물 종류 필터">{categories.map((category) => <button type="button" key={category} role="tab" aria-selected={activeCategory === category} onClick={() => setActiveCategory(category)} className={`focus-ring flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-all ${activeCategory === category ? 'border-[#101d3a] bg-[#101d3a] text-white shadow-[0_8px_16px_-10px_hsl(222_55%_20%/.9)]' : 'border-[#d7dfeb] bg-white text-[#687891] hover:border-[#9aabc4] hover:bg-[#f8fafc] hover:text-[#182746]'}`} data-testid={`button-category-${category}`}><span className={`text-base leading-none ${activeCategory === category ? 'text-[#b7cbea]' : 'text-[#8698b3]'}`}>{categoryIcon[category]}</span>{category}</button>)}</div></div>
        </section>

         <section className="mx-auto max-w-[1180px] px-5 pb-4 sm:px-8" aria-live="polite">{filteredItems.length ? <div className="stagger-enter grid grid-cols-2 gap-3.5 sm:gap-5 lg:grid-cols-3">{filteredItems.map((item) => <ItemCard key={item.id} item={item} />)}</div> : <EmptyState query={hasFilter ? `${query}${activeCategory !== '전체' ? activeCategory : ''}` : ''} onReset={clearFilters} />}</section>

        <section id="how-to-claim" className="mx-auto mt-16 max-w-[1180px] scroll-mt-6 px-5 sm:px-8"><div className="relative overflow-hidden rounded-[26px] bg-[#173f61] px-6 py-8 text-white sm:px-9 sm:py-9"><div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full border-[26px] border-[#3b779d]/35" /><div className="pointer-events-none absolute bottom-[-80px] right-28 h-44 w-44 rounded-full border-[18px] border-[#f6cc64]/20" /><div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[.13em] text-[#9ecfe7]"><ClipboardCheck size={15} /> HOW TO CLAIM</div><h2 className="text-[23px] font-extrabold tracking-[-.055em] sm:text-[27px]">내 물건을 찾았다면,<br className="sm:hidden" /> 이렇게 수령해 주세요.</h2><p className="mt-3 max-w-[560px] text-sm leading-6 text-[#c1d9e6]">물건의 특징을 확인한 뒤 학생지원실에 방문해 주세요. 주인을 확인하는 간단한 절차를 거쳐 안전하게 돌려드립니다.</p></div><div className="flex flex-col gap-3 text-sm font-semibold text-[#deedf4] sm:flex-row lg:flex-col"><div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2c678e] text-xs text-[#f6d36f]">1</span> 물건 특징 확인하기</div><div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2c678e] text-xs text-[#f6d36f]">2</span> 학생지원실 방문하기</div><div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2c678e] text-xs text-[#f6d36f]">3</span> 본인 확인 후 수령하기</div></div></div></div></section>
        <div className="mx-auto mt-5 flex max-w-[1180px] items-center gap-2 px-5 text-xs leading-5 text-[#899eac] sm:px-8"><Info size={14} className="shrink-0 text-[#6e9bb4]" /> 분실물을 발견했다면 행정실 또는 가까운 선생님께 전달해 주세요.</div>
      </main>
      <Footer />
    </div>
  );
}

function ItemDetail() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const id = location.split('/items/')[1]?.split('/')[0] ?? '';
  const item = loadItems().find((entry) => entry.id === id);
  if (!item) {
    return <div className="min-h-[100dvh]"><Header /><main className="mx-auto flex max-w-[620px] flex-col items-center px-5 py-28 text-center page-enter"><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf5fb] text-[#3c81b1]"><HelpCircle size={29} strokeWidth={1.6} /></span><h1 className="mt-6 text-2xl font-extrabold tracking-[-.05em] text-[#24415c]">분실물을 찾을 수 없어요</h1><p className="mt-2 text-sm leading-6 text-[#8295a5]">주소가 정확한지 확인하거나 목록에서 다시 찾아보세요.</p><button type="button" onClick={() => setLocation('/')} className="focus-ring mt-7 flex h-11 items-center gap-2 rounded-xl bg-[#1d73a9] px-5 text-sm font-bold text-white shadow-[0_8px_18px_-11px_hsl(212_81%_43%/.9)] transition-transform hover:-translate-y-0.5" data-testid="button-detail-not-found-back"><ArrowLeft size={16} /> 목록으로 돌아가기</button></main><Footer /></div>;
  }
  const received = item.status === '수령 완료';
  return (
    <div className="min-h-[100dvh]"><Header /><main className="page-enter"><div className="mx-auto max-w-[1180px] px-5 pb-16 pt-7 sm:px-8 sm:pt-10"><button type="button" onClick={() => setLocation('/')} className="focus-ring group mb-7 flex items-center gap-2 rounded-lg py-1 text-sm font-bold text-[#698598] transition-colors hover:text-[#1d73a9]" data-testid="button-detail-back"><ArrowLeft size={17} className="transition-transform group-hover:-translate-x-1" /> 목록으로 돌아가기</button><div className="grid gap-8 lg:grid-cols-[minmax(0,1.03fr)_minmax(370px,.97fr)] lg:items-start lg:gap-14">
      <div className="image-shine relative overflow-hidden rounded-[26px] border border-[#dbe7ee] bg-[#edf4f8] shadow-[0_18px_45px_-28px_hsl(216_38%_18%/.48)]"><img src={item.image} alt={`${item.name} 큰 사진`} className="aspect-[1.18] h-full w-full object-cover" data-testid={`img-detail-${item.id}`} /><div className="absolute left-5 top-5"><StatusBadge status={item.status} /></div><div className="absolute bottom-5 left-5 rounded-lg bg-white/85 px-3 py-1.5 text-[11px] font-bold text-[#617c8e] backdrop-blur-sm">등록된 사진</div></div>
      <div className="flex flex-col"><div className="flex items-center justify-between gap-3"><span className="rounded-lg bg-[#edf5fb] px-2.5 py-1.5 text-xs font-extrabold text-[#2b779f]">{item.category}</span><span className="text-xs font-semibold text-[#9aabb7]">분실물 상세</span></div><h1 className="mt-5 text-[clamp(2rem,5vw,3.1rem)] font-extrabold leading-[1.22] tracking-[-.075em] text-[#173653]" data-testid={`text-detail-name-${item.id}`}>{item.name}</h1><p className="mt-4 text-[15px] leading-7 text-[#667f92]" data-testid={`text-detail-description-${item.id}`}>{item.description}</p><div className="mt-7 grid grid-cols-2 gap-2.5 sm:gap-3"><div className="rounded-2xl border border-[#dbe7ee] bg-white px-4 py-3.5"><p className="flex items-center gap-1.5 text-[11px] font-bold text-[#8da0ae]"><CalendarDays size={14} /> 발견한 날짜</p><p className="mt-2 text-sm font-bold text-[#24415c]" data-testid={`text-detail-date-${item.id}`}>{item.foundDate}</p></div><div className="rounded-2xl border border-[#dbe7ee] bg-white px-4 py-3.5"><p className="flex items-center gap-1.5 text-[11px] font-bold text-[#8da0ae]"><MapPin size={14} /> 발견한 장소</p><p className="mt-2 truncate text-sm font-bold text-[#24415c]" data-testid={`text-detail-location-${item.id}`}>{item.foundLocation}</p></div></div><div className={`mt-3 flex items-center gap-3 rounded-2xl border px-4 py-3.5 ${received ? 'border-[#dce2e8] bg-[#f6f8fa]' : 'border-[#c7e5d8] bg-[#f0faf5]'}`}><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${received ? 'bg-[#e8edf1] text-[#82909a]' : 'bg-[#d9f1e5] text-[#318161]'}`}>{received ? <Check size={18} /> : <Clock3 size={18} />}</span><div><p className="text-[11px] font-bold text-[#8da0ae]">현재 상태</p><p className={`mt-0.5 text-sm font-extrabold ${received ? 'text-[#65747f]' : 'text-[#28765b]'}`} data-testid={`status-detail-${item.id}`}>{item.status}</p></div></div><div className="mt-8 rounded-[22px] border border-[#d4e3ec] bg-[#f8fbfd] p-5 sm:p-6"><div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e4f1f8] text-[#2d7ca8]"><ClipboardCheck size={18} /></span><h2 className="text-base font-extrabold tracking-[-.03em] text-[#24415c]">수령 방법</h2></div><ol className="mt-5 space-y-3.5">{item.claimInstructions.map((instruction, index) => <li key={instruction} className="flex gap-3 text-sm leading-6 text-[#647e90]" data-testid={`text-claim-instruction-${item.id}-${index}`}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#dceef7] text-[11px] font-extrabold text-[#2d7ca8]">{index + 1}</span><span>{instruction}</span></li>)}</ol>{!received && <div className="mt-5 flex items-start gap-2 border-t border-[#e0ebf1] pt-4 text-xs leading-5 text-[#7891a1]"><Info size={14} className="mt-0.5 shrink-0 text-[#5b97b7]" /> 방문 전 담당 선생님 또는 행정실 운영 시간을 확인해 주세요.</div>}</div><button type="button" onClick={() => setLocation('/')} className="focus-ring mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#bfd8e7] bg-white text-sm font-extrabold text-[#246c96] transition-colors hover:bg-[#edf6fb]" data-testid="button-detail-list">다른 분실물도 살펴보기 <ArrowUpRight size={16} /></button></div>
    </div></div></main><Footer /></div>
  );
}

function Admin() {
  const [items, setItems] = useState<LostItem[]>(loadItems);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('교복');
  const [foundDate, setFoundDate] = useState('');
  const [foundLocation, setFoundLocation] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<LostItem['status']>('보관 중');
  const [image, setImage] = useState('');
  const [notice, setNotice] = useState('');

  const handleImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => setImage(typeof reader.result === 'string' ? reader.result : ''));
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formattedDate = foundDate ? foundDate.replaceAll('-', '. ') + '.' : '날짜 미정';
    const newItem: LostItem = {
      id: `admin-${Date.now()}`,
      name: name.trim(),
      category,
      foundDate: formattedDate,
      foundLocation: foundLocation.trim(),
      image: image || items[0]?.image || '',
      status,
      description: description.trim(),
      claimInstructions: status === '수령 완료'
        ? ['현재 수령 완료된 물품입니다.']
        : ['학생증 또는 본인 확인이 가능한 정보를 준비해 주세요.', '행정실에서 보관 중인 물품을 확인해 주세요.', '본인 물품이 맞다면 담당 선생님 확인 후 수령할 수 있습니다.'],
    };
    const nextItems = [newItem, ...items];
    setItems(nextItems);
    saveItems(nextItems);
    setName('');
    setCategory('교복');
    setFoundDate('');
    setFoundLocation('');
    setDescription('');
    setStatus('보관 중');
    setImage('');
    setNotice('분실물이 목록에 등록되었습니다.');
  };

  const markReceived = (id: string) => {
    const nextItems = items.map((item) =>
      item.id === id ? { ...item, status: '수령 완료' as const, claimInstructions: ['현재 수령 완료된 물품입니다.'] } : item,
    );
    setItems(nextItems);
    saveItems(nextItems);
    setNotice('물품 상태를 수령 완료로 변경했습니다.');
  };

  return (
    <div className="min-h-[100dvh]">
      <Header />
      <main className="page-enter">
        <div className="mx-auto max-w-[1180px] px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
          <div className="flex flex-col justify-between gap-6 border-b border-[#dfe5ee] pb-9 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-extrabold tracking-[.2em] text-[#687891]">STUDENT COUNCIL ADMIN</p>
              <h1 className="mt-3 text-[clamp(2rem,5vw,3.5rem)] font-extrabold tracking-[-.08em] text-[#101d3a]">분실물 관리</h1>
              <p className="mt-3 text-sm leading-6 text-[#66738a]">새로운 분실물을 등록하고, 수령 상태를 관리해 주세요.</p>
            </div>
            <Link href="/" className="focus-ring flex h-11 items-center justify-center gap-2 rounded-full border border-[#d7dfeb] bg-white px-4 text-sm font-bold text-[#60718b] transition-colors hover:border-[#a9b8cd] hover:text-[#101d3a]" data-testid="link-admin-home">
              <ArrowLeft size={16} /> 목록으로 돌아가기
            </Link>
          </div>

          {notice && <div className="mt-6 flex items-center gap-2 rounded-2xl border border-[#cce6d8] bg-[#f0faf5] px-4 py-3 text-sm font-bold text-[#28765b]" role="status"><CheckCircle2 size={17} /> {notice}</div>}

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,.8fr)] lg:items-start">
            <form onSubmit={handleSubmit} className="rounded-[26px] border border-[#dbe2ec] bg-white p-5 shadow-[0_16px_35px_-26px_hsl(222_55%_20%/.5)] sm:p-7" data-testid="form-admin-item">
              <div className="flex items-center gap-3 border-b border-[#e6ebf2] pb-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#101d3a] text-white"><Plus size={19} /></span>
                <div><h2 className="text-lg font-extrabold tracking-[-.04em] text-[#182746]">새 분실물 등록</h2><p className="mt-1 text-xs text-[#8996aa]">학생들이 확인할 정보를 입력해 주세요.</p></div>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="sm:col-span-2"><span className="form-label">물품명</span><input required value={name} onChange={(event) => setName(event.target.value)} className="admin-input" placeholder="예: 네이비 교복 재킷" data-testid="input-admin-name" /></label>
                <label><span className="form-label">카테고리</span><select value={category} onChange={(event) => setCategory(event.target.value as ItemCategory)} className="admin-input" data-testid="select-admin-category">{categories.slice(1).map((option) => <option key={option}>{option}</option>)}</select></label>
                <label><span className="form-label">발견 날짜</span><input required type="date" value={foundDate} onChange={(event) => setFoundDate(event.target.value)} className="admin-input" data-testid="input-admin-date" /></label>
                <label className="sm:col-span-2"><span className="form-label">발견 장소</span><input required value={foundLocation} onChange={(event) => setFoundLocation(event.target.value)} className="admin-input" placeholder="예: 본관 2층 복도" data-testid="input-admin-location" /></label>
                <label className="sm:col-span-2"><span className="form-label">상세 설명</span><textarea required value={description} onChange={(event) => setDescription(event.target.value)} className="admin-input min-h-28 resize-y" placeholder="색상, 특징, 함께 발견된 물건 등을 적어 주세요." data-testid="textarea-admin-description" /></label>
                <label><span className="form-label">현재 상태</span><select value={status} onChange={(event) => setStatus(event.target.value as LostItem['status'])} className="admin-input" data-testid="select-admin-status"><option>보관 중</option><option>수령 완료</option></select></label>
                <label><span className="form-label">물품 이미지</span><span className="relative flex h-[46px] cursor-pointer items-center gap-2 overflow-hidden rounded-xl border border-dashed border-[#b9c7d9] bg-[#f8fafc] px-3 text-sm font-semibold text-[#60718b] transition-colors hover:border-[#809dcc] hover:bg-[#f1f5fa]"><ImagePlus size={17} />{image ? '이미지 선택됨' : '사진 선택'}<input type="file" accept="image/*" onChange={handleImage} className="absolute inset-0 cursor-pointer opacity-0" data-testid="input-admin-image" /></span></label>
              </div>
              {image && <img src={image} alt="선택한 물품 미리보기" className="mt-5 h-32 w-40 rounded-2xl border border-[#dbe2ec] object-cover" />}
              <button type="submit" className="focus-ring mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#101d3a] text-sm font-extrabold text-white shadow-[0_12px_20px_-12px_hsl(222_55%_20%/.8)] transition-transform hover:-translate-y-0.5" data-testid="button-admin-submit"><Save size={17} /> 분실물 등록하기</button>
            </form>

            <section className="rounded-[26px] border border-[#dbe2ec] bg-[#f8fafc] p-5 sm:p-7" aria-labelledby="admin-status-title">
              <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-extrabold tracking-[.16em] text-[#71809a]">ITEM STATUS</p><h2 id="admin-status-title" className="mt-2 text-lg font-extrabold tracking-[-.04em] text-[#182746]">등록된 물품 관리</h2></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#71809a]">{items.length}개</span></div>
              <div className="mt-5 space-y-3">
                {items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-[#e0e6ef] bg-white p-3.5 shadow-[0_6px_18px_-18px_hsl(222_55%_20%/.7)]">
                  <img src={item.image} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-[#edf2f7] object-cover" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-[#182746]">{item.name}</p><p className="mt-1 truncate text-xs text-[#8a97aa]">{item.category} · {item.foundLocation}</p></div>
                  {item.status === '보관 중' ? <button type="button" onClick={() => markReceived(item.id)} className="focus-ring shrink-0 rounded-full border border-[#d3dde9] px-3 py-2 text-[11px] font-extrabold text-[#52627b] transition-colors hover:border-[#101d3a] hover:bg-[#101d3a] hover:text-white" data-testid={`button-mark-received-${item.id}`}>수령 완료</button> : <StatusBadge status={item.status} />}
                </div>)}
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/items/:id" component={ItemDetail} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;