import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  categories,
  websiteStatuses,
  socialStatuses,
  leadStatuses,
  activityTypes,
  tags,
  tagColors,
  activityIcons,
  websiteStatusColors,
  socialStatusColors,
  leadStatusColors,
  categoryIcons,
  leadStatusChartColors,
  templates,
  initialLeads,
  calculateLeadScore,
  getLeadScoreColor,
  formatTimeAgo,
} from "./data";
import {
  Search,
  Plus,
  Table as TableIcon,
  LayoutDashboard,
  Kanban,
  Download,
  Upload,
  X,
  Menu,
} from "lucide-react";

import { Toaster, toast } from "sonner";
import Dashboard from "./Dashboard";
import { ActivityLog, TemplatesView } from "./Views";

// Types
export interface Activity {
  id: number;
  type: string;
  note: string;
  date: string;
}

export interface Lead {
  id: number;
  businessName: string;
  category: string;
  phone: string;
  address: string;
  ownerName: string;
  email: string;
  websiteUrl: string;
  websiteStatus: string;
  socialStatus: string;
  leadStatus: string;
  notes: string;
  dateAdded: string;
  tags: string[];
  activities: Activity[];
}

const emptyLead: Lead = {
  id: 0,
  businessName: "",
  category: categories[0],
  phone: "",
  address: "",
  ownerName: "",
  email: "",
  websiteUrl: "",
  websiteStatus: "None",
  socialStatus: "None",
  leadStatus: "Not Contacted",
  notes: "",
  dateAdded: "",
  tags: [],
  activities: [],
};

// Local Storage
const STORAGE_KEY = "leadmgr_data";
const loadLeads = (): Lead[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {}
  return initialLeads;
};

const saveLeads = (leads: Lead[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  } catch (e) {}
};

// Components
const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${className}`}>
    {children}
  </span>
);

const StatusBadge = ({ label, colorMap }: { label: string; colorMap: Record<string, string> }) => (
  <Badge className={colorMap[label] || "bg-zinc-800/50 text-zinc-500 border-zinc-700/50"}>
    {label}
  </Badge>
);

const TagBadge = ({ label, onRemove }: { label: string; onRemove?: () => void }) => (
  <Badge className={tagColors[label] || "bg-zinc-800/50 text-zinc-500 border-zinc-700/50"}>
    {label}
    {onRemove && (
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="ml-1 opacity-60 hover:opacity-100">
        ×
      </button>
    )}
  </Badge>
);

const Modal = ({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={onClose}>
    <div className={`border border-white/[0.06] rounded-2xl shadow-2xl mx-4 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 ${wide ? "w-full max-w-2xl" : "w-full max-w-lg"}`} style={{ background: "rgba(14,14,20,0.97)" }} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] sticky top-0 z-10" style={{ background: "rgba(14,14,20,0.95)", backdropFilter: "blur(20px)" }}>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.05] transition text-lg">
          <X size={18} />
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  </div>
);

// Main App
export default function App() {
  const [leads, setLeads] = useState<Lead[]>(loadLeads);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterWeb, setFilterWeb] = useState("All");
  const [filterSocial, setFilterSocial] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterTag, setFilterTag] = useState("All");
  const [view, setView] = useState<"leads" | "dashboard">("leads");
  const [layout, setLayout] = useState<"table" | "kanban">("table");
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [viewingTab, setViewingTab] = useState<"details" | "activity" | "templates" | "notes">("details");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const historyRef = useRef<Lead[][]>([]);
  const futureRef = useRef<Lead[][]>([]);

  const updateLeadsWithHistory = useCallback((newLeads: Lead[] | ((prev: Lead[]) => Lead[])) => {
    setLeads((prev) => {
      const next = typeof newLeads === "function" ? newLeads(prev) : newLeads;
      historyRef.current = [...historyRef.current.slice(-30), prev];
      futureRef.current = [];
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    if (!historyRef.current.length) return;
    const prev = historyRef.current.pop()!;
    setLeads((current) => {
      futureRef.current.push(current);
      return prev;
    });
    toast.info("Undo successful");
  }, []);

  const redo = useCallback(() => {
    if (!futureRef.current.length) return;
    const next = futureRef.current.pop()!;
    setLeads((current) => {
      historyRef.current.push(current);
      return next;
    });
    toast.info("Redo successful");
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if (e.key === "Escape") {
        setIsSearchModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    saveLeads(leads);
  }, [leads]);

  const exportCSV = () => {
    const headers = [
      "Business Name", "Category", "Phone", "Address", "Owner", "Email", 
      "Website URL", "Website Status", "Social", "Status", "Tags", "Notes", "Date Added"
    ];
    const rows = leads.map(l => [
      l.businessName, l.category, l.phone, l.address, l.ownerName, l.email,
      l.websiteUrl, l.websiteStatus, l.socialStatus, l.leadStatus, 
      (l.tags || []).join("; "), l.notes, l.dateAdded
    ].map(v => `"${(v || "").replace(/"/g, '""')}"`));
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) {
        toast.error("No valid leads found in CSV");
        return;
      }
      
      const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim().toLowerCase());
      const newLeads = lines.slice(1).map((line, i) => {
        const values = line.match(/("([^"]|"")*"|[^,]*)/g)?.map(v => v.replace(/^"|"$/g, "").replace(/""/g, '"').trim()) || [];
        const getVal = (key: string) => {
          const idx = headers.findIndex(h => h.includes(key));
          return idx >= 0 ? values[idx] || "" : "";
        };
        
        return {
          id: Date.now() + i,
          businessName: getVal("business") || getVal("name") || values[0] || "",
          category: categories.find(c => c.toLowerCase().includes((getVal("category") || "").toLowerCase())) || "Other",
          phone: getVal("phone") || "",
          address: getVal("address") || getVal("city") || "",
          ownerName: getVal("owner") || "",
          email: getVal("email") || "",
          websiteUrl: getVal("website url") || getVal("url") || "",
          websiteStatus: websiteStatuses.includes(getVal("website status") || getVal("website")) ? getVal("website status") || getVal("website") : "None",
          socialStatus: socialStatuses.includes(getVal("social")) ? getVal("social") : "None",
          leadStatus: "Not Contacted",
          notes: getVal("notes") || "",
          dateAdded: new Date().toISOString().split("T")[0],
          activities: [],
          tags: []
        };
      }).filter(l => l.businessName);
      
      if (newLeads.length) {
        updateLeadsWithHistory([...leads, ...newLeads]);
        setIsImportModalOpen(false);
        toast.success(`Imported ${newLeads.length} leads`);
      } else {
        toast.error("No valid leads found in CSV");
      }
    };
    reader.readAsText(file);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (filterCategory !== "All" && lead.category !== filterCategory) return false;
      if (filterWeb !== "All" && lead.websiteStatus !== filterWeb) return false;
      if (filterSocial !== "All" && lead.socialStatus !== filterSocial) return false;
      if (filterStatus !== "All" && lead.leadStatus !== filterStatus) return false;
      if (filterTag !== "All" && !lead.tags?.includes(filterTag)) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !lead.businessName.toLowerCase().includes(s) &&
          !lead.ownerName?.toLowerCase().includes(s) &&
          !lead.address?.toLowerCase().includes(s)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [leads, filterCategory, filterWeb, filterSocial, filterStatus, filterTag, search]);

  const handleAddLead = (lead: Lead) => {
    updateLeadsWithHistory([...leads, { ...lead, id: Date.now(), dateAdded: new Date().toISOString().split("T")[0] }]);
    setIsAddModalOpen(false);
    toast.success("Lead added");
  };

  const handleUpdateLead = (updated: Lead) => {
    updateLeadsWithHistory(leads.map((l) => (l.id === updated.id ? updated : l)));
    setEditingLead(null);
    if (viewingLead?.id === updated.id) setViewingLead(updated);
    toast.success("Lead updated");
  };

  const handleDeleteLead = (id: number) => {
    updateLeadsWithHistory(leads.filter((l) => l.id !== id));
    setViewingLead(null);
    toast.success("Lead deleted");
  };

  return (
    <div className="h-screen flex bg-zinc-950 text-zinc-300 font-sans overflow-hidden">
      <Toaster theme="dark" position="bottom-right" />
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-56" : "w-0"} flex-shrink-0 transition-all duration-300 overflow-hidden border-r border-white/[0.04] bg-zinc-950/50`}>
        <div className="w-56 h-full flex flex-col">
          <div className="px-4 py-5">
            <h1 className="text-base font-bold tracking-tight">
              <span className="text-red-500">LEAD</span>
              <span className="text-white"> MGR</span>
            </h1>
          </div>
          <div className="px-3 pb-3 flex gap-1">
            <button onClick={() => setView("leads")} className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition ${view === "leads" ? "bg-red-500/10 text-red-400" : "text-zinc-600 hover:text-zinc-400"}`}>Leads</button>
            <button onClick={() => setView("dashboard")} className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition ${view === "dashboard" ? "bg-red-500/10 text-red-400" : "text-zinc-600 hover:text-zinc-400"}`}>Dashboard</button>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
          <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
            <p className="px-2 text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1 mt-2">Categories</p>
            <button onClick={() => setFilterCategory("All")} className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${filterCategory === "All" ? "bg-red-500/8 text-red-400" : "text-zinc-600 hover:bg-white/[0.02] hover:text-zinc-400"}`}>
              <span>All</span>
              <span className="font-bold">{leads.length}</span>
            </button>
            {categories.map((c) => {
              const count = leads.filter((l) => l.category === c).length;
              if (count === 0) return null;
              return (
                <button key={c} onClick={() => setFilterCategory(c)} className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${filterCategory === c ? "bg-red-500/8 text-red-400" : "text-zinc-600 hover:bg-white/[0.02] hover:text-zinc-400"}`}>
                  <span className="truncate">{categoryIcons[c]} {c.split(" / ")[0]}</span>
                  <span className="font-bold">{count}</span>
                </button>
              );
            })}
          </nav>
          <div className="p-3 space-y-2 border-t border-white/[0.03]">
            <button onClick={() => setIsSearchModalOpen(true)} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] text-zinc-600 border border-white/[0.04] hover:border-zinc-700 transition">
              <Search size={14} />
              Search
              <kbd className="ml-auto text-[9px] bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-700/50">⌘K</kbd>
            </button>
            <div className="flex gap-1">
              <button onClick={undo} title="Undo (Cmd+Z)" className="flex-1 py-1.5 rounded-lg text-[10px] text-zinc-600 border border-white/[0.04] hover:border-zinc-700 hover:text-zinc-400 transition">Undo</button>
              <button onClick={redo} title="Redo (Cmd+Shift+Z)" className="flex-1 py-1.5 rounded-lg text-[10px] text-zinc-600 border border-white/[0.04] hover:border-zinc-700 hover:text-zinc-400 transition">Redo</button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-zinc-950">
        <header className="flex-shrink-0 border-b border-white/[0.04] bg-zinc-950/80 backdrop-blur-md">
          <div className="px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-white/[0.04] transition">
                <Menu size={18} />
              </button>
              <div>
                <h2 className="text-sm font-semibold text-white">{view === "dashboard" ? "Dashboard" : filterCategory === "All" ? "All Leads" : filterCategory}</h2>
                <p className="text-[11px] text-zinc-600">{view === "dashboard" ? "Analytics overview" : `${filteredLeads.length} leads`}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {view === "leads" && (
                <div className="flex rounded-lg border border-white/[0.04] overflow-hidden">
                  <button onClick={() => setLayout("table")} className={`px-3 py-1.5 text-[11px] font-semibold transition ${layout === "table" ? "bg-red-500/10 text-red-400" : "text-zinc-600 hover:text-zinc-400"}`}>Table</button>
                  <button onClick={() => setLayout("kanban")} className={`px-3 py-1.5 text-[11px] font-semibold transition ${layout === "kanban" ? "bg-red-500/10 text-red-400" : "text-zinc-600 hover:text-zinc-400"}`}>Kanban</button>
                </div>
              )}
              <button onClick={() => setIsImportModalOpen(true)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-500 border border-white/[0.04] hover:border-zinc-600 hover:text-zinc-300 transition">Import</button>
              <button onClick={exportCSV} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-500 border border-white/[0.04] hover:border-zinc-600 hover:text-zinc-300 transition">Export</button>
              <button onClick={() => setIsAddModalOpen(true)} className="px-3.5 py-1.5 rounded-lg text-[11px] bg-red-600 text-white font-semibold hover:bg-red-500 transition shadow-lg shadow-red-900/30 flex items-center gap-1">
                <Plus size={14} /> Add Lead
              </button>
            </div>
          </div>
          {view === "leads" && (
            <div className="px-5 pb-3 flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter..." className="w-40 bg-black/20 border border-white/[0.04] rounded-lg pl-9 pr-3 py-1.5 text-[11px] text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-red-500/20 transition" />
              </div>
              <select value={filterWeb} onChange={(e) => setFilterWeb(e.target.value)} className="bg-black/20 border border-white/[0.04] rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-400 focus:outline-none focus:border-red-500/20 transition">
                <option value="All">Website: All</option>
                {websiteStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-black/20 border border-white/[0.04] rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-400 focus:outline-none focus:border-red-500/20 transition">
                <option value="All">Status: All</option>
                {leadStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {view === "dashboard" ? (
            <Dashboard leads={leads} />
          ) : layout === "kanban" ? (
            <div className="flex gap-4 overflow-x-auto h-full pb-4">
              {leadStatuses.map((status) => {
                const statusLeads = filteredLeads.filter((l) => l.leadStatus === status);
                return (
                  <div 
                    key={status} 
                    className="flex-shrink-0 w-72 flex flex-col"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const leadId = e.dataTransfer.getData("text/plain");
                      if (leadId) {
                        const lead = leads.find(l => l.id.toString() === leadId);
                        if (lead && lead.leadStatus !== status) {
                          handleUpdateLead({ ...lead, leadStatus: status });
                        }
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <StatusBadge label={status} colorMap={leadStatusColors} />
                      <span className="text-xs text-zinc-500">{statusLeads.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                      {statusLeads.map((lead) => (
                        <div 
                          key={lead.id} 
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", lead.id.toString());
                          }}
                          onClick={() => setViewingLead(lead)} 
                          className="bg-zinc-900/50 border border-white/[0.04] rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-red-500/20 transition group"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="text-sm font-medium text-zinc-200 group-hover:text-white truncate pr-2">{lead.businessName}</h3>
                            <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getLeadScoreColor(calculateLeadScore(lead))}`}>
                              {calculateLeadScore(lead)}
                            </div>
                          </div>
                          <p className="text-xs text-zinc-500 truncate mb-3">{categoryIcons[lead.category]} {lead.category}</p>
                          <div className="flex flex-wrap gap-1">
                            {lead.tags.slice(0, 3).map((tag) => (
                              <TagBadge key={tag} label={tag} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.04] overflow-hidden bg-zinc-900/30">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/20 text-xs text-zinc-500 border-b border-white/[0.04]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Pri</th>
                    <th className="px-4 py-3 font-medium">Business</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {filteredLeads.map((lead) => {
                    const score = calculateLeadScore(lead);
                    return (
                      <tr key={lead.id} onClick={() => setViewingLead(lead)} className="hover:bg-white/[0.02] cursor-pointer transition">
                        <td className="px-4 py-3">
                          <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border ${getLeadScoreColor(score)}`}>
                            {score}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-zinc-200">{lead.businessName}</div>
                          <div className="text-xs text-zinc-500">{lead.phone || lead.email || "No contact info"}</div>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {categoryIcons[lead.category]} {lead.category.split(" / ")[0]}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge label={lead.leadStatus} colorMap={leadStatusColors} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {lead.tags.slice(0, 2).map((tag) => (
                              <TagBadge key={tag} label={tag} />
                            ))}
                            {lead.tags.length > 2 && <span className="text-[10px] text-zinc-600">+{lead.tags.length - 2}</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {isAddModalOpen && (
        <Modal title="Add New Lead" onClose={() => setIsAddModalOpen(false)}>
          <LeadForm initial={emptyLead} onSave={handleAddLead} onCancel={() => setIsAddModalOpen(false)} />
        </Modal>
      )}

      {editingLead && (
        <Modal title={`Edit: ${editingLead.businessName}`} onClose={() => setEditingLead(null)}>
          <LeadForm initial={editingLead} onSave={handleUpdateLead} onCancel={() => setEditingLead(null)} />
        </Modal>
      )}

      {viewingLead && !editingLead && (
        <Modal title={viewingLead.businessName} onClose={() => { setViewingLead(null); setViewingTab("details"); }} wide>
          <div className="space-y-5 -mt-2">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl border ${getLeadScoreColor(calculateLeadScore(viewingLead))}`}>
                {calculateLeadScore(viewingLead)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white">{viewingLead.businessName}</h2>
                <p className="text-sm text-zinc-500">{categoryIcons[viewingLead.category]} {viewingLead.category}{viewingLead.ownerName ? ` · ${viewingLead.ownerName}` : ""}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {leadStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => handleUpdateLead({ ...viewingLead, leadStatus: s })}
                  className={`text-[10px] font-semibold px-3 py-1.5 rounded-full border transition ${
                    viewingLead.leadStatus === s ? leadStatusColors[s] : "text-zinc-600 border-zinc-800/50 hover:border-zinc-600"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    const newTags = viewingLead.tags.includes(t) ? viewingLead.tags.filter((tag) => tag !== t) : [...viewingLead.tags, t];
                    handleUpdateLead({ ...viewingLead, tags: newTags });
                  }}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition ${
                    viewingLead.tags.includes(t) ? tagColors[t] : "text-zinc-700 border-zinc-800/30 hover:border-zinc-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex border-b border-white/[0.04]">
              {(["details", "activity", "templates", "notes"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setViewingTab(tab)}
                  className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
                    viewingTab === tab ? "border-red-500 text-white" : "border-transparent text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  {tab === "activity" ? `Activity (${(viewingLead.activities || []).length})` : tab}
                </button>
              ))}
            </div>

            {viewingTab === "details" && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm animate-in fade-in duration-200">
                <div>
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Phone</p>
                  <p className="text-zinc-300 mt-1">{viewingLead.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Owner</p>
                  <p className="text-zinc-300 mt-1">{viewingLead.ownerName || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Address</p>
                  <p className="text-zinc-300 mt-1">{viewingLead.address || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Email</p>
                  {viewingLead.email ? (
                    <a href={`mailto:${viewingLead.email}`} className="text-red-400 hover:text-red-300 text-sm mt-1 inline-block">{viewingLead.email}</a>
                  ) : (
                    <p className="text-zinc-500 mt-1">—</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Website</p>
                  {viewingLead.websiteUrl ? (
                    <a href={viewingLead.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 text-sm mt-1 inline-block">
                      {viewingLead.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  ) : (
                    <p className="text-zinc-500 mt-1">None</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Web Status</p>
                  <p className="mt-1.5"><StatusBadge label={viewingLead.websiteStatus} colorMap={websiteStatusColors} /></p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Social</p>
                  <p className="mt-1.5"><StatusBadge label={viewingLead.socialStatus} colorMap={socialStatusColors} /></p>
                </div>
              </div>
            )}

            {viewingTab === "activity" && (
              <div className="animate-in fade-in duration-200">
                <ActivityLog 
                  activities={viewingLead.activities || []} 
                  onAdd={(activity) => {
                    handleUpdateLead({
                      ...viewingLead,
                      activities: [...(viewingLead.activities || []), { ...activity, id: Date.now() }]
                    });
                  }} 
                />
              </div>
            )}

            {viewingTab === "templates" && (
              <TemplatesView lead={viewingLead} />
            )}

            {viewingTab === "notes" && (
              <div className="animate-in fade-in duration-200">
                {viewingLead.notes ? (
                  <div className="bg-black/20 border border-white/[0.04] rounded-xl p-4 text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
                    {viewingLead.notes}
                  </div>
                ) : (
                  <p className="text-zinc-600 text-center py-8">No notes</p>
                )}
              </div>
            )}

            <div className="flex justify-between pt-3 border-t border-white/[0.04]">
              <button onClick={() => handleDeleteLead(viewingLead.id)} className="text-sm text-red-400/60 hover:text-red-400 transition">
                Delete
              </button>
              <button onClick={() => setEditingLead(viewingLead)} className="px-5 py-2.5 rounded-xl text-sm bg-red-600 text-white font-semibold hover:bg-red-500 transition">
                Edit
              </button>
            </div>
          </div>
        </Modal>
      )}

      {isImportModalOpen && (
        <Modal title="Import CSV" onClose={() => setIsImportModalOpen(false)}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">Upload a CSV file with columns like: Business Name, Category, Phone, Address, Owner, Email, Website URL, Notes</p>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".csv,.tsv" 
              onChange={importCSV} 
              className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border file:border-white/[0.06] file:text-sm file:font-semibold file:bg-black/30 file:text-zinc-300 hover:file:border-zinc-600 transition" 
            />
            <p className="text-[11px] text-zinc-600">Tip: Export first to see the expected format, then import your data in the same structure.</p>
          </div>
        </Modal>
      )}

      {isSearchModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-md" onClick={() => setIsSearchModalOpen(false)}>
          <div className="w-full max-w-xl rounded-2xl border border-white/[0.06] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4" onClick={(e) => e.stopPropagation()} style={{ background: "rgba(14,14,20,0.95)" }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05]">
              <Search className="w-5 h-5 text-zinc-500" />
              <input 
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads..."
                className="flex-1 bg-transparent text-white text-base placeholder-zinc-600 focus:outline-none"
              />
              <kbd className="text-[10px] text-zinc-600 bg-zinc-800/50 px-2 py-1 rounded-md border border-zinc-700/50">ESC</kbd>
            </div>
            <div className="max-h-[40vh] overflow-y-auto p-2">
              {filteredLeads.length === 0 ? (
                <p className="py-8 text-center text-zinc-600 text-sm">Nothing found</p>
              ) : (
                filteredLeads.slice(0, 6).map((lead, i) => (
                  <button 
                    key={lead.id} 
                    onClick={() => { setViewingLead(lead); setIsSearchModalOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition text-left"
                  >
                    <span className="text-lg w-8 text-center">{categoryIcons[lead.category]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{lead.businessName}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{lead.ownerName ? lead.ownerName + " · " : ""}{lead.address}</p>
                    </div>
                    <StatusBadge label={lead.leadStatus} colorMap={leadStatusColors} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Lead Form Component
function LeadForm({ initial, onSave, onCancel }: { initial: Lead; onSave: (l: Lead) => void; onCancel: () => void }) {
  const [lead, setLead] = useState(initial);
  const update = (field: keyof Lead, value: any) => setLead({ ...lead, [field]: value });
  const toggleTag = (tag: string) => {
    const newTags = lead.tags.includes(tag) ? lead.tags.filter((t) => t !== tag) : [...lead.tags, tag];
    update("tags", newTags);
  };

  const inputClass = "w-full bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-red-500/30 transition";
  const labelClass = "block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5";

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(lead); }} className="space-y-4">
      <div>
        <label className={labelClass}>Business Name *</label>
        <input required value={lead.businessName} onChange={(e) => update("businessName", e.target.value)} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Category</label>
          <select value={lead.category} onChange={(e) => update("category", e.target.value)} className={inputClass}>
            {categories.map((c) => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input value={lead.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Address</label>
        <input value={lead.address} onChange={(e) => update("address", e.target.value)} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Owner Name</label>
          <input value={lead.ownerName} onChange={(e) => update("ownerName", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" value={lead.email} onChange={(e) => update("email", e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Website Status</label>
          <select value={lead.websiteStatus} onChange={(e) => update("websiteStatus", e.target.value)} className={inputClass}>
            {websiteStatuses.map((s) => <option key={s} value={s} className="bg-zinc-900">{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Social Status</label>
          <select value={lead.socialStatus} onChange={(e) => update("socialStatus", e.target.value)} className={inputClass}>
            {socialStatuses.map((s) => <option key={s} value={s} className="bg-zinc-900">{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Lead Status</label>
          <select value={lead.leadStatus} onChange={(e) => update("leadStatus", e.target.value)} className={inputClass}>
            {leadStatuses.map((s) => <option key={s} value={s} className="bg-zinc-900">{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Tags</label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTag(t)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition ${lead.tags.includes(t) ? tagColors[t] : "bg-transparent text-zinc-600 border-zinc-800 hover:border-zinc-600"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelClass}>Notes</label>
        <textarea value={lead.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className={inputClass} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm text-zinc-500 border border-white/[0.06] hover:border-zinc-600 transition">Cancel</button>
        <button type="submit" className="px-5 py-2.5 rounded-xl text-sm bg-red-600 text-white font-semibold hover:bg-red-500 transition shadow-lg shadow-red-600/20">Save</button>
      </div>
    </form>
  );
}
