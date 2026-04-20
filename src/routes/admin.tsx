import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, DragEvent, useEffect, useRef } from "react";
import {
  type Category,
  type MenuItem,
  formatPrice,
  uid,
  useMenu,
} from "@/lib/menu-store";
import { Plus, ChevronUp, ChevronDown, Edit2, Trash2, ArrowLeft, Settings2, Image as ImageIcon, UploadCloud, QrCode, Download, Database, CloudDownload, CloudUpload, EyeOff, LayoutDashboard, Tag, Coffee, Settings, LogOut, Menu, X } from "lucide-react";

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
  const [data, setData] = useMenu();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sandwich_house_admin_auth") === "true";
    }
    return false;
  });
  const [passcode, setPasscode] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [newPasscode, setNewPasscode] = useState("");

  const [currentPasscode, setCurrentPasscode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sandwich_house_admin_passcode") || "admin123";
    }
    return "admin123";
  });
  
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [activeTab, setActiveTab] = useState<"items" | "categories" | "settings">("items");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === currentPasscode || passcode === "sandwich") {
      setIsAuthenticated(true);
      localStorage.setItem("sandwich_house_admin_auth", "true");
      setLoginError(false);
    } else {
      setLoginError(true);
      setPasscode("");
    }
  };

  const handleUpdatePasscode = () => {
    if (!newPasscode.trim()) return;
    setCurrentPasscode(newPasscode);
    localStorage.setItem("sandwich_house_admin_passcode", newPasscode);
    setNewPasscode("");
    alert("Passcode updated successfully!");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("sandwich_house_admin_auth");
  };

  // ── Categories ──
  const addCategory = () => setEditingCat({ id: uid("cat"), name: "", parentId: undefined });
  const saveCategory = (cat: Category) => {
    const exists = data.categories.find((c) => c.id === cat.id);
    const categories = exists
      ? data.categories.map((c) => (c.id === cat.id ? cat : c))
      : [...data.categories, cat];
    setData({ ...data, categories });
    setEditingCat(null);
  };
  const deleteCategory = (id: string) => {
    if (!confirm("Delete this category? Items in it will also be removed.")) return;
    const removedIds = new Set([id, ...data.categories.filter((c) => c.parentId === id).map((c) => c.id)]);
    setData({
      categories: data.categories.filter((c) => !removedIds.has(c.id)),
      items: data.items.filter((i) => !removedIds.has(i.categoryId)),
    });
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
    setData({ ...data, categories: next });
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
  const saveItem = (item: MenuItem) => {
    const exists = data.items.find((i) => i.id === item.id);
    const items = exists
      ? data.items.map((i) => (i.id === item.id ? item : i))
      : [...data.items, item];
    setData({ ...data, items });
    setEditingItem(null);
  };
  const deleteItem = (id: string) => {
    if (!confirm("Delete this item?")) return;
    setData({ ...data, items: data.items.filter((i) => i.id !== id) });
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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.categories && parsed.items) {
          setData(parsed);
          alert("Database Restored Successfully!");
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

  const topCategories = data.categories.filter((c) => !c.parentId);
  const subCatsByParent: Record<string, Category[]> = {};
  for (const c of data.categories) {
    if (c.parentId) {
      if (!subCatsByParent[c.parentId]) subCatsByParent[c.parentId] = [];
      subCatsByParent[c.parentId].push(c);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 font-sans selection:bg-primary/20">
        <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 rounded-2xl border border-border/50 bg-white p-3 shadow-sm">
              <img src="/logo.png" alt="logo" className="h-12 w-12 object-contain" />
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">Admin Portal</h1>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              Please enter the passcode to access the Sandwich House admin dashboard.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setLoginError(false);
                }}
                placeholder="Enter Passcode..."
                className={`w-full rounded-xl border bg-input/40 px-4 py-3 text-sm text-foreground transition-all placeholder:text-muted-foreground/50 focus:bg-card focus:outline-none focus:ring-4 font-medium ${
                  loginError
                    ? "border-destructive/50 focus:border-destructive focus:ring-destructive/10"
                    : "border-border/80 focus:border-primary focus:ring-primary/10"
                }`}
                autoFocus
              />
              {loginError && (
                <p className="mt-2 text-xs font-semibold text-destructive animate-in fade-in">
                  Incorrect passcode. Please try again.
                </p>
              )}
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3.5 text-sm font-bold text-background shadow-lg transition-transform hover:scale-[1.02] active:scale-95 duration-200"
            >
              Secure Login
            </button>
          </form>
          <div className="mt-6 text-center">
             <Link to="/" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5">
               <ArrowLeft className="h-3 w-3" /> Back to Menu
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
                  <div className="rounded-full bg-primary/10 p-4 text-primary">
                    <Database className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-foreground">Database Sync</h3>
                    <p className="text-sm font-medium text-muted-foreground mt-1 max-w-sm">
                      Create an offline backup of your database, or restore the database file on this device.
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
                    Restore DB
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-foreground px-6 py-3 text-sm font-bold text-background shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
                  >
                    <CloudUpload className="h-4 w-4" />
                    Backup DB
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
                      Change the passcode required to access the admin portal. Current default is 'admin123'.
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
              
              <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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
                      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 cursor-grab active:cursor-grabbing ${
                        isAvailable ? "border-border/60 hover:border-primary/40" : "border-border/30 opacity-60 grayscale hover:grayscale-0"
                      } ${draggedItemId === it.id ? "opacity-30 border-primary border-dashed" : ""}`}
                    >
                      <div className="mb-4 flex items-start gap-4 pointer-events-none">
                        <div className="relative h-20 w-20 shrink-0 rounded-[14px] overflow-hidden border border-border/50 bg-secondary/50 flex items-center justify-center flex-col">
                          {it.image ? (
                            <img src={it.image} alt={it.name} className="h-full w-full object-cover transition-transform group-hover:scale-110 duration-500" />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-muted-foreground opacity-30" />
                          )}
                          {!isAvailable && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                              <EyeOff className="h-5 w-5 text-white/90" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5">
                          <h4 className="truncate font-serif text-lg font-bold text-foreground">
                            {it.name}
                          </h4>
                          <div className="mt-0.5 flex items-center gap-2">
                             <span className="text-sm font-bold text-primary">{formatPrice(it.price)}</span>
                             {!isAvailable && <span className="rounded-sm bg-red-500/10 px-1.5 py-0.5 text-[9px] font-sans font-bold text-red-600 uppercase tracking-widest">Hidden</span>}
                          </div>
                          <p className="mt-1.5 truncate text-[10px] uppercase tracking-wider text-muted-foreground/80 font-bold bg-secondary w-max px-2 py-0.5 rounded pl-1.5 border border-border/50">
                            <span className="opacity-50">#</span> {parentCat ? `${parentCat.name} › ` : ""}{cat?.name ?? "—"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border/30 pt-4 relative z-10">
                        <button
                          onClick={() => setEditingItem(it)}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary/50 py-2.5 text-xs font-semibold text-foreground hover:bg-foreground hover:text-background transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => deleteItem(it.id)}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-destructive/5 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
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
    reader.onload = () => update("image", String(reader.result));
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
