// client/src/Components/Analytics.js
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";
import "./Analytics.css";

import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

// ----- colors to match the mock -----
const COLORS = {
  blue: "#3b82f6",
  green: "#22c55e",
  orange: "#f59e0b",
  red: "#ef4444",
  purple: "#a78bfa",
  slate: "#64748b",
  gray: "#94a3b8",
};

// ----- helpers -----
const parseRetentionDays = (r) => {
  const v = String(r || "").toLowerCase();
  if (v.includes("permanent")) return Infinity;
  if (v.includes("5")) return 365 * 5;
  if (v.includes("3")) return 365 * 3;
  return 365; // default 1 year
};
const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const weekKey = (d) => {
  const dt = new Date(d);
  const onejan = new Date(dt.getFullYear(), 0, 1);
  const week = Math.ceil((((dt - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return `${dt.getFullYear()}-W${String(week).padStart(2,"0")}`;
};
const monthKey = (d) => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`; };

// status from age vs retention + priority
const computeStatus = (rec) => {
  const created = rec?.created_at ? new Date(rec.created_at) : null;
  if (!created) return "Pending";
  const ageDays = (Date.now() - created.getTime()) / 86400000;
  const retentionDays = parseRetentionDays(rec?.retention_period);
  if (retentionDays !== Infinity) {
    const ratio = ageDays / retentionDays;
    if (ratio >= 1) return "Archived";
    if (ratio >= 0.8) return "Completed";
  }
  const pr = String(rec?.priority || "").toLowerCase();
  if (pr === "low") return "Approved";
  return "Pending";
};

// -------- CSV helpers (no deps) --------
const csvEscape = (val) => {
  const s = val == null ? "" : String(val);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const makeCsv = (sections) => {
  // sections: [{title, headers:[..], rows:[[..],..]}]
  let out = "";
  for (const sec of sections) {
    out += `# ${sec.title}\n`;
    if (sec.headers?.length) {
      out += sec.headers.map(csvEscape).join(",") + "\n";
    }
    if (sec.rows?.length) {
      for (const row of sec.rows) out += row.map(csvEscape).join(",") + "\n";
    }
    out += "\n";
  }
  return out;
};
const downloadCsv = (csv, filename) => {
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ---- main component ----
export default function Analytics() {
  const [records, setRecords] = useState([]);
  const [usersCount, setUsersCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seriesMode, setSeriesMode] = useState("Daily"); // Daily | Weekly | Monthly
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const role = user?.role || "user";

  // load records (and users if admin)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const recRes = await axios.get("/records/my-office");
        if (!cancelled) setRecords(Array.isArray(recRes.data) ? recRes.data : []);
        if (role === "admin") {
          try {
            const u = await axios.get("/users");
            if (!cancelled) setUsersCount(Array.isArray(u.data) ? u.data.length : null);
          } catch {
            if (!cancelled) setUsersCount(null);
          }
        } else {
          setUsersCount(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [role]);

  // normalized records with extras
  const rec = useMemo(() => {
    return records.map((r) => {
      const created = r?.created_at ? new Date(r.created_at) : null;
      const hoursOld = created ? Math.max(0, (Date.now() - created.getTime()) / 36e5) : 0;
      return {
        id: r?.id ?? r?.record_id ?? r?.control_number,
        control_number: r?.control_number || "",
        title: r?.title || "",
        created_at: r?.created_at,
        classification: r?.classification || "Others",
        priority: r?.priority || "Normal",
        destination_office: r?.destination_office || "—",
        retention_period: r?.retention_period || "1 Year",
        status: computeStatus(r),
        hoursOld,
      };
    });
  }, [records]);

  // ---- KPI cards ----
  const avgProcessingTimeHrs = useMemo(() => {
    if (rec.length === 0) return 0;
    const sum = rec.reduce((a, b) => a + b.hoursOld, 0);
    return Math.round((sum / rec.length) * 10) / 10;
  }, [rec]);

  const statusCounts = useMemo(() => {
    const m = { Pending: 0, Approved: 0, Completed: 0, Archived: 0 };
    for (const r of rec) m[r.status] = (m[r.status] || 0) + 1;
    return m;
  }, [rec]);

  const totalForRate = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1;
  const approvalRate = Math.round(((statusCounts.Approved || 0) / totalForRate) * 1000) / 10;
  const backlogItems = statusCounts.Pending || 0;

  // ---- Volume trends ----
  const volumeData = useMemo(() => {
    const map = new Map();
    if (seriesMode === "Weekly") {
      for (const r of rec) {
        const key = weekKey(r.created_at);
        map.set(key, (map.get(key) || 0) + 1);
      }
      return Array.from(map.entries()).map(([bucket, received]) => ({ bucket, received }));
    }
    if (seriesMode === "Monthly") {
      for (const r of rec) {
        const key = monthKey(r.created_at);
        map.set(key, (map.get(key) || 0) + 1);
      }
      return Array.from(map.entries()).map(([bucket, received]) => ({ bucket, received }));
    }
    // daily
    for (const r of rec) {
      const key = startOfDay(r.created_at).toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).map(([bucket, received]) => ({ bucket, received }));
  }, [rec, seriesMode]);

  // ---- Office workload (top 3 offices) ----
  const radar = useMemo(() => {
    const byOffice = new Map();
    for (const r of rec) {
      const key = r.destination_office || "—";
      byOffice.set(key, (byOffice.get(key) || 0) + 1);
    }
    const arr = Array.from(byOffice.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    return arr.map(([subject, workload]) => ({ subject, workload }));
  }, [rec]);

  // ---- Processing time (proxy: average age) by classification ----
  const proc = useMemo(() => {
    const sum = new Map(); // class -> [totalHours, count]
    for (const r of rec) {
      const k = r.classification || "Others";
      const val = sum.get(k) || [0, 0];
      val[0] += r.hoursOld;
      val[1] += 1;
      sum.set(k, val);
    }
    const cls = ["Academic", "Administrative", "Financial", "HR", "Others"];
    return cls
      .map((name) => {
        const v = sum.get(name) || [0, 0];
        const hours = v[1] ? v[0] / v[1] : 0;
        return { name, hours: Math.round(hours * 10) / 10 };
      })
      .filter((x) => x.hours > 0);
  }, [rec]);

  // ---- Status distribution for pie (uses our statusCounts) ----
  const pieData = useMemo(
    () => [
      { name: "Pending", value: statusCounts.Pending || 0, color: COLORS.orange },
      { name: "Approved", value: statusCounts.Approved || 0, color: COLORS.green },
      { name: "Completed", value: statusCounts.Completed || 0, color: COLORS.blue },
      { name: "Archived", value: statusCounts.Archived || 0, color: COLORS.slate },
    ],
    [statusCounts]
  );

  // ---- Retention aging bars ----
  const retention = useMemo(() => {
    // buckets by record age
    const buckets = [
      { age: "0-6 months", min: 0, max: 182 },
      { age: "6-12 months", min: 182, max: 365 },
      { age: "1-2 years", min: 365, max: 730 },
      { age: "2+ years", min: 730, max: Infinity },
    ];
    const res = buckets.map((b) => ({ age: b.age, within: 0, near: 0, overdue: 0 }));

    for (const r of rec) {
      const created = r.created_at ? new Date(r.created_at) : null;
      if (!created) continue;
      const ageDays = (Date.now() - created.getTime()) / 86400000;
      const retentionDays = parseRetentionDays(r.retention_period);
      const ratio = retentionDays === Infinity ? 0 : ageDays / retentionDays;

      const idx = res.findIndex((x) => {
        const b = buckets.find((bb) => bb.age === x.age);
        return ageDays >= b.min && ageDays < b.max;
      });
      const row = res[idx >= 0 ? idx : 0];

      if (retentionDays !== Infinity) {
        if (ratio >= 1) row.overdue += 1;
        else if (ratio >= 0.8) row.near += 1;
        else row.within += 1;
      } else row.within += 1;
    }
    return res;
  }, [rec]);

  // ---------- Quick Action: Report builders ----------
  const filterByPeriod = (recordsNorm, period /* 'monthly' | 'yearly' */) => {
    const now = new Date();
    if (period === "yearly") {
      const y = now.getFullYear();
      return recordsNorm.filter((r) => r.created_at && new Date(r.created_at).getFullYear() === y);
    }
    // monthly
    const y = now.getFullYear();
    const m = now.getMonth();
    return recordsNorm.filter((r) => {
      if (!r.created_at) return false;
      const d = new Date(r.created_at);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  };

  const buildSummarySection = (rows, usersCountForCard) => {
    const localStatusCounts = rows.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});
    const total = rows.length || 1;
    const avgHrs = rows.length ? Math.round((rows.reduce((a,b)=>a+b.hoursOld,0)/rows.length)*10)/10 : 0;
    const approval = Math.round(((localStatusCounts.Approved||0) / total) * 1000)/10;

    return {
      title: "Summary",
      headers: ["Metric", "Value"],
      rows: [
        ["Total Records", rows.length],
        ["Avg Processing Time (hrs)", avgHrs],
        ["Approval Rate (%)", approval],
        ["Pending", localStatusCounts.Pending || 0],
        ["Completed (Nearing Disposal)", localStatusCounts.Completed || 0],
        ["Archived (Overdue)", localStatusCounts.Archived || 0],
        ["Active Users", usersCountForCard ?? ""],
      ],
    };
  };

  const buildClassificationSection = (rows) => {
    const map = new Map();
    for (const r of rows) map.set(r.classification, (map.get(r.classification) || 0) + 1);
    return {
      title: "By Classification",
      headers: ["Classification", "Count"],
      rows: Array.from(map.entries()),
    };
  };

  const buildOfficeWorkloadSection = (rows) => {
    const map = new Map();
    for (const r of rows) map.set(r.destination_office, (map.get(r.destination_office) || 0) + 1);
    return {
      title: "Office Workload",
      headers: ["Office", "Documents"],
      rows: Array.from(map.entries()).sort((a,b)=>b[1]-a[1]),
    };
  };

  const buildStatusSection = (rows) => {
    const map = rows.reduce((m, r) => { m[r.status] = (m[r.status] || 0) + 1; return m; }, {});
    return {
      title: "Status Distribution",
      headers: ["Status", "Count"],
      rows: Object.entries(map),
    };
  };

  const buildVolumeSection = (rows, period) => {
    const map = new Map();
    if (period === "yearly") {
      for (const r of rows) {
        const bucket = monthKey(r.created_at);
        map.set(bucket, (map.get(bucket) || 0) + 1);
      }
    } else { // monthly
      for (const r of rows) {
        const bucket = startOfDay(r.created_at).toISOString().slice(0,10);
        map.set(bucket, (map.get(bucket) || 0) + 1);
      }
    }
    return {
      title: period === "yearly" ? "Volume by Month" : "Volume by Day",
      headers: ["Bucket", "Documents Received"],
      rows: Array.from(map.entries()),
    };
  };

  const buildRetentionList = (rows) => {
    // List records nearing disposal or overdue
    const out = [["Control #","Title","Office","Created At","Retention","Status"]];
    for (const r of rows) {
      if (r.status === "Completed" || r.status === "Archived") {
        out.push([r.control_number, r.title, r.destination_office, r.created_at, r.retention_period, r.status]);
      }
    }
    return out;
  };

  const generatePeriodReport = (period /* 'monthly' | 'yearly' */) => {
    const filtered = filterByPeriod(rec, period);
    const sections = [
      buildSummarySection(filtered, usersCount ?? (role === "admin" ? "—" : (user?.email ? 1 : 0))),
      buildVolumeSection(filtered, period),
      buildClassificationSection(filtered),
      buildStatusSection(filtered),
      buildOfficeWorkloadSection(filtered),
    ];
    const csv = makeCsv(sections);
    const stamp = new Date().toISOString().slice(0,10);
    downloadCsv(csv, `${period}-report-${stamp}.csv`);
  };

  const exportAnalyticsCsv = () => {
    // raw records table
    const headers = ["Control #","Title","Classification","Priority","Office","Retention","Status","Created At"];
    const rows = rec.map(r => [
      r.control_number, r.title, r.classification, r.priority,
      r.destination_office, r.retention_period, r.status, r.created_at
    ]);
    const csv = makeCsv([{ title: "All Records (Visible Scope)", headers, rows }]);
    const stamp = new Date().toISOString().slice(0,10);
    downloadCsv(csv, `analytics-data-${stamp}.csv`);
  };

  const exportRetentionSchedule = () => {
    const rows = buildRetentionList(rec);
    const csv = makeCsv([{ title: "Retention Schedule (Nearing & Overdue)", headers: rows[0], rows: rows.slice(1) }]);
    const stamp = new Date().toISOString().slice(0,10);
    downloadCsv(csv, `retention-schedule-${stamp}.csv`);
  };

  const exportReport = () => window.print();

  // ---- UI ----
  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1">
        <Navbar />

        <div className="analytics container-fluid p-3 p-md-4">
          {/* Header */}
          <div className="d-flex align-items-center justify-content-between mb-3 mb-md-4">
            <div>
              <h2 className="page-title mb-0">Analytics Dashboard</h2>
              <div className="text-muted small">
                Comprehensive document tracking and performance metrics
              </div>
            </div>

            <div className="d-flex gap-2">
              <select className="form-select range-select" defaultValue="Last 30 Days" disabled>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
                <option>Last 90 Days</option>
                <option>Year to Date</option>
              </select>
              <button className="btn btn-primary" onClick={exportReport}>
                <span className="me-1">⬇️</span> Export Report
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="row g-3 g-lg-4 mb-3 mb-md-4">
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: "rgba(59,130,246,.12)", color: COLORS.blue }}>📈</div>
                <div className="stat-body">
                  <div className="stat-value">{avgProcessingTimeHrs || 0}hrs</div>
                  <div className="stat-label">Avg Processing Time</div>
                  <div className="stat-trend text-success">+15.3%</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: "rgba(34,197,94,.12)", color: COLORS.green }}>✅</div>
                <div className="stat-body">
                  <div className="stat-value">{approvalRate.toFixed(1)}%</div>
                  <div className="stat-label">Approval Rate</div>
                  <div className="stat-trend text-success">+8.2%</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: "rgba(245,158,11,.12)", color: COLORS.orange }}>⏱️</div>
                <div className="stat-body">
                  <div className="stat-value">{backlogItems}</div>
                  <div className="stat-label">Backlog Items</div>
                  <div className="stat-trend text-danger">-2.1%</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: "rgba(167,139,250,.12)", color: COLORS.purple }}>👤</div>
                <div className="stat-body">
                  <div className="stat-value">{usersCount === null ? (role === "admin" ? "—" : (user?.email ? 1 : 0)) : usersCount}</div>
                  <div className="stat-label">Active Users</div>
                  <div className="stat-trend text-success">+5.7%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Volume + Workload */}
          <div className="row g-3 g-lg-4 mb-3 mb-md-4">
            <div className="col-12 col-lg-7">
              <div className="panel">
                <div className="panel-header">
                  <h5 className="mb-0">Document Volume Trends</h5>
                  <div className="segmented">
                    {["Daily","Weekly","Monthly"].map((m) => (
                      <button
                        key={m}
                        className={`seg-btn ${seriesMode === m ? "active" : ""}`}
                        onClick={() => setSeriesMode(m)}
                        type="button"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="panel-body">
                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <BarChart data={volumeData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="bucket" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="received" name="Documents Received" fill={COLORS.blue} radius={[6,6,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-5">
              <div className="panel">
                <div className="panel-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Office Workload</h5>
                  <a className="link-muted small" href="#!" onClick={(e) => e.preventDefault()}>View Details</a>
                </div>
                <div className="panel-body">
                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <RadarChart data={radar}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis />
                        <Radar name="Workload Distribution" dataKey="workload" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Processing vs Status */}
          <div className="row g-3 g-lg-4 mb-3 mb-md-4">
            <div className="col-12 col-lg-7">
              <div className="panel">
                <div className="panel-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Processing Time Analysis</h5>
                  <select className="form-select form-select-sm w-auto" defaultValue="By…">
                    <option>By…</option>
                  </select>
                </div>
                <div className="panel-body">
                  <div style={{ width: "100%", height: 260 }}>
                    <ResponsiveContainer>
                      <BarChart data={proc} layout="vertical" margin={{ top: 4, right: 16, left: 16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="hours" name="Avg Processing Time (hours)" fill={COLORS.blue} radius={[0,6,6,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-5">
              <div className="panel">
                <div className="panel-header">
                  <h5 className="mb-0">Document Status Distribution</h5>
                </div>
                <div className="panel-body">
                  <div style={{ width: "100%", height: 260 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} dataKey="value" nameKey="name" label>
                          {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Legend verticalAlign="bottom" height={24} />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Retention */}
          <div className="panel mb-3 mb-md-4">
            <div className="panel-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Document Aging & Retention Analysis</h5>
              <a className="link-muted small" href="#!" onClick={(e) => { e.preventDefault(); exportRetentionSchedule(); }}>Schedule Disposal</a>
            </div>
            <div className="panel-body">
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={retention} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="within" name="Within Retention" stackId="a" fill={COLORS.green} />
                    <Bar dataKey="near" name="Nearing Disposal" stackId="a" fill={COLORS.orange} />
                    <Bar dataKey="overdue" name="Overdue" stackId="a" fill={COLORS.red} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bottom row: Top Offices / Alerts / Quick Actions */}
          <div className="row g-3 g-lg-4">
            <div className="col-12 col-lg-4">
              <div className="panel">
                <div className="panel-header"><h5 className="mb-0">Top Performing Offices</h5></div>
                <div className="panel-body">
                  <ul className="list-unstyled mb-0">
                    {(() => {
                      const byOffice = new Map();
                      for (const r of rec) {
                        const key = r.destination_office || "—";
                        const v = byOffice.get(key) || { within: 0, near: 0, overdue: 0, total: 0 };
                        const created = r.created_at ? new Date(r.created_at) : null;
                        const ageDays = created ? (Date.now() - created.getTime()) / 86400000 : 0;
                        const rd = parseRetentionDays(r.retention_period);
                        const ratio = rd === Infinity ? 0 : ageDays / rd;
                        if (rd !== Infinity) {
                          if (ratio >= 1) v.overdue += 1;
                          else if (ratio >= 0.8) v.near += 1;
                          else v.within += 1;
                        } else v.within += 1;
                        v.total += 1;
                        byOffice.set(key, v);
                      }
                      const ranks = Array.from(byOffice.entries())
                        .map(([name, v]) => ({
                          name,
                          completion: v.total ? Math.round(((v.within + v.near) / v.total) * 1000) / 10 : 0,
                        }))
                        .sort((a, b) => b.completion - a.completion)
                        .slice(0, 3);
                      return ranks.map((r, i) => (
                        <li key={r.name} className="top-item">
                          <div className="fw-600">{r.name}</div>
                          <div className="text-muted small">{r.completion}% completion rate</div>
                          <div className={`rank rank-${i + 1}`}>{i + 1}st</div>
                        </li>
                      ));
                    })()}
                  </ul>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-4">
              <div className="panel">
                <div className="panel-header"><h5 className="mb-0">System Alerts</h5></div>
                <div className="panel-body">
                  <div className="alert-card alert-red">
                    <div className="fw-600">⚠️  {retention.reduce((a,b)=>a+b.near,0)} documents nearing disposal</div>
                    <div className="small text-muted">Requires immediate attention</div>
                  </div>
                  <div className="alert-card alert-yellow">
                    <div className="fw-600">📝  {statusCounts.Pending || 0} pending approvals</div>
                    <div className="small text-muted">Review required</div>
                  </div>
                  <div className="alert-card alert-blue">
                    <div className="fw-600">💾  System backup completed</div>
                    <div className="small text-muted">2 hours ago</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-4">
              <div className="panel">
                <div className="panel-header"><h5 className="mb-0">Quick Actions</h5></div>
                <div className="panel-body">
                  <button className="qa-item btn btn-light w-100 text-start" onClick={() => generatePeriodReport("monthly")}>
                    🗓  Generate Monthly Report
                  </button>
                  <button className="qa-item btn btn-light w-100 text-start" onClick={() => generatePeriodReport("yearly")}>
                    📅  Generate Yearly Report
                  </button>
                  <button className="qa-item btn btn-light w-100 text-start" onClick={exportAnalyticsCsv}>
                    📥  Export Analytics Data
                  </button>
                  <button className="qa-item btn btn-light w-100 text-start" onClick={exportRetentionSchedule}>
                    🗂  Manage Retention (CSV)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loading && <div className="text-muted small mt-3">Loading analytics…</div>}
        </div>
      </div>
    </div>
  );
}
