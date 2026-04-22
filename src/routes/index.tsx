import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMenu, formatPrice } from "@/lib/menu-store";
import { Leaf, Flame, Sparkles, ChefHat, Search, X, Wheat, Utensils } from "lucide-react";

export const Route = createFileRoute("/")(({
  head: () => ({
    meta: [
      { title: "SANDWICH HOUSE — Fresh, hand-crafted sandwiches" },
      {
        name: "description",
        content:
          "Browse the Sandwich House menu: classics, signature, sides and drinks. Made fresh, served fast.",
      },
    ],
  }),
  component: MenuPage,
}));

function MenuPage() {
  const { data, isLoading } = useMenu();
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Refs for tracking sections and the nav container
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const navScrollRef = useRef<HTMLUListElement>(null);
  const navItemRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const [pillStyle, setPillStyle] = useState({ width: 0, left: 0, opacity: 0 });
  const isNavigating = useRef(false);
  const scrollTimeout = useRef<any>(null);

  const topCategories = useMemo(
    () => data.categories.filter((c) => !c.parentId),
    [data.categories],
  );

  const subCategoriesByParent = useMemo(() => {
    const map: Record<string, typeof data.categories> = {};
    for (const c of data.categories) {
      if (c.parentId) {
        if (!map[c.parentId]) map[c.parentId] = [];
        map[c.parentId].push(c);
      }
    }
    return map;
  }, [data.categories]);

  // Set initial active category
  useEffect(() => {
    if (!activeCat && topCategories[0]) setActiveCat(topCategories[0].id);
  }, [topCategories, activeCat, searchQuery]);

  // Filtered items based on availability and search
  const filteredItems = useMemo(() => {
    return data.items.filter(item => {
      const isAvailable = item.available !== false;
      if (!isAvailable) return false;
      
      if (!searchQuery) return true;
      
      const searchLower = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        (item.tags || []).some(tag => tag.toLowerCase().includes(searchLower))
      );
    });
  }, [data.items, searchQuery]);

  const itemsByCat = useMemo(() => {
    const map: Record<string, MenuItem[]> = {};
    for (const c of data.categories) map[c.id] = [];
    
    // Find the real Fasting category if admin created it
    const fastingCat = data.categories.find(c => c.id === "cat-fasting" || c.name.toLowerCase().includes("fasting"));
    
    for (const it of filteredItems) {
      if (map[it.categoryId] !== undefined) map[it.categoryId].push(it);
      
      // Automatically add Fasting tagged items to the Fasting category (if it exists)
      if (fastingCat && map[fastingCat.id] !== undefined && it.categoryId !== fastingCat.id && (it.tags || []).includes("Fasting")) {
        // Prevent duplicate if item is literally inside the fasting category
        if (!map[fastingCat.id].some(existing => existing.id === it.id)) {
          map[fastingCat.id].push(it);
        }
      }
    }
    return map;
  }, [data.categories, filteredItems]);

  const visibleTopCategories = useMemo(() => {
    return topCategories.filter(cat => {
      const hasDirect = (itemsByCat[cat.id] || []).length > 0;
      const subCats = subCategoriesByParent[cat.id] || [];
      const hasSub = subCats.some(sc => (itemsByCat[sc.id] || []).length > 0);
      return hasDirect || hasSub;
    });
  }, [topCategories, itemsByCat, subCategoriesByParent]);

  // Handle active category updates from scrolling - Ultra Stable Version
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isNavigating.current) return;
        
        // Find all visible sections
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length === 0) return;

        // Pick the one closest to the top of the viewport (with a 200px offset)
        const active = visibleEntries.reduce((prev, curr) => {
          return Math.abs(curr.boundingClientRect.top - 200) < Math.abs(prev.boundingClientRect.top - 200) ? curr : prev;
        });

        if (active && active.target.id !== activeCat) {
          setActiveCat(active.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: [0, 0.2, 1] },
    );
    
    // Absolute top fallback
    const handleScroll = () => {
      if (window.scrollY < 50 && !isNavigating.current && visibleTopCategories[0]) {
        setActiveCat(visibleTopCategories[0].id);
      }
    };

    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [visibleTopCategories, activeCat]);

  // Butter-Smooth Horizontal Pill Motion (Hardware Accelerated)
  useLayoutEffect(() => {
    if (!activeCat) return;

    const navContainer = navScrollRef.current;
    const activeItem = navItemRefs.current[activeCat];

    if (activeItem && navContainer) {
      const updatePill = () => {
        setPillStyle({
          width: activeItem.offsetWidth,
          left: activeItem.offsetLeft,
          opacity: 1
        });
      };

      updatePill();
      
      // Auto-scroll the nav container
      const scrollLeft = activeItem.offsetLeft - navContainer.offsetWidth / 2 + activeItem.offsetWidth / 2;
      navContainer.scrollTo({
        left: scrollLeft,
        behavior: "smooth",
      });

      window.addEventListener('resize', updatePill);
      return () => window.removeEventListener('resize', updatePill);
    }
  }, [activeCat]);

  const scrollTo = (id: string, offset = 120) => {
    const el = document.getElementById(id);
    if (el) {
      isNavigating.current = true;
      setActiveCat(id);
      
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });

      // Release the observer after the scroll finishes
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        isNavigating.current = false;
      }, 1000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
           <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
           <p className="font-serif text-lg font-medium text-muted-foreground animate-pulse">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground font-sans overflow-clip">
      
      {/* ── Background Gradients ── */}
      {/* These will create subtle, blurred dark green blobs over the white background */}
      <div className="pointer-events-none fixed top-0 left-0 -z-10 h-full w-full">
        <div className="absolute top-[-10%] left-[-10%] h-[40vh] w-[40vw] rounded-full bg-primary/5 blur-[120px]"></div>

        <div className="absolute top-[30%] right-[-10%] h-[50vh] w-[40vw] rounded-full bg-accent/5 blur-[150px]"></div>
        <div className="absolute bottom-[-10%] left-[20%] h-[40vh] w-[40vw] rounded-full bg-primary/5 blur-[120px]"></div>
      </div>

      {/* ── Elegant Dark Green Hero Section ── */}
      <header className="relative flex flex-col items-center justify-center overflow-hidden py-24 px-6 sm:py-32 animate-in fade-in slide-in-from-top-4 duration-1000">
        
        {/* Fixed Hero Gradient Background - defined directly using Tailwind classes to ensure it renders */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#102a1b] via-[#0d2a1b] to-[#153424]"></div>
        
        {/* Inner glow effect */}
        <div className="absolute inset-0 z-0 bg-black/20"></div>

        {/* Fusion gradient: blends the bottom of the dark hero smoothly into the white background */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10"></div>

        <div className="relative z-20 flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Logo container: made border thicker */}
          <div className="mb-10 overflow-hidden rounded-[2rem] border-4 border-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-500 hover:scale-105">
            <img
              src="/logo.png"
              alt="SANDWICH HOUSE logo"
              className="h-32 w-32 object-cover sm:h-40 sm:w-40"
            />
          </div>
          <h1 className="font-serif text-4xl font-bold tracking-wider text-[#eaf2ed] sm:text-6xl md:text-7xl mb-5 drop-shadow-xl">
            SANDWICH HOUSE
          </h1>
          <div className="flex items-center gap-4 text-xs sm:text-sm font-semibold tracking-[0.25em] text-white/80 uppercase drop-shadow-md">
            <span>Fresh</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#3db16e] shadow-[0_0_12px_#3db16e]"></span>
            <span>Hand-Crafted</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#3db16e] shadow-[0_0_12px_#3db16e]"></span>
            <span>Daily</span>
          </div>
        </div>
      </header>

      {/* ── Sticky Search & Navigation Wrapper ── */}
      <div className="sticky top-0 z-[100] w-full">
        {/* Search Bar */}
        <div className="w-full border-b border-border/20 bg-background/80 backdrop-blur-xl transition-all">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search for sandwiches, drinks, sides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-border/50 bg-secondary/30 pl-11 pr-11 py-3 text-sm font-medium focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/60"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-secondary text-muted-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Categories Nav */}
        {!searchQuery && (
          <nav className="w-full border-b border-border/40 bg-background/60 backdrop-blur-xl shadow-sm transition-all border-t border-border/10">
            <div className="mx-auto max-w-4xl relative">
              <ul 
                ref={navScrollRef}
                className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar sm:justify-center relative scroll-smooth"
              >
                {/* Hardware Accelerated Sliding Pill Background */}
                <div 
                  className="absolute left-0 top-3 bottom-0 h-10 rounded-full bg-primary shadow-md shadow-primary/30 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                  style={{
                    width: `${pillStyle.width}px`,
                    transform: `translate3d(${pillStyle.left}px, 0, 0)`,
                    opacity: pillStyle.opacity,
                    zIndex: 0,
                  }}
                />
                
                {visibleTopCategories.map((c) => {
                  const isActive = activeCat === c.id;
                  return (
                    <li 
                      key={c.id} 
                      ref={(el) => { navItemRefs.current[c.id] = el; }}
                      className="relative z-10"
                    >
                      <button
                        onClick={() => scrollTo(c.id)}
                        className={`relative z-20 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                          isActive
                            ? "text-primary-foreground scale-[1.02]"
                            : "text-foreground/80 hover:text-foreground"
                        }`}
                      >
                        {c.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        )}
      </div>

      {/* ── Premium Content Grid ── */}
      <main className="mx-auto max-w-4xl px-4 pb-32 pt-8 sm:px-6 lg:px-8">
        {visibleTopCategories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground animate-in fade-in zoom-in-95 duration-700">
            <ChefHat className="mb-6 h-16 w-16 opacity-20" />
            <p className="font-serif text-2xl font-medium">
              {searchQuery ? "No items match your search." : "The menu is currently being perfected."}
            </p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="mt-6 rounded-full border border-border bg-card px-6 py-2 text-sm font-bold text-foreground hover:bg-secondary transition-all"
              >
                Clear Search
              </button>
            )}
          </div>
        )}

        {visibleTopCategories.map((cat, idx) => {
          const directItems = itemsByCat[cat.id] || [];
          const subCats = subCategoriesByParent[cat.id] || [];

          const hasContent =
            directItems.length > 0 ||
            subCats.some((sc) => (itemsByCat[sc.id] || []).length > 0);

          return (
            <section
              key={cat.id}
              id={cat.id}
              ref={(el) => {
                sectionRefs.current[cat.id] = el;
              }}
              className="scroll-mt-36 pt-12 pb-12 animate-in fade-in slide-in-from-bottom-8 duration-700"
              style={{ animationDelay: `${idx * 150}ms`, animationFillMode: "both" }}
            >
              <div className="mb-8 text-center sm:text-left">
                <h2 className="font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  {cat.name}
                </h2>
                <div className="mt-4 h-1.5 w-20 bg-accent rounded-full mx-auto sm:mx-0 shadow-sm"></div>
              </div>

              {/* Subcategory In-Section Navigation Pills */}
              {subCats.length > 0 && (
                <div className="mb-10 flex flex-wrap gap-2 justify-center sm:justify-start">
                  {subCats.map((sub) => {
                    const subItems = itemsByCat[sub.id] || [];
                    if (subItems.length === 0) return null;
                    return (
                      <button
                        key={`nav-${sub.id}`}
                        onClick={() => scrollTo(sub.id, 140)}
                        className="rounded-full border border-border/80 bg-card/60 backdrop-blur-sm px-4 py-1.5 text-sm font-semibold text-foreground/80 hover:border-primary hover:text-primary transition-all shadow-sm hover:shadow active:scale-95"
                      >
                        {sub.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {!hasContent && (
                <p className="text-center italic text-muted-foreground">Coming soon...</p>
              )}

              {/* Direct items */}
              {directItems.length > 0 && (
                <div className="mb-12">
                  <ItemList items={directItems} />
                </div>
              )}

              {/* Sub-categories Render */}
              {subCats.map((sub) => {
                const subItems = itemsByCat[sub.id] || [];
                if (subItems.length === 0) return null;
                return (
                  <div key={sub.id} id={sub.id} className="mt-8 mb-16 scroll-mt-36">
                    <h3 className="mb-6 font-serif text-2xl font-bold text-foreground/90 flex items-center gap-3">
                      <Sparkles className="h-6 w-6 text-accent" />
                      {sub.name}
                    </h3>
                    <ItemList items={subItems} />
                  </div>
                );
              })}
            </section>
          );
        })}
      </main>

      <footer className="border-t border-border/50 bg-secondary/30 py-16 text-center text-sm font-medium text-muted-foreground relative overflow-hidden">
        <div className="absolute inset-0 top-0 h-full w-full bg-primary/5"></div>
        <div className="relative z-10">
          <p className="font-serif text-xl text-foreground mb-3 font-semibold tracking-wider">SANDWICH HOUSE</p>
          <p className="opacity-70">© {new Date().getFullYear()} All rights reserved. Crafted with care.</p>
        </div>
      </footer>
    </div>
  );
}

function ItemList({ items }: { items: MenuItem[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:gap-10">
      {items.map((item) => {
        const hasTag = (tag: string) => (item.tags || []).includes(tag);
        const isSpicy = hasTag("Spicy");
        const isVegan = hasTag("Vegan");
        const isGF = hasTag("Gluten-Free");
        const isFasting = hasTag("Fasting");

        return (
          <li
            key={item.id}
            className="group relative flex flex-col overflow-hidden rounded-[2.5rem] border border-primary/10 bg-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-primary/40 hover:shadow-[0_20px_40px_-15px_rgba(40,120,80,0.15)]"
          >
            {/* Image Container with Fixed Aspect Ratio to prevent cropping */}
            {item.image && (
              <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[16/9]">
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                {/* Refined gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                
                {/* Price Badge over Image on Mobile/Desktop */}
                <div className="absolute bottom-4 right-4 z-10">
                  <div className="flex items-center gap-1.5 rounded-2xl bg-white/90 px-3 py-1.5 backdrop-blur-md shadow-lg border border-white/20">
                     <span className="text-[10px] font-black text-primary opacity-60">ETB</span>
                     <span className="text-sm font-black text-foreground">{item.price.toLocaleString("en-ET")}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-1 flex-col p-6 sm:p-8">
              <div className="mb-4">
                <div className="flex items-start justify-between gap-4">
                  <h4 className="font-serif text-xl font-extrabold leading-tight text-foreground transition-colors group-hover:text-primary sm:text-2xl">
                    {item.name}
                  </h4>
                </div>
                
                {/* Dietary Badges */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {isSpicy && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-red-600">
                      <Flame className="h-3 w-3" /> Spicy
                    </span>
                  )}
                  {isVegan && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">
                      <Leaf className="h-3 w-3" /> Vegan
                    </span>
                  )}
                  {isGF && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-600">
                      <Wheat className="h-3 w-3" /> GF
                    </span>
                  )}
                  {isFasting && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-cyan-600">
                      <Utensils className="h-3 w-3" /> Fasting
                    </span>
                  )}
                </div>
              </div>

              {item.description && (
                <p className="mb-6 text-sm font-medium leading-relaxed text-muted-foreground/80 line-clamp-3">
                  {item.description}
                </p>
              )}

              {/* Extras Section */}
              {item.extras.length > 0 && (
                <div className="mt-auto border-t border-border/40 pt-5">
                  <div className="flex flex-wrap gap-1.5">
                    {item.extras.map((ex, i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-secondary/40 px-2.5 py-1 text-[10px] font-bold text-muted-foreground border border-transparent transition-all group-hover:border-border/50 group-hover:bg-white"
                      >
                        <span className="opacity-60">+ {ex.name}</span>
                        <span className="ml-1.5 text-primary">+{ex.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
