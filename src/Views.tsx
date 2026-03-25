import React, { useState } from "react";
import { Lead, Activity } from "./App";
import { activityTypes, activityIcons, formatTimeAgo, templates, categoryIcons } from "./data";

export function ActivityLog({ activities, onAdd }: { activities: Activity[]; onAdd: (a: Omit<Activity, "id">) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [type, setType] = useState("Called");
  const [note, setNote] = useState("");

  const handleAdd = () => {
    onAdd({ type, note, date: new Date().toISOString() });
    setNote("");
    setIsAdding(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {["Called", "Emailed", "Texted", "Voicemail"].map((t) => (
          <button
            key={t}
            onClick={() => onAdd({ type: t, note: "", date: new Date().toISOString() })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-black/30 border border-white/[0.05] text-zinc-400 hover:border-red-500/20 hover:text-red-400 transition"
          >
            {activityIcons[t]} {t}
          </button>
        ))}
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-3 py-2 rounded-xl text-xs font-medium text-zinc-500 border border-dashed border-zinc-700 hover:border-zinc-500 transition"
        >
          {isAdding ? "Cancel" : "+ Custom"}
        </button>
      </div>

      {isAdding && (
        <div className="bg-black/20 border border-white/[0.04] rounded-xl p-3 space-y-2 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex gap-1.5 flex-wrap">
            {activityTypes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition ${
                  type === t
                    ? "bg-red-500/15 text-red-400 border-red-500/20"
                    : "text-zinc-600 border-zinc-800 hover:border-zinc-600"
                }`}
              >
                {activityIcons[t]} {t}
              </button>
            ))}
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-black/30 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none"
            placeholder="Note (optional)..."
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2 rounded-lg text-xs bg-red-600 text-white font-semibold hover:bg-red-500 transition"
          >
            Log {type}
          </button>
        </div>
      )}

      {activities.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-6">No activity yet</p>
      ) : (
        <div className="space-y-0.5 relative pl-5">
          {[...activities].reverse().map((a, i) => (
            <div key={a.id} className="flex gap-3 py-2 relative animate-in fade-in slide-in-from-bottom-2">
              <div className="absolute -left-5 top-3 w-2.5 h-2.5 rounded-full bg-zinc-700 border-2 border-zinc-900 z-10" />
              {i < activities.length - 1 && (
                <div className="absolute -left-[14px] top-5 bottom-0 w-px bg-zinc-800" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-300">
                    {activityIcons[a.type]} {a.type}
                  </span>
                  <span className="text-[10px] text-zinc-600">{formatTimeAgo(a.date)}</span>
                </div>
                {a.note && <p className="text-[11px] text-zinc-500 mt-0.5">{a.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TemplatesView({ lead }: { lead: Lead }) {
  const template = templates[lead.category] || templates.Other;
  const [copied, setCopied] = useState("");
  const [tab, setTab] = useState("email");

  const replaceVars = (text: string) => {
    return text
      .replace(/\{\{businessName\}\}/g, lead.businessName || "[Business]")
      .replace(/\{\{ownerName\}\}/g, lead.ownerName || "[Owner]")
      .replace(/\{\{category\}\}/g, lead.category || "[Category]");
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(replaceVars(text)).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(""), 1500);
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-lg">{categoryIcons[lead.category]}</span>
        <span className="text-zinc-300 font-medium">{lead.businessName}</span>
        <span className="text-zinc-600">templates</span>
      </div>

      <div className="flex border-b border-white/[0.04]">
        {["email", "call", "text"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
              tab === t ? "border-red-500 text-white" : "border-transparent text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {t === "call" ? "Call Script" : t === "text" ? "SMS" : "Email"}
          </button>
        ))}
      </div>

      {tab === "email" && (
        <div className="space-y-3">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Subject</p>
            <div className="bg-black/30 rounded-lg border border-white/[0.04] p-3 text-sm text-zinc-300">
              {replaceVars(template.emailSubject)}
            </div>
            <button
              onClick={() => handleCopy(template.emailSubject, "subject")}
              className="text-[10px] text-red-400 mt-1 hover:text-red-300 transition"
            >
              {copied === "subject" ? "Copied!" : "Copy subject"}
            </button>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Body</p>
            <div className="bg-black/30 rounded-lg border border-white/[0.04] p-3 text-sm text-zinc-300 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
              {replaceVars(template.emailBody)}
            </div>
            <button
              onClick={() => handleCopy(template.emailBody, "body")}
              className="text-[10px] text-red-400 mt-1 hover:text-red-300 transition"
            >
              {copied === "body" ? "Copied!" : "Copy body"}
            </button>
          </div>
        </div>
      )}

      {tab === "call" && (
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Phone Script</p>
          <div className="bg-black/30 rounded-lg border border-white/[0.04] p-4 text-sm text-zinc-300 leading-relaxed italic">
            {replaceVars(template.callScript)}
          </div>
          <button
            onClick={() => handleCopy(template.callScript, "call")}
            className="text-[10px] text-red-400 mt-1 hover:text-red-300 transition"
          >
            {copied === "call" ? "Copied!" : "Copy script"}
          </button>
        </div>
      )}

      {tab === "text" && (
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">SMS Template</p>
          <div className="bg-black/30 rounded-lg border border-white/[0.04] p-4 text-sm text-zinc-300 leading-relaxed">
            {replaceVars(template.textMessage)}
          </div>
          <button
            onClick={() => handleCopy(template.textMessage, "sms")}
            className="text-[10px] text-red-400 mt-1 hover:text-red-300 transition"
          >
            {copied === "sms" ? "Copied!" : "Copy SMS"}
          </button>
        </div>
      )}
    </div>
  );
}
