import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, DragEvent, useEffect, useRef } from "react";
import {
  type Category,
  type MenuItem,
  formatPrice,
  uid,
  useMenu,
} from "@/lib/menu-store";
import { Plus, ChevronUp, ChevronDown, Edit2, Trash2, ArrowLeft, Settings2, Image as ImageIcon, UploadCloud, QrCode, Download, Database, CloudDownload, CloudUpload, EyeOff, LayoutDashboard, Tag, Coffee, Settings, LogOut, Menu, X, ShieldCheck, Key, Lock, Check, Cloud, RefreshCw } from "lucide-react";
import { fetchPasscodeCloud, savePasscodeCloud, deleteItemCloud, deleteCategoryCloud, testConnectionCloud } from "@/lib/menu-store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — SANDWICH HOUSE" },
      { name: "description", content: "Manage the Sandwich House menu." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data, update, isLoading, cloudStatus, lastSynced, migrateToCloud, skipSync } = useMenu();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sandwich_house_admin_auth") === "true";
    }
    return false;
  });
  const [passcode, setPasscode] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [newPasscode, setNewPasscode] = useState("");
  const [currentPasscode, setCurrentPasscode] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Attempt to pull passcode from cloud on load
    fetchPasscodeCloud().then(pw => {
      if (pw) {
        setCurrentPasscode(pw);
        localStorage.setItem("sandwich_house_admin_passcode", pw);
      } else {
        const local = localStorage.getItem("sandwich_house_admin_passcode");
        if (local) setCurrentPasscode(local);
      }
    });
  }, []);

  const [stayLoggedIn, setStayLoggedIn] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sandwich_house_admin_stay_logged_in") === "true";
    }
    return false;
  });

  const isFirstTime = !currentPasscode && !isLoading;
  
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [activeTab, setActiveTab] = useState<"items" | "categories" | "settings">("items");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPasscode) {
      // First time setup - this shouldn't happen here but as a fallback
      alert("Please set a passcode in the setup screen first.");
      return;
    }
    if (passcode === currentPasscode) {
      setIsAuthenticated(true);
      localStorage.setItem("sandwich_house_admin_auth", "true");
      setLoginError(false);
    } else {
      setLoginError(true);
      setPasscode("");
    }
  };

  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasscode.trim()) return;
    setIsSyncing(true);
    try {
      await savePasscodeCloud(newPasscode);
      setCurrentPasscode(newPasscode);
      localStorage.setItem("sandwich_house_admin_passcode", newPasscode);
      setIsAuthenticated(true);
      localStorage.setItem("sandwich_house_admin_auth", "true");
      setNewPasscode("");
      alert("Passcode set successfully! Welcome to your Admin dashboard.");
    } catch (err: any) {
      alert("Initial setup failed: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdatePasscode = async () => {
    if (!newPasscode.trim()) return;
    
    // Optimistic local update
    const nextVal = newPasscode;
    setCurrentPasscode(nextVal);
    localStorage.setItem("sandwich_house_admin_passcode", nextVal);
    setNewPasscode("");
    
    // Background cloud update
    savePasscodeCloud(nextVal)
      .then(() => alert("Passcode updated in cloud!"))
      .catch(err => alert("Cloud passcode update failed: " + err.message));
  };

  const toggleStayLoggedIn = () => {
    const next = !stayLoggedIn;
    setStayLoggedIn(next);
    localStorage.setItem("sandwich_house_admin_stay_logged_in", String(next));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("sandwich_house_admin_auth");
  };

  // ── Categories ──
  const addCategory = () => setEditingCat({ id: uid("cat"), name: "", parentId: undefined });
  const saveCategory = async (cat: Category) => {
    const exists = data.categories.find((c) => c.id === cat.id);
    const categories = exists
      ? data.categories.map((c) => (c.id === cat.id ? cat : c))
      : [...data.categories, cat];
    
    // Non-blocking update
    update({ ...data, categories });
    setEditingCat(null);
  };
  const deleteCategory = (id: string) => {
    if (!confirm("Delete this category? Items in it will also be removed.")) return;
    const removedIds = new Set([id, ...data.categories.filter((c) => c.parentId === id).map((c) => c.id)]);
    
    // 1. Instant local update
    update({
      categories: data.categories.filter((c) => !removedIds.has(c.id)),
      items: data.items.filter((i) => !removedIds.has(i.categoryId)),
    });

    // 2. Background cloud cleanup
    (async () => {
       try {
         for (const rId of Array.from(removedIds)) {
           await deleteCategoryCloud(rId);
         }
       } catch (err) {
         console.warn("Background category deletion failed:", err);
       }
    })();
  };
  const moveCategory = (id: string, dir: -1 | 1) => {
    const idx = data.categories.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const next = [...data.categories];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    
    // Ensure we only swap with a category at the same level (parent or sub)
    const cat = next[idx];
    const sibs = next.filter(c => c.parentId === cat.parentId);
    const sibIdx = sibs.findIndex(c => c.id === id);
    if(sibIdx + dir < 0 || sibIdx + dir >= sibs.length) return;
    
    const targetSibIdx = next.findIndex(c => c.id === sibs[sibIdx + dir].id);
    [next[idx], next[targetSibIdx]] = [next[targetSibIdx], next[idx]];
    update({ ...data, categories: next });
  };

  // ── Items ──
  const addItem = () =>
    setEditingItem({
      id: uid("item"),
      name: "",
      description: "",
      price: 0,
      categoryId: data.categories[0]?.id ?? "",
      image: "",
      extras: [],
      available: true,
      tags: [],
    });
  const saveItem = async (item: MenuItem) => {
    const exists = data.items.find((i) => i.id === item.id);
    const items = exists
      ? data.items.map((i) => (i.id === item.id ? item : i))
      : [...data.items, item];
    
    // Non-blocking update
    update({ ...data, items });
    setEditingItem(null);
  };
  const deleteItem = (id: string) => {
    if (!confirm("Delete this item?")) return;
    // 1. Instant local update
    update({ ...data, items: data.items.filter((i) => i.id !== id) });
    // 2. Background cleanup
    deleteItemCloud(id).catch(err => console.warn("Background item deletion failed:", err));
  };

  // ── Item Drag and Drop Reordering ──
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const handleItemDragStart = (id: string, e: DragEvent<HTMLLIElement>) => {
    setDraggedItemId(id);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    }
  };

  const handleItemDragOver = (e: DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  };

  const handleItemDrop = (targetId: string, e: DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) return;
    
    const nextItems = [...data.items];
    const fromIdx = nextItems.findIndex(i => i.id === draggedItemId);
    const toIdx = nextItems.findIndex(i => i.id === targetId);
    
    if (fromIdx >= 0 && toIdx >= 0) {
      const [moved] = nextItems.splice(fromIdx, 1);
      nextItems.splice(toIdx, 0, moved);
      setData({ ...data, items: nextItems });
    }
    setDraggedItemId(null);
  };

  // ── Database Backup / Restore ──
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sandwich-house-db-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.categories && parsed.items) {
          setIsSyncing(true);
          try {
            await update(parsed);
            alert("Database Restored Successfully!");
          } finally {
            setIsSyncing(false);
          }
        } else {
          alert("Invalid backup file structure.");
        }
      } catch (err) {
        alert("Error parsing backup file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const syncToCloud = async () => {
    if (!confirm("This will push your current local data to the Cloud and overwrite anything already there. Continue?")) return;
    setIsSyncing(true);
    try {
      await migrateToCloud();
      alert("✅ Cloud Sync Complete! All devices are now synchronized.");
    } catch (err: any) {
      alert("❌ Sync Failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSyncing(false);
    }
  };

  const testCloudConnection = async () => {
    const res = await testConnectionCloud();
    alert(res.message);
  };

  const topCategories = data.categories.filter((c) => !c.parentId);
  const subCatsByParent: Record<string, Category[]> = {};
  for (const c of data.categories) {
    if (c.parentId) {
      if (!subCatsByParent[c.parentId]) subCatsByParent[c.parentId] = [];
      subCatsByParent[c.parentId].push(c);
    }
  }

  if (isLoading || isSyncing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 px-6 text-center">
           <div className="relative">
             <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-xl"></div>
             {isSyncing && <div className="absolute inset-0 flex items-center justify-center"><Cloud className="h-6 w-6 text-primary animate-pulse" /></div>}
           </div>
           <div>
             <p className="font-serif text-xl font-bold text-foreground">
               {isSyncing ? "Syncing to Cloud..." : "Connecting to Database..."}
             </p>
             <p className="mt-2 text-sm font-medium text-muted-foreground">
               This usually takes a few seconds.
             </p>
           </div>
           
           {!isSyncing && (
             <button
               onClick={skipSync}
               className="mt-4 rounded-xl border border-border/60 bg-secondary/30 px-6 py-2.5 text-xs font-bold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
             >
               Skip & Use Local Data
             </button>
           )}
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !stayLoggedIn) {
     if (isFirstTime) {
       return (
         <div className="flex min-h-screen items-center justify-center bg-background px-4 font-sans selection:bg-primary/20">
           <div className="w-full max-w-sm rounded-[2.5rem] border border-border/60 bg-card p-10 shadow-2xl animate-in fade-in zoom-in duration-700">
             <div className="mb-8 flex flex-col items-center">
               <div className="mb-5 rounded-[1.5rem] border-2 border-primary/20 bg-primary/5 p-4 text-primary">
                 <ShieldCheck className="h-10 w-10" />
               </div>
               <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Welcome</h1>
               <p className="mt-3 text-sm font-medium text-muted-foreground text-center">
                 Create your secret admin passcode to get started. Choose something secure.
               </p>
             </div>
             <form onSubmit={handleInitialSetup} className="space-y-5">
               <div className="space-y-4">
                 <input
                   type="password"
                   value={newPasscode}
                   onChange={(e) => setNewPasscode(e.target.value)}
                   placeholder="Create New Passcode..."
                   className="w-full rounded-2xl border border-border/80 bg-input/40 px-5 py-4 text-sm font-bold text-foreground transition-all focus:border-primary focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/10"
                   autoFocus
                   required
                 />
               </div>
               <button
                 type="submit"
                 className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-4 text-sm font-bold text-background shadow-xl transition-all hover:scale-[1.02] active:scale-95 duration-200"
               >
                 Activate Admin Portal
               </button>
             </form>
           </div>
         </div>
       );
     }

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 font-sans selection:bg-primary/20">
        <div className="w-full max-w-sm rounded-[2.5rem] border border-border/60 bg-card p-10 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-5 rounded-[1.5rem] border border-border/50 bg-white p-4 shadow-sm">
              <img src="/logo.png" alt="logo" className="h-12 w-12 object-contain" />
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">Admin Portal</h1>
            <p className="mt-2 text-sm text-muted-foreground text-center font-medium">
              Enter your passcode to access the dashboard.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="relative">
              <input
                type="password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setLoginError(false);
                }}
                placeholder="Enter Passcode..."
                className={`w-full rounded-2xl border bg-input/40 px-5 py-4 text-sm font-bold text-foreground transition-all placeholder:text-muted-foreground/50 focus:bg-card focus:outline-none focus:ring-4 ${
                  loginError
                    ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/10"
                    : "border-border/80 focus:border-primary focus:ring-primary/10"
                }`}
                autoFocus
              />
              {loginError && (
                <p className="mt-3 text-xs font-bold text-red-500 animate-in fade-in pl-1">
                   Passcode is incorrect. Try again.
                </p>
              )}
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-4 text-sm font-bold text-background shadow-xl transition-transform hover:scale-[1.02] active:scale-95 duration-200"
            >
              Unlock Dashboard
            </button>
          </form>
          <div className="mt-8 text-center">
             <Link to="/" className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5 uppercase tracking-widest">
               <ArrowLeft className="h-3.5 w-3.5" /> Back to Menu
             </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      
      {/* ── Mobile Sidebar Backdrop ── */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border/40 bg-card/90 backdrop-blur-2xl transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 md:bg-card/60 ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-border/50 bg-white p-1.5 shadow-sm">
              <img src="/logo.png" alt="logo" className="h-8 w-8 object-contain" />
            </div>
            <div>
              <h1 className="font-serif text-sm font-bold tracking-tight text-foreground uppercase">
                Sandwich House
              </h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Admin Domain</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="flex-1 space-y-2 px-4 mt-2">
          <button
            onClick={() => {
              setActiveTab("items");
              setIsSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold transition-all ${
              activeTab === "items"
                ? "bg-foreground text-background shadow-lg shadow-foreground/10"
                : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
            }`}
          >
            <Coffee className="h-4 w-4" />
            Menu Items
          </button>
          
          <button
            onClick={() => {
              setActiveTab("categories");
              setIsSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold transition-all ${
              activeTab === "categories"
                ? "bg-foreground text-background shadow-lg shadow-foreground/10"
                : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
            }`}
          >
            <Tag className="h-4 w-4" />
            Categories Engine
          </button>
          
          <button
            onClick={() => {
              setActiveTab("settings");
              setIsSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold transition-all ${
              activeTab === "settings"
                ? "bg-foreground text-background shadow-lg shadow-foreground/10"
                : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
            }`}
          >
            <Settings className="h-4 w-4" />
            System Settings
          </button>
        </nav>
        
        <div className="space-y-2 border-t border-border/40 p-4">
          <Link
            to="/"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold text-muted-foreground transition-all hover:bg-secondary/80 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            View Menu
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold text-destructive transition-all hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 px-4 py-8 md:p-8 lg:p-12 animate-in fade-in duration-700 max-w-full overflow-x-hidden">
        {/* Mobile Header Toggle */}
        <div className="mb-6 flex items-center justify-between md:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-xl border border-border/60 bg-card/80 p-2.5 text-foreground shadow-sm backdrop-blur-md transition-all active:scale-95 flex items-center justify-center"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-border/50 bg-white p-1 shadow-sm">
              <img src="/logo.png" alt="logo" className="h-6 w-6 object-contain" />
            </div>
            <span className="font-serif text-xs font-bold uppercase tracking-tight">Admin Portal</span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-xl bg-destructive/10 p-2.5 text-destructive transition-all active:scale-95"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <header className="mb-10 flex items-center justify-between border-b border-border/50 pb-6">
          <h2 className="font-serif text-xl sm:text-3xl font-bold tracking-tight text-foreground">
            {activeTab === "items" && "Menu Items"}
            {activeTab === "categories" && "Categories Engine"}
            {activeTab === "settings" && "System Settings"}
          </h2>
          <div className="flex items-center gap-3">
            {activeTab === "items" && (
              <button
                onClick={addItem}
                disabled={data.categories.length === 0}
                className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            )}
            {activeTab === "categories" && (
              <button
                onClick={addCategory}
                className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </button>
            )}
            {activeTab === "settings" && (
              <button
                onClick={() => setShowQR(true)}
                className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-5 py-2.5 text-sm font-bold text-primary shadow-sm transition-all hover:bg-primary hover:text-primary-foreground"
              >
                <QrCode className="h-4 w-4" />
                Show QR Code
              </button>
            )}
          </div>
        </header>

        <div className="max-w-5xl">
          {activeTab === "settings" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-card to-secondary/30 p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={`rounded-full p-4 ${
                    cloudStatus === "online" ? "bg-green-500/10 text-green-500" : 
                    cloudStatus === "connecting" ? "bg-blue-500/10 text-blue-500" :
                    "bg-orange-500/10 text-orange-500"
                  }`}>
                    <LayoutDashboard className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-foreground">System Status</h3>
                    <div className="mt-1 flex items-center gap-2">
                       <div className={`h-2.5 w-2.5 rounded-full ${
                         cloudStatus === "online" ? "bg-green-500 animate-pulse" : 
                         cloudStatus === "connecting" ? "bg-blue-500 animate-spin" :
                         "bg-orange-500"
                       }`}></div>
                       <span className="text-sm font-bold uppercase tracking-tight">
                         {cloudStatus === "online" ? "Cloud Connected (Live Sync)" : 
                          cloudStatus === "connecting" ? "Connecting to Cloud..." :
                          "Local Storage Mode"}
                       </span>
                    </div>
                    {lastSynced && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Last synced: {lastSynced.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                {cloudStatus === "offline" && (
                   <div className="text-xs font-medium text-destructive/80 text-center md:text-right max-w-[200px] animate-pulse">
                      Your phone won't see updates made in Local Storage Mode! Try "Test Connection" below.
                   </div>
                )}
                {cloudStatus === "connecting" && (
                   <div className="text-xs font-medium text-blue-500 text-center md:text-right animate-pulse">
                      Pushing changes to your phone...
                   </div>
                )}
                {cloudStatus === "online" && (
                   <div className="text-xs font-medium text-green-500 text-center md:text-right">
                      Phone is up to date 🎉
                    </div>
                 )}
              </section>

               <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-card to-secondary/30 p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-blue-500/10 p-4 text-blue-500">
                    <Cloud className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-foreground">Cloud Sync</h3>
                    <p className="text-sm font-medium text-muted-foreground mt-1 max-w-sm">
                      Pushes your current laptop's menu to the cloud so it appears on your phone. **Only use this once** to start the live sync.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                   <button
                    onClick={async () => {
                      setCloudStatus("connecting");
                      const success = await saveMenuCloud(data);
                      if (success) {
                        setCloudStatus("online");
                        setLastSynced(new Date());
                        alert("✅ Connected & Synced Successfully! Your phone is now up to date.");
                      } else {
                        setCloudStatus("offline");
                        alert("❌ Sync Failed. Please check your internet or try reducing photo sizes.");
                      }
                    }}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border/80 bg-white px-6 py-3 text-sm font-bold text-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-95"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Test & Sync
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("This will overwrite your phone's menu with your laptop's menu. Proceed?")) return;
                      setCloudStatus("connecting");
                      const success = await saveMenuCloud(data);
                      if (success) {
                        setCloudStatus("online");
                        setLastSynced(new Date());
                        alert("✅ Cloud Sync Complete! Your phone is now updated.");
                      } else {
                        setCloudStatus("offline");
                        alert("❌ Cloud Sync Failed.");
                      }
                    }}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-transform hover:scale-[1.02] active:scale-95"
                  >
                    <Cloud className="h-4 w-4" />
                    Push Local to Cloud
                  </button>
                </div>
              </section>

              <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-card to-secondary/30 p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-primary/10 p-4 text-primary">
                    <Database className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-foreground">Database Backup</h3>
                    <p className="text-sm font-medium text-muted-foreground mt-1 max-w-sm">
                      Create an offline backup file of your menu, or restore from a previously saved file.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border/80 bg-white px-6 py-3 text-sm font-bold text-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-95"
                  >
                    <CloudDownload className="h-4 w-4" />
                    Restore File
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-foreground px-6 py-3 text-sm font-bold text-background shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
                  >
                    <Download className="h-4 w-4" />
                    Download Backup
                  </button>
                </div>
              </section>

              <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-card to-secondary/30 p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-primary/10 p-4 text-primary">
                    <Key className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-foreground">Straight Entry</h3>
                    <p className="text-sm font-medium text-muted-foreground mt-1 max-w-sm">

                      Enable automatic login on this device. You won't be asked for a passcode when returning.
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                   <button
                    onClick={toggleStayLoggedIn}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 outline-none focus:ring-4 focus:ring-primary/20 ${
                      stayLoggedIn ? "bg-primary" : "bg-border"
                    }`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${stayLoggedIn ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
              </section>

              <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-card to-secondary/30 p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-destructive/10 p-4 text-destructive">
                    <Settings className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-foreground">Admin Passcode</h3>
                    <p className="text-sm font-medium text-muted-foreground mt-1 max-w-sm">
                      Update your secret admin passcode. Choose something secure that you won't forget.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <input
                    type="password"
                    placeholder="New Passcode..."
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border/80 bg-white px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-all focus:border-destructive focus:ring-4 focus:ring-destructive/10 focus:outline-none"
                  />
                  <button
                    onClick={handleUpdatePasscode}
                    disabled={!newPasscode.trim()}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-destructive px-6 py-3 text-sm font-bold text-destructive-foreground shadow-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    Change Passcode
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === "categories" && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ul className="space-y-4">
                {topCategories.map((cat, idx) => (
                  <li key={cat.id} className="rounded-2xl border border-border/60 bg-card p-2 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-center justify-between rounded-xl bg-secondary/30 px-4 py-3">
                      <span className="font-serif text-lg font-medium text-foreground">{cat.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveCategory(cat.id, -1)}
                          disabled={idx === 0}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-white hover:text-foreground hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent"
                        ><ChevronUp className="h-4 w-4" /></button>
                        <button
                          onClick={() => moveCategory(cat.id, 1)}
                          disabled={idx === topCategories.length - 1}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-white hover:text-foreground hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent"
                        ><ChevronDown className="h-4 w-4" /></button>
                        <div className="h-4 w-px bg-border mx-1"></div>
                        <button
                          onClick={() => setEditingCat(cat)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-white hover:text-primary hover:shadow-sm"
                        ><Edit2 className="h-4 w-4" /></button>
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        ><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1 pl-4 pr-2">
                      {(subCatsByParent[cat.id] || []).map((sub, sIdx, sArr) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between rounded-xl px-4 py-2 border border-transparent hover:border-border/50 hover:bg-secondary/20 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="h-px w-3 bg-border"></span>
                            <span className="text-sm font-medium text-foreground/80">{sub.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveCategory(sub.id, -1)}
                              disabled={sIdx === 0}
                              className="rounded-lg p-1 text-muted-foreground hover:bg-white hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                            ><ChevronUp className="h-3.5 w-3.5" /></button>
                            <button
                              onClick={() => moveCategory(sub.id, 1)}
                              disabled={sIdx === sArr.length - 1}
                              className="rounded-lg p-1 text-muted-foreground hover:bg-white hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                            ><ChevronDown className="h-3.5 w-3.5" /></button>
                            <div className="h-3 w-px bg-border mx-1"></div>
                            <button
                              onClick={() => setEditingCat(sub)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-white hover:text-primary"
                            ><Edit2 className="h-3.5 w-3.5" /></button>
                            <button
                              onClick={() => deleteCategory(sub.id)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            ><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => setEditingCat({ id: uid("cat"), name: "", parentId: cat.id })}
                        className="ml-8 mt-1 flex items-center gap-1.5 py-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                      >
                        <Plus className="h-3 w-3" /> Add sub-category
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {activeTab === "items" && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {data.categories.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border/50 p-12 text-center bg-secondary/30 max-w-lg mx-auto mt-12">
                  <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                    <Tag className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-serif text-xl font-bold mb-2 text-foreground">Categories Required</h3>
                  <p className="text-muted-foreground text-sm font-medium">Add a category first from the Categories tab to start building your menu items.</p>
                  <button onClick={() => setActiveTab("categories")} className="mt-6 rounded-xl bg-foreground px-6 py-3 text-sm font-bold text-background shadow-lg hover:scale-105 transition-transform">Go to Categories</button>
                </div>
              )}
              
              <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {data.items.map((it) => {
                  const cat = data.categories.find((c) => c.id === it.categoryId);
                  const parentCat = cat?.parentId
                    ? data.categories.find((c) => c.id === cat?.parentId)
                    : null;
                  
                  const isAvailable = it.available !== false;
                  
                  return (
                    <li
                      key={it.id}
                      draggable
                      onDragStart={(e) => handleItemDragStart(it.id, e)}
                      onDragOver={handleItemDragOver}
                      onDrop={(e) => handleItemDrop(it.id, e)}
                      className={`group relative flex flex-col overflow-hidden rounded-[2rem] border bg-card shadow-[0_4px_15px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-xl hover:-translate-y-1 cursor-grab active:cursor-grabbing ${
                        isAvailable ? "border-border/60 hover:border-primary/40" : "border-border/30 opacity-60 grayscale hover:grayscale-0"
                      } ${draggedItemId === it.id ? "opacity-30 border-primary border-dashed" : ""}`}
                    >
                      {/* Image Preview with fixed ratio */}
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-secondary/30">
                        {it.image ? (
                          <img src={it.image} alt={it.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground opacity-20" />
                          </div>
                        )}
                        {!isAvailable && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                            <EyeOff className="h-6 w-6 text-white mb-1" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Hidden</span>
                          </div>
                        )}
                        
                        {/* Admin Info Badge */}
                        <div className="absolute top-3 left-3">
                           <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/40 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-md border border-white/10">
                              {parentCat ? parentCat.name : cat?.name ?? "..."}
                           </span>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        <div className="mb-3">
                          <h4 className="font-serif text-lg font-extrabold leading-tight text-foreground transition-colors group-hover:text-primary">
                            {it.name}
                          </h4>
                          <div className="mt-1 flex items-center gap-2">
                             <span className="text-sm font-black text-primary">{formatPrice(it.price)}</span>
                          </div>
                        </div>
                        
                        <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border/40 pt-4">
                          <button
                            onClick={() => setEditingItem(it)}
                            className="flex items-center justify-center gap-2 rounded-xl bg-secondary/80 py-2.5 text-xs font-bold text-foreground hover:bg-foreground hover:text-background transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => deleteItem(it.id)}
                            className="flex items-center justify-center gap-2 rounded-xl bg-red-500/10 py-2.5 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </main>

      {/* Dialogs */}
      {showQR && <QRDialog onClose={() => setShowQR(false)} />}
      
      {editingCat && (
        <CategoryDialog
          value={editingCat}
          topCategories={topCategories}
          onCancel={() => setEditingCat(null)}
          onSave={saveCategory}
        />
      )}
      
      {editingItem && (
        <ItemDialog
          value={editingItem}
          categories={data.categories}
          onCancel={() => setEditingItem(null)}
          onSave={saveItem}
        />
      )}
    </div>
  );
}

// ── Shared Dialog Styles ──

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 backdrop-blur-md sm:items-center sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] border border-border/50 bg-card p-6 shadow-2xl sm:rounded-[2rem] animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-border sm:hidden"></div>
        <h3 className="mb-6 font-serif text-2xl font-bold tracking-tight text-foreground">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, optional }: { label: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="block text-xs font-bold tracking-wider text-foreground/80 uppercase">{label}</span>
        {optional && <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Optional</span>}
      </div>
      {children}
    </label>
  );
}

const inputClassName = "w-full rounded-xl border border-border/80 bg-input/40 px-4 py-3 text-sm text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/10 hover:border-border font-medium";

// ── Components ──

function QRDialog({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => { setUrl(window.location.origin); }, []);
  
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url)}&color=0a1510&bgcolor=ffffff`;
  
  const handleDownload = async () => {
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = "sandwich-house-menu-qr.png";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
    } catch (e) {
      window.open(qrUrl, "_blank");
    }
  };

  return (
    <Modal onClose={onClose} title="Customer Menu QR Code">
      <div className="flex flex-col items-center justify-center p-2 text-center">
        <div className="relative rounded-[2rem] border-[3px] border-border/80 bg-white p-6 shadow-xl mb-6">
          <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-primary/10 to-accent/10 -z-10 blur-xl opacity-70"></div>
          {url ? (
            <img src={qrUrl} alt="Menu QR Code" className="h-56 w-56 sm:h-64 sm:w-64" crossOrigin="anonymous" />
          ) : (
            <div className="h-56 w-56 sm:h-64 sm:w-64 animate-pulse bg-secondary/50 rounded-xl flex items-center justify-center">
              <QrCode className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
        </div>
        <p className="text-sm font-medium leading-relaxed text-foreground/90 max-w-sm mb-4">
          Print or share this QR code. Customers can scan it to view the live digital menu instantly without downloading an app.
        </p>
        <button
          onClick={handleDownload}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3.5 text-sm font-bold text-background shadow-lg transition-transform hover:scale-[1.02] active:scale-95 duration-200"
        >
          <Download className="h-4 w-4" /> Download High-Res HQ
        </button>
      </div>
    </Modal>
  );
}

function CategoryDialog({ value, topCategories, onSave, onCancel }: any) {
  const [name, setName] = useState(value.name);
  const [parentId, setParentId] = useState<string | undefined>(value.parentId);
  return (
    <Modal onClose={onCancel} title={value.name ? "Edit category" : "New category"}>
      <div className="space-y-6">
        <Field label="Category name"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Signature Sandwiches" className={inputClassName} /></Field>
        <Field label="Parent category" optional><select value={parentId ?? ""} onChange={(e) => setParentId(e.target.value || undefined)} className={inputClassName}>
          <option value="">— None (Top-level category) —</option>
          {topCategories.filter((c:any) => c.id !== value.id).map((c:any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select></Field>
      </div>
      <div className="mt-8 flex gap-3">
        <button onClick={onCancel} className="flex-1 rounded-xl border border-border bg-secondary/50 py-3.5 text-sm font-bold hover:bg-secondary">Cancel</button>
        <button onClick={() => name.trim() && onSave({ ...value, name: name.trim(), parentId })} className="flex-1 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">Save Category</button>
      </div>
    </Modal>
  );
}

const TAG_OPTIONS = ["Spicy", "Vegan", "Gluten-Free", "Fasting"];

const compressImage = (base64Str: string, maxWidth = 1024): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (maxWidth * height) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
  });
};

function ItemDialog({ value, categories, onSave, onCancel }: any) {
  const [item, setItem] = useState<MenuItem>({
    ...value,
    available: value.available !== false,
    tags: value.tags || []
  });
  const [isDragging, setIsDragging] = useState(false);

  const update = <K extends keyof MenuItem>(k: K, v: MenuItem[K]) => setItem((s) => ({ ...s, [k]: v }));
  
  const toggleTag = (tag: string) => {
    const next = item.tags!.includes(tag) ? item.tags!.filter(t => t !== tag) : [...item.tags!, tag];
    update("tags", next);
  };

  const processFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please upload an image file."); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const compressed = await compressImage(String(reader.result));
      update("image", compressed);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Modal onClose={onCancel} title={value.name ? "Edit item" : "New menu item"}>
      <div className="space-y-6">
        
        {/* Availability Toggle */}
        <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-white p-4 shadow-sm">
          <div>
            <h4 className="font-bold text-foreground">Menu Visibility</h4>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">If turned off, this item is completely hidden from customers.</p>
          </div>
          <button
            onClick={() => update("available", !item.available)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 outline-none focus:ring-4 focus:ring-primary/20 ${
              item.available ? "bg-primary" : "bg-border"
            }`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${item.available ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>

        <Field label="Name">
          <input value={item.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Classic BLT" className={inputClassName} />
        </Field>
        
        <Field label="Description & Ingredients">
          <textarea value={item.description} onChange={(e) => update("description", e.target.value)} rows={2} placeholder="Crispy bacon, lettuce, tomato..." className={inputClassName} />
        </Field>
        
        {/* Dietary Tags */}
        <Field label="Dietary Tags" optional>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {TAG_OPTIONS.map(tag => {
              const active = item.tags!.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all border ${
                    active 
                      ? "bg-foreground text-background border-foreground shadow-[0_4px_10px_rgba(0,0,0,0.1)]" 
                      : "bg-white border-border/80 text-foreground/70 hover:border-border"
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (ETB)">
            <input type="number" step="1" min="0" value={item.price || ""} onChange={(e) => update("price", parseFloat(e.target.value) || 0)} className={inputClassName} />
          </Field>
          <Field label="Category">
            <select value={item.categoryId} onChange={(e) => update("categoryId", e.target.value)} className={inputClassName}>
              <option disabled value="">Select...</option>
              {categories.map((c:any) => (
                <option key={c.id} value={c.id}>{c.parentId ? `  › ${c.name}` : c.name}</option>
              ))}
            </select>
          </Field>
        </div>
        
        <Field label="Item Image">
          <div 
            className={`relative mt-1 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
              isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border/60 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50"
            }`}
             onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
             onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
             onDrop={(e) => { e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files) processFile(e.dataTransfer.files[0]); }}
          >
            <input type="file" accept="image/*" onChange={(e) => processFile(e.target.files?.[0])} className="absolute inset-0 cursor-pointer opacity-0 z-10" />
            {item.image ? (
               <img src={item.image} alt="Preview" className="h-28 w-28 object-cover rounded-xl shadow-md border border-border" />
            ) : (
                <UploadCloud className="h-6 w-6 text-primary mb-2" />
            )}
            <p className="text-xs text-muted-foreground font-semibold mt-2">Click or drag image here</p>
          </div>
        </Field>

        <div className="rounded-2xl border border-border/50 bg-secondary/20 p-5 mt-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="mb-1.5 block text-xs font-bold tracking-wider text-foreground/80 uppercase">Extras / Add-ons</span>
            <button onClick={() => update("extras", [...item.extras, { name: "", price: 0 }])} className="flex items-center gap-1.5 rounded-full bg-white border border-border/60 px-3 py-1.5 text-xs font-bold text-foreground">
              <Plus className="h-3 w-3" /> Add Extra
            </button>
          </div>
          <div className="space-y-3">
            {item.extras.map((ex, i) => (
              <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <input value={ex.name} onChange={(e) => update("extras", item.extras.map((x, j) => j===i ? {...x, name: e.target.value} : x))} placeholder="e.g. Extra Bacon" className={`${inputClassName} flex-1 min-w-[150px]`} />
                <div className="relative w-32 shrink-0">
                  <input type="number" step="1" value={ex.price || ""} onChange={(e) => update("extras", item.extras.map((x, j) => j===i ? {...x, price: parseFloat(e.target.value)||0} : x))} className={`${inputClassName}`} />
                </div>
                <button onClick={() => update("extras", item.extras.filter((_, j) => j !== i))} className="rounded-xl p-3 text-muted-foreground bg-white border hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex gap-3">
        <button onClick={onCancel} className="flex-1 rounded-xl border border-border bg-secondary/50 py-3.5 text-sm font-bold">Cancel</button>
        <button onClick={() => item.name.trim() && item.categoryId && onSave(item)} className="flex-1 rounded-xl bg-foreground py-3.5 text-sm font-bold text-background shadow-lg hover:scale-[1.02]">Save Item</button>
      </div>
    </Modal>
  );
}
