import React from "react";
import { Lead } from "./App";
import {
  leadStatuses,
  leadStatusChartColors,
  categories,
  categoryIcons,
  websiteStatuses,
  websiteStatusColors,
  activityTypes,
  activityIcons,
  calculateLeadScore,
  getLeadScoreColor,
  formatTimeAgo,
} from "./data";

const DonutChart = ({ data, size = 120 }: { data: any[]; size?: number }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  if (!total) return null;

  let currentOffset = 0;
  const radius = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      {data
        .filter((d) => d.value > 0)
        .map((d, i) => {
          const percentage = d.value / total;
          const strokeDashoffset = circumference * (1 - currentOffset);
          currentOffset += percentage;

          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={12}
              strokeDasharray={`${circumference * percentage} ${circumference * (1 - percentage)}`}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${cx} ${cy})`}
              className="transition-all duration-700"
            />
          );
        })}
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-white text-lg font-bold">
        {total}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="fill-zinc-500 text-[10px]">
        total
      </text>
    </svg>
  );
};

const BarChart = ({ data, height = 120 }: { data: any[]; height?: number }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px] text-zinc-500 font-semibold">{d.value || ""}</span>
          <div
            className="w-full rounded-t-md transition-all duration-700"
            style={{
              height: `${(d.value / max) * 100}%`,
              minHeight: d.value ? 4 : 0,
              background: d.color || "#e31937",
            }}
          />
          <span className="text-[8px] text-zinc-600 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard({ leads }: { leads: Lead[] }) {
  const statusData = leadStatuses.map((s) => ({
    label: s.split(" ").map((w) => w[0]).join(""),
    value: leads.filter((l) => l.leadStatus === s).length,
    color: leadStatusChartColors[s],
  }));

  const categoryData = categories
    .filter((c) => leads.some((l) => l.category === c))
    .map((c) => ({
      label: c.split(" / ")[0].slice(0, 6),
      value: leads.filter((l) => l.category === c).length,
      color: "#e31937",
    }));

  const websiteData = websiteStatuses.map((s) => ({
    label: s,
    value: leads.filter((l) => l.websiteStatus === s).length,
    color: s === "None" ? "#ef4444" : s === "Outdated" ? "#eab308" : s === "Basic" ? "#3b82f6" : "#10b981",
  }));

  const totalActivities = leads.reduce((acc, l) => acc + (l.activities || []).length, 0);
  const activityData = activityTypes.map((t) => ({
    label: t.slice(0, 4),
    value: leads.reduce((acc, l) => acc + (l.activities || []).filter((a) => a.type === t).length, 0),
    color: "#e31937",
  }));

  const highPriorityCount = leads.filter((l) => calculateLeadScore(l) >= 7).length;
  const taggedCount = leads.filter((l) => (l.tags || []).length > 0).length;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Leads", v: leads.length, c: "text-white", sub: "in pipeline" },
          { label: "High Priority", v: highPriorityCount, c: "text-red-400", sub: "score 7+" },
          { label: "Total Activities", v: totalActivities, c: "text-blue-400", sub: "logged" },
          { label: "Tagged", v: taggedCount, c: "text-amber-400", sub: `of ${leads.length}` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/[0.04] p-4 bg-zinc-900/50">
            <p className={`text-2xl font-bold ${stat.c}`}>{stat.v}</p>
            <p className="text-[11px] text-zinc-500 font-medium mt-0.5">{stat.label}</p>
            <p className="text-[10px] text-zinc-700">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/[0.04] p-4 bg-zinc-900/50">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Pipeline Status</p>
          <div className="flex items-center gap-4">
            <DonutChart data={statusData} size={100} />
            <div className="space-y-1">
              {statusData.filter((d) => d.value > 0).map((d) => (
                <div key={d.label} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-[11px] text-zinc-400">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.04] p-4 bg-zinc-900/50">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">By Category</p>
          <BarChart data={categoryData} height={100} />
        </div>

        <div className="rounded-xl border border-white/[0.04] p-4 bg-zinc-900/50">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Website Status</p>
          <DonutChart data={websiteData} size={100} />
          <div className="flex gap-3 mt-2 justify-center">
            {websiteData.filter((d) => d.value > 0).map((d) => (
              <div key={d.label} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                <span className="text-[10px] text-zinc-500">{d.label} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {totalActivities > 0 && (
        <div className="rounded-xl border border-white/[0.04] p-4 bg-zinc-900/50">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Activity Breakdown</p>
          <BarChart data={activityData} height={80} />
        </div>
      )}

      <div className="rounded-xl border border-white/[0.04] p-4 bg-zinc-900/50">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Top Priority Leads</p>
        <div className="space-y-2">
          {leads
            .sort((a, b) => calculateLeadScore(b) - calculateLeadScore(a))
            .slice(0, 5)
            .map((lead) => {
              const score = calculateLeadScore(lead);
              return (
                <div key={lead.id} className="flex items-center gap-3 py-1.5">
                  <div className={`text-[10px] font-bold w-6 h-6 rounded-md flex items-center justify-center border ${getLeadScoreColor(score)}`}>
                    {score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 font-medium truncate">{lead.businessName}</p>
                    <p className="text-[10px] text-zinc-600">{lead.category}</p>
                  </div>
                  <div className="flex gap-1">
                    {(lead.tags || []).slice(0, 2).map((tag) => (
                      <span key={tag} className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-zinc-800/50 text-zinc-500 border-zinc-700/50">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
