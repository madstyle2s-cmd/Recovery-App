import { useState, useEffect, createContext, useContext } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, doc, updateDoc,
  addDoc, deleteDoc, query, where, orderBy, serverTimestamp
} from "firebase/firestore";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "firebase/auth";

// ── Firebase Config ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDepNOM2euvmo1f3Iqq3WSVpLZF43YdITw",
  authDomain: "recovery-crm.firebaseapp.com",
  projectId: "recovery-crm",
  storageBucket: "recovery-crm.firebasestorage.app",
  messagingSenderId: "601901209709",
  appId: "1:601901209709:web:b6c8507caeb496db278764"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// ── Theme Context ─────────────────────────────────────────────────────────────
const ThemeContext = createContext();
const AppContext = createContext();

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-BD").format(parseFloat(n) || 0);
const fmtBDT = (n) => "৳" + fmt(n);
const recovery = (paid, payoff) => payoff > 0 ? ((paid / payoff) * 100).toFixed(1) : "0.0";

const STATUS_COLORS = {
  NEW: { bg: "var(--tag-blue-bg)", color: "var(--tag-blue)" },
  CONTACTED: { bg: "var(--tag-yellow-bg)", color: "var(--tag-yellow)" },
  PARTIAL: { bg: "var(--tag-orange-bg)", color: "var(--tag-orange)" },
  SETTLED: { bg: "var(--tag-green-bg)", color: "var(--tag-green)" },
  DEFAULT: { bg: "var(--tag-blue-bg)", color: "var(--tag-blue)" },
};

const BD_DISTRICTS = [
  "All Districts","Bagerhat","Barguna","Barishal","Bhola","Bogra","Brahmanbaria",
  "Chandpur","Chattogram","Chuadanga","Cox's Bazar","Cumilla","Dhaka","Dinajpur",
  "Faridpur","Feni","Gaibandha","Gazipur","Gopalganj","Habiganj","Jamalpur",
  "Jashore","Jhalokati","Jhenaidah","Joypurhat","Khagrachhari","Khulna","Kishoreganj",
  "Kurigram","Kushtia","Lakshmipur","Lalmonirhat","Madaripur","Magura","Manikganj",
  "Meherpur","Moulvibazar","Munshiganj","Mymensingh","Naogaon","Narail","Narayanganj",
  "Narsingdi","Natore","Netrokona","Nilphamari","Noakhali","Pabna","Panchagarh",
  "Patuakhali","Pirojpur","Rajbari","Rajshahi","Rangamati","Rangpur","Satkhira",
  "Shariatpur","Sherpur","Sirajganj","Sunamganj","Sylhet","Tangail","Thakurgaon"
];

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.type === "success" ? "✅" : t.type === "error" ? "❌" : "ℹ️"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Login Page ────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const { dark } = useContext(ThemeContext);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch {
      setErr("Invalid email or password. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className={`login-page ${dark ? "dark" : "light"}`}>
      <div className="login-card">
        <div className="login-logo">
          <div className="login-icon">💳</div>
          <h1>Recovery CRM</h1>
          <p>Salebird Collection Management</p>
        </div>
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)}
              placeholder="••••••••" required />
          </div>
          {err && <div className="login-err">{err}</div>}
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>
        <div className="login-hint">
          <div>Manager: manager@recovery-crm.com</div>
          <div>Agent: shibly@recovery-crm.com</div>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ page, setPage, user, onLogout, mobileOpen, setMobileOpen }) {
  const { dark, toggleTheme } = useContext(ThemeContext);
  const nav = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "accounts", icon: "📋", label: "Accounts" },
    { id: "payments", icon: "💰", label: "Payments" },
    { id: "reports", icon: "📈", label: "Reports" },
  ];
  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="brand-icon">💳</span>
            <div>
              <div className="brand-name">Recovery CRM</div>
              <div className="brand-sub">Salebird</div>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {nav.map(n => (
            <button key={n.id}
              className={`nav-item ${page === n.id ? "active" : ""}`}
              onClick={() => { setPage(n.id); setMobileOpen(false); }}>
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.email?.[0]?.toUpperCase()}</div>
            <div>
              <div className="user-name">{user?.displayName || user?.email?.split("@")[0]}</div>
              <div className="user-role">Agent</div>
            </div>
          </div>
          <div className="sidebar-actions">
            <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
              {dark ? "☀️" : "🌙"}
            </button>
            <button className="icon-btn" onClick={onLogout} title="Sign out">🚪</button>
          </div>
        </div>
      </aside>
    </>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card" style={{ "--accent": accent }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      <div className="stat-bar"><div className="stat-bar-fill" /></div>
    </div>
  );
}

// ── Mini Bar Chart ────────────────────────────────────────────────────────────
function BarChart({ data, title }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>
      <div className="bar-chart">
        {data.map((d, i) => (
          <div key={i} className="bar-item">
            <div className="bar-track">
              <div className="bar-fill" style={{ height: `${(d.value / max) * 100}%` }} />
            </div>
            <div className="bar-label">{d.label}</div>
            <div className="bar-val">{d.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutChart({ segments, title }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  let offset = 0;
  const r = 40, circ = 2 * Math.PI * r;
  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>
      <div className="donut-wrap">
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r={r} fill="none" stroke="var(--border)" strokeWidth="14" />
          {segments.map((s, i) => {
            const dash = (s.value / total) * circ;
            const gap = circ - dash;
            const el = (
              <circle key={i} cx="55" cy="55" r={r} fill="none"
                stroke={s.color} strokeWidth="14"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offset}
                style={{ transform: "rotate(-90deg)", transformOrigin: "55px 55px" }} />
            );
            offset += dash;
            return el;
          })}
          <text x="55" y="58" textAnchor="middle" fontSize="14" fontWeight="700"
            fill="var(--text)">{total}</text>
        </svg>
        <div className="donut-legend">
          {segments.map((s, i) => (
            <div key={i} className="legend-item">
              <span className="legend-dot" style={{ background: s.color }} />
              <span>{s.label}</span>
              <span className="legend-val">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────────────
function DashboardPage({ accounts }) {
  const amex = accounts.filter(a => a.product === "AMEX");
  const visa = accounts.filter(a => a.product === "VISA");
  const totalLimit = accounts.reduce((s, a) => s + (parseFloat(a.limit) || 0), 0);
  const totalPayoff = accounts.reduce((s, a) => s + (parseFloat(a.payoff) || 0), 0);
  const totalPaid = accounts.reduce((s, a) => s + (parseFloat(a.paidAmount) || 0), 0);
  const totalRemaining = totalPayoff - totalPaid;
  const recPct = recovery(totalPaid, totalPayoff);

  const statusCounts = ["NEW","CONTACTED","PARTIAL","SETTLED"].map(s => ({
    label: s, value: accounts.filter(a => (a.status||"NEW") === s).length,
    color: Object.values(STATUS_COLORS)[["NEW","CONTACTED","PARTIAL","SETTLED"].indexOf(s)]?.color || "#888"
  }));

  const districtData = Object.entries(
    accounts.reduce((acc, a) => {
      const d = a["District"] || "Unknown";
      acc[d] = (acc[d] || 0) + 1; return acc;
    }, {})
  ).sort((a,b) => b[1]-a[1]).slice(0,6).map(([label,value]) => ({ label: label.slice(0,8), value }));

  return (
    <div className="page-content">
      <div className="page-header">
        <h2 className="page-title">Dashboard</h2>
        <div className="page-date">{new Date().toLocaleDateString("en-BD", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}</div>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Accounts" value={accounts.length}
          sub={`AMEX: ${amex.length} · VISA: ${visa.length}`} accent="var(--accent-blue)" />
        <StatCard label="Total Payoff" value={fmtBDT(totalPayoff)}
          sub="Outstanding balance" accent="var(--accent-red)" />
        <StatCard label="Total Collected" value={fmtBDT(totalPaid)}
          sub={`${recPct}% recovery rate`} accent="var(--accent-green)" />
        <StatCard label="Remaining" value={fmtBDT(totalRemaining)}
          sub="Still to collect" accent="var(--accent-orange)" />
      </div>

      <div className="charts-grid">
        <DonutChart title="Account Status" segments={statusCounts} />
        <BarChart title="Top Districts" data={districtData} />
        <div className="chart-card product-split">
          <div className="chart-title">Product Split</div>
          <div className="product-bars">
            {[{label:"AMEX",data:amex,color:"var(--accent-blue)"},{label:"VISA",data:visa,color:"var(--accent-green)"}].map(p => (
              <div key={p.label} className="product-row">
                <div className="product-name">{p.label}</div>
                <div className="product-track">
                  <div className="product-fill" style={{
                    width: `${(p.data.length/accounts.length)*100}%`,
                    background: p.color
                  }} />
                </div>
                <div className="product-count">{p.data.length}</div>
              </div>
            ))}
          </div>
          <div className="product-recovery">
            {[{label:"AMEX",data:amex},{label:"VISA",data:visa}].map(p => {
              const paid = p.data.reduce((s,a) => s+(parseFloat(a.paidAmount)||0),0);
              const payoff = p.data.reduce((s,a) => s+(parseFloat(a.payoff)||0),0);
              return (
                <div key={p.label} className="recovery-row">
                  <span>{p.label} Recovery</span>
                  <span className="recovery-pct">{recovery(paid,payoff)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Account Card ──────────────────────────────────────────────────────────────
function AccountCard({ account, onClick, selected, onSelect }) {
  const s = STATUS_COLORS[account.status] || STATUS_COLORS.DEFAULT;
  const rec = recovery(account.paidAmount, account.payoff);
  return (
    <div className={`account-card ${selected ? "selected" : ""}`}>
      <div className="card-check">
        <input type="checkbox" checked={selected} onChange={e => onSelect(e.target.checked)}
          onClick={e => e.stopPropagation()} />
      </div>
      <div className="card-body" onClick={onClick}>
        <div className="card-top">
          <div className="card-name">{(account["A/C Name"] || "").trim()}</div>
          <span className="status-tag" style={{ background: s.bg, color: s.color }}>
            {account.status || "NEW"}
          </span>
        </div>
        <div className="card-meta">
          <span>🆔 {account["Customer ID"]}</span>
          <span>📍 {account["District"] || "—"}</span>
          <span className={`product-badge ${(account.product||"").toLowerCase()}`}>
            {account.product}
          </span>
        </div>
        <div className="card-financials">
          <div className="fin-item">
            <span className="fin-label">Payoff</span>
            <span className="fin-value">{fmtBDT(account.payoff)}</span>
          </div>
          <div className="fin-item">
            <span className="fin-label">Collected</span>
            <span className="fin-value collected">{fmtBDT(account.paidAmount)}</span>
          </div>
          <div className="fin-item">
            <span className="fin-label">Recovery</span>
            <span className="fin-value">{rec}%</span>
          </div>
        </div>
        <div className="rec-bar-wrap">
          <div className="rec-bar">
            <div className="rec-fill" style={{ width: `${Math.min(parseFloat(rec),100)}%` }} />
          </div>
        </div>
        {account["Next Follow Up"] && (
          <div className="followup-tag">⏰ Follow-up: {account["Next Follow Up"]}</div>
        )}
      </div>
    </div>
  );
}

// ── Account Detail Modal ──────────────────────────────────────────────────────
function AccountModal({ account, onClose, onSave, addToast }) {
  const [tab, setTab] = useState("info");
  const [editData, setEditData] = useState({ ...account });
  const [saving, setSaving] = useState(false);
  const [payAmt, setPayAmt] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payNote, setPayNote] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteCat, setNoteCat] = useState("Call");
  const [callOutcome, setCallOutcome] = useState("Answered");
  const [callDuration, setCallDuration] = useState("");
  const [callNotes, setCallNotes] = useState("");
  const [payments, setPayments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [callLogs, setCallLogs] = useState([]);

  useEffect(() => {
    loadSubcollections();
  }, [account.id]);

  const loadSubcollections = async () => {
    try {
      const [pSnap, nSnap, cSnap] = await Promise.all([
        getDocs(query(collection(db, "payments"), where("accountId", "==", account.id))),
        getDocs(query(collection(db, "notes"), where("accountId", "==", account.id))),
        getDocs(query(collection(db, "callLogs"), where("accountId", "==", account.id))),
      ]);
      setPayments(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setNotes(nSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCallLogs(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "accounts", account.id), {
        ...editData,
        status: editData.status,
        "Agent Name": editData["Agent Name"],
        "Next Follow Up": editData["Next Follow Up"],
      });
      onSave({ ...account, ...editData });
      addToast("Account updated!", "success");
    } catch { addToast("Failed to save", "error"); }
    setSaving(false);
  };

  const addPayment = async () => {
    if (!payAmt) return;
    setSaving(true);
    try {
      const newPaid = (parseFloat(account.paidAmount) || 0) + parseFloat(payAmt);
      await updateDoc(doc(db, "accounts", account.id), { paidAmount: newPaid });
      await addDoc(collection(db, "payments"), {
        accountId: account.id, customerId: account["Customer ID"],
        accountName: account["A/C Name"], product: account.product,
        amount: parseFloat(payAmt), date: payDate, note: payNote,
        agentName: account["Agent Name"], createdAt: serverTimestamp()
      });
      onSave({ ...account, paidAmount: newPaid });
      setPayAmt(""); setPayNote("");
      await loadSubcollections();
      addToast(`Payment of ${fmtBDT(payAmt)} added!`, "success");
    } catch { addToast("Failed to add payment", "error"); }
    setSaving(false);
  };

  const addNote = async () => {
    if (!noteText) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "notes"), {
        accountId: account.id, customerId: account["Customer ID"],
        category: noteCat, content: noteText,
        date: new Date().toISOString().split("T")[0], createdAt: serverTimestamp()
      });
      setNoteText("");
      await loadSubcollections();
      addToast("Note saved!", "success");
    } catch { addToast("Failed to save note", "error"); }
    setSaving(false);
  };

  const addCallLog = async () => {
    setSaving(true);
    try {
      await addDoc(collection(db, "callLogs"), {
        accountId: account.id, customerId: account["Customer ID"],
        outcome: callOutcome, duration: callDuration, notes: callNotes,
        date: new Date().toISOString().split("T")[0], createdAt: serverTimestamp()
      });
      setCallDuration(""); setCallNotes("");
      await loadSubcollections();
      addToast("Call logged!", "success");
    } catch { addToast("Failed to log call", "error"); }
    setSaving(false);
  };

  const phone = (account["Customer Phone"] || "").replace(/\D/g, "").replace(/^880/, "0");
  const waPhone = (account["Customer Phone"] || "").replace(/\D/g, "").replace(/^0/, "880");

  const tabs = ["info","edit","payment","notes","calls"];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-name">{(account["A/C Name"] || "").trim()}</div>
            <div className="modal-meta">
              ID: {account["Customer ID"]} · {account.product} · {account["District"]}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-quick-actions">
          {phone && <a href={`tel:${phone}`} className="qbtn qbtn-call">📞 Call</a>}
          {waPhone && (
            <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noreferrer"
              className="qbtn qbtn-wa">💬 WhatsApp</a>
          )}
        </div>

        <div className="modal-tabs">
          {tabs.map(t => (
            <button key={t} className={`modal-tab ${tab===t?"active":""}`}
              onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {tab === "info" && (
            <div className="info-grid">
              <InfoRow label="A/C Number" value={account["A/C Number"]} />
              <InfoRow label="Customer ID" value={account["Customer ID"]} />
              <InfoRow label="Card Number" value={account["Card Number"]} />
              <InfoRow label="Phone" value={account["Customer Phone"]} />
              <InfoRow label="District" value={account["District"]} />
              <InfoRow label="Job" value={account["Job Profile"]} />
              <InfoRow label="Status" value={account.status} />
              <InfoRow label="Agent" value={account["Agent Name"]} />
              <InfoRow label="Supervisor" value={account["Supervisor Name"]} />
              <InfoRow label="Contactable" value={account["Contactable"]} />
              <InfoRow label="Limit" value={fmtBDT(account.limit)} />
              <InfoRow label="Payoff" value={fmtBDT(account.payoff)} />
              <InfoRow label="Paid" value={fmtBDT(account.paidAmount)} />
              <InfoRow label="Recovery" value={recovery(account.paidAmount, account.payoff) + "%"} />
              <InfoRow label="Write-Off Date" value={account["Write Off Date"]} />
              <InfoRow label="Settlement Amt" value={account["Settlement Amount"] || "—"} />
              <InfoRow label="Nature of Suit" value={account["Nature of Suit"] || "—"} />
              <InfoRow label="Case No" value={account["Case No"] || "—"} />
              <div className="info-full"><strong>Present Address:</strong><br />{account["Present Address"]}</div>
              <div className="info-full"><strong>Permanent Address:</strong><br />{account["Permanent Address"]}</div>
              {account["Last Update"] && <div className="info-full"><strong>Last Update:</strong><br />{account["Last Update"]}</div>}
            </div>
          )}

          {tab === "edit" && (
            <div className="edit-form">
              {[
                ["Status", "status", "select", ["NEW","CONTACTED","PARTIAL","SETTLED"]],
                ["Agent Name", "Agent Name", "text"],
                ["Next Follow Up", "Next Follow Up", "date"],
                ["Settlement Amount", "Settlement Amount", "number"],
                ["Customer Phone", "Customer Phone", "text"],
                ["District", "District", "select", BD_DISTRICTS.slice(1)],
                ["Contactable", "Contactable", "select", ["Contactable","Not Contactable"]],
                ["Notes", "Notes", "textarea"],
              ].map(([label, key, type, opts]) => (
                <div key={key} className="edit-field">
                  <label>{label}</label>
                  {type === "select" ? (
                    <select value={editData[key] || ""} onChange={e => setEditData({...editData, [key]: e.target.value})}>
                      {opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : type === "textarea" ? (
                    <textarea value={editData[key] || ""} onChange={e => setEditData({...editData,[key]:e.target.value})} rows={3}/>
                  ) : (
                    <input type={type} value={editData[key] || ""} onChange={e => setEditData({...editData,[key]:e.target.value})} />
                  )}
                </div>
              ))}
              <button className="btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving…" : "✅ Save Changes"}
              </button>
            </div>
          )}

          {tab === "payment" && (
            <div className="payment-tab">
              <div className="payment-summary">
                <div className="ps-item"><span>Payoff</span><strong>{fmtBDT(account.payoff)}</strong></div>
                <div className="ps-item"><span>Collected</span><strong className="green">{fmtBDT(account.paidAmount)}</strong></div>
                <div className="ps-item"><span>Remaining</span><strong className="red">{fmtBDT((account.payoff||0)-(account.paidAmount||0))}</strong></div>
              </div>
              <div className="edit-form">
                <div className="edit-field">
                  <label>Payment Amount (BDT)</label>
                  <input type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} placeholder="Enter amount" />
                </div>
                <div className="edit-field">
                  <label>Payment Date</label>
                  <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
                </div>
                <div className="edit-field">
                  <label>Note (optional)</label>
                  <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="e.g. bKash, Cash" />
                </div>
                <button className="btn-primary" onClick={addPayment} disabled={saving || !payAmt}>
                  {saving ? "Saving…" : "💰 Add Payment"}
                </button>
              </div>
              {payments.length > 0 && (
                <div className="history-list">
                  <div className="history-title">Payment History</div>
                  {payments.sort((a,b)=>b.date>a.date?1:-1).map(p => (
                    <div key={p.id} className="history-item">
                      <span className="hi-date">{p.date}</span>
                      <span className="hi-amt green">{fmtBDT(p.amount)}</span>
                      {p.note && <span className="hi-note">{p.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "notes" && (
            <div className="notes-tab">
              <div className="edit-form">
                <div className="edit-field">
                  <label>Category</label>
                  <select value={noteCat} onChange={e => setNoteCat(e.target.value)}>
                    {["Call","Visit","Email","SMS","WhatsApp","Other"].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="edit-field">
                  <label>Note</label>
                  <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3} placeholder="Write your note here..." />
                </div>
                <button className="btn-primary" onClick={addNote} disabled={saving || !noteText}>
                  {saving ? "Saving…" : "📝 Save Note"}
                </button>
              </div>
              {notes.length > 0 && (
                <div className="history-list">
                  {notes.sort((a,b)=>b.date>a.date?1:-1).map(n => (
                    <div key={n.id} className="history-item">
                      <span className="hi-date">{n.date}</span>
                      <span className="hi-cat">{n.category}</span>
                      <span className="hi-note">{n.content}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "calls" && (
            <div className="calls-tab">
              <div className="edit-form">
                <div className="edit-field">
                  <label>Outcome</label>
                  <select value={callOutcome} onChange={e => setCallOutcome(e.target.value)}>
                    {["Answered","No Answer","Busy","Wrong Number","Switched Off"].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="edit-field">
                  <label>Duration (minutes)</label>
                  <input type="number" value={callDuration} onChange={e => setCallDuration(e.target.value)} placeholder="e.g. 5" />
                </div>
                <div className="edit-field">
                  <label>Notes</label>
                  <textarea value={callNotes} onChange={e => setCallNotes(e.target.value)} rows={2} placeholder="What was discussed?" />
                </div>
                <button className="btn-primary" onClick={addCallLog} disabled={saving}>
                  {saving ? "Saving…" : "📞 Log Call"}
                </button>
              </div>
              {callLogs.length > 0 && (
                <div className="history-list">
                  {callLogs.sort((a,b)=>b.date>a.date?1:-1).map(c => (
                    <div key={c.id} className="history-item">
                      <span className="hi-date">{c.date}</span>
                      <span className={`hi-outcome outcome-${c.outcome?.replace(/\s/g,"-").toLowerCase()}`}>{c.outcome}</span>
                      {c.duration && <span className="hi-note">{c.duration} min</span>}
                      {c.notes && <span className="hi-note">{c.notes}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value || "—"}</span>
    </div>
  );
}

// ── Accounts Page ─────────────────────────────────────────────────────────────
function AccountsPage({ accounts, setAccounts, addToast }) {
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [district, setDistrict] = useState("All Districts");
  const [selected, setSelected] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [bulkStatus, setBulkStatus] = useState("CONTACTED");
  const [showBulk, setShowBulk] = useState(false);

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || (a["A/C Name"]||"").toLowerCase().includes(q)
      || (a["Customer ID"]||"").includes(q)
      || (a["Customer Phone"]||"").includes(q)
      || (a["District"]||"").toLowerCase().includes(q);
    const matchProduct = product === "ALL" || a.product === product;
    const matchStatus = status === "ALL" || (a.status||"NEW") === status;
    const matchDistrict = district === "All Districts" || a["District"] === district;
    return matchSearch && matchProduct && matchStatus && matchDistrict;
  });

  const toggleSelect = (id, val) => {
    setSelected(val ? [...selected, id] : selected.filter(x => x !== id));
  };

  const bulkUpdate = async () => {
    try {
      await Promise.all(selected.map(id => updateDoc(doc(db,"accounts",id),{ status: bulkStatus })));
      setAccounts(accounts.map(a => selected.includes(a.id) ? { ...a, status: bulkStatus } : a));
      setSelected([]); setShowBulk(false);
      addToast(`Updated ${selected.length} accounts to ${bulkStatus}`, "success");
    } catch { addToast("Bulk update failed", "error"); }
  };

  const exportCSV = () => {
    const keys = ["A/C Name","Customer ID","Product Name","District","Status","Customer Phone","limit","payoff","paidAmount","Next Follow Up","Agent Name"];
    const rows = [keys.join(","), ...filtered.map(a => keys.map(k => `"${(a[k]||"").toString().replace(/"/g,'""')}"`).join(","))];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `accounts_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    addToast("CSV exported!", "success");
  };

  const uniqueDistricts = ["All Districts", ...new Set(accounts.map(a => a["District"]).filter(Boolean).sort())];

  return (
    <div className="page-content">
      <div className="page-header">
        <h2 className="page-title">Accounts <span className="count-badge">{filtered.length}</span></h2>
        <div className="header-actions">
          {selected.length > 0 && (
            <button className="btn-secondary" onClick={() => setShowBulk(true)}>
              ⚡ Bulk ({selected.length})
            </button>
          )}
          <button className="btn-secondary" onClick={exportCSV}>📤 Export</button>
        </div>
      </div>

      <div className="filters-bar">
        <input className="search-input" placeholder="🔍 Search name, ID, phone, district…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select value={product} onChange={e => setProduct(e.target.value)}>
          <option value="ALL">All Products</option>
          <option value="AMEX">AMEX</option>
          <option value="VISA">VISA</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="ALL">All Status</option>
          {["NEW","CONTACTED","PARTIAL","SETTLED"].map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={district} onChange={e => setDistrict(e.target.value)}>
          {uniqueDistricts.map(d=><option key={d}>{d}</option>)}
        </select>
      </div>

      {selected.length > 0 && (
        <div className="selection-bar">
          {selected.length} account(s) selected
          <button onClick={() => setSelected([])}>✕ Clear</button>
        </div>
      )}

      <div className="accounts-grid">
        {filtered.length === 0 ? (
          <div className="empty-state">No accounts found. Try adjusting your filters.</div>
        ) : filtered.map(a => (
          <AccountCard key={a.id} account={a}
            selected={selected.includes(a.id)}
            onSelect={v => toggleSelect(a.id, v)}
            onClick={() => setActiveAccount(a)} />
        ))}
      </div>

      {showBulk && (
        <div className="modal-overlay" onClick={() => setShowBulk(false)}>
          <div className="modal small-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-name">Bulk Update ({selected.length} accounts)</div>
              <button className="modal-close" onClick={() => setShowBulk(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="edit-field">
                <label>Set Status To</label>
                <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
                  {["NEW","CONTACTED","PARTIAL","SETTLED"].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <button className="btn-primary" onClick={bulkUpdate}>⚡ Apply to {selected.length} Accounts</button>
            </div>
          </div>
        </div>
      )}

      {activeAccount && (
        <AccountModal account={activeAccount} onClose={() => setActiveAccount(null)}
          addToast={addToast}
          onSave={updated => {
            setAccounts(accounts.map(a => a.id === updated.id ? updated : a));
            setActiveAccount(updated);
          }} />
      )}
    </div>
  );
}

// ── Payments Page ─────────────────────────────────────────────────────────────
function PaymentsPage({ accounts }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, "payments")).then(snap => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const total = payments.reduce((s,p) => s + (parseFloat(p.amount)||0), 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <h2 className="page-title">Payments <span className="count-badge">{payments.length}</span></h2>
        <div className="total-collected">Total: {fmtBDT(total)}</div>
      </div>
      {loading ? <div className="loading">Loading payments…</div> : (
        payments.length === 0 ? (
          <div className="empty-state">No payments recorded yet. Open an account and add a payment!</div>
        ) : (
          <div className="payments-table-wrap">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Date</th><th>Account Name</th><th>Product</th>
                  <th>Amount</th><th>Agent</th><th>Note</th>
                </tr>
              </thead>
              <tbody>
                {payments.sort((a,b)=>b.date>a.date?1:-1).map(p => (
                  <tr key={p.id}>
                    <td>{p.date}</td>
                    <td>{p.accountName}</td>
                    <td><span className={`product-badge ${(p.product||"").toLowerCase()}`}>{p.product}</span></td>
                    <td className="amount-cell">{fmtBDT(p.amount)}</td>
                    <td>{p.agentName}</td>
                    <td className="note-cell">{p.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

// ── Reports Page ──────────────────────────────────────────────────────────────
function ReportsPage({ accounts }) {
  const byAgent = Object.entries(
    accounts.reduce((acc, a) => {
      const agent = a["Agent Name"] || "Unassigned";
      if (!acc[agent]) acc[agent] = { count: 0, paid: 0, payoff: 0 };
      acc[agent].count++;
      acc[agent].paid += parseFloat(a.paidAmount) || 0;
      acc[agent].payoff += parseFloat(a.payoff) || 0;
      return acc;
    }, {})
  ).sort((a,b) => b[1].paid - a[1].paid);

  const byDistrict = Object.entries(
    accounts.reduce((acc, a) => {
      const d = a["District"] || "Unknown";
      if (!acc[d]) acc[d] = { count: 0, paid: 0 };
      acc[d].count++;
      acc[d].paid += parseFloat(a.paidAmount) || 0;
      return acc;
    }, {})
  ).sort((a,b) => b[1].paid - a[1].paid).slice(0,10);

  return (
    <div className="page-content">
      <div className="page-header">
        <h2 className="page-title">Reports</h2>
      </div>
      <div className="reports-grid">
        <div className="report-card">
          <div className="report-title">Agent Performance</div>
          <table className="report-table">
            <thead><tr><th>Agent</th><th>Accounts</th><th>Collected</th><th>Recovery%</th></tr></thead>
            <tbody>
              {byAgent.map(([agent, data]) => (
                <tr key={agent}>
                  <td>{agent}</td>
                  <td>{data.count}</td>
                  <td className="amount-cell">{fmtBDT(data.paid)}</td>
                  <td>
                    <div className="mini-progress">
                      <div className="mini-fill" style={{width:`${Math.min(recovery(data.paid,data.payoff),100)}%`}}/>
                    </div>
                    <span>{recovery(data.paid,data.payoff)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="report-card">
          <div className="report-title">District-wise Collection</div>
          <table className="report-table">
            <thead><tr><th>District</th><th>Accounts</th><th>Collected</th></tr></thead>
            <tbody>
              {byDistrict.map(([dist, data]) => (
                <tr key={dist}>
                  <td>{dist}</td>
                  <td>{data.count}</td>
                  <td className="amount-cell">{fmtBDT(data.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
function MainApp() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const { dark } = useContext(ThemeContext);

  const addToast = (msg, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false); });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    getDocs(collection(db, "accounts")).then(snap => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDataLoading(false);
    });
  }, [user]);

  if (authLoading) return <div className={`splash ${dark?"dark":"light"}`}><div className="splash-icon">💳</div><div>Loading…</div></div>;
  if (!user) return <LoginPage />;

  return (
    <div className={`app-shell ${dark ? "dark" : "light"}`}>
      <Sidebar page={page} setPage={setPage} user={user}
        onLogout={() => signOut(auth)}
        mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className="main-content">
        <div className="mobile-topbar">
          <button className="hamburger" onClick={() => setMobileOpen(true)}>☰</button>
          <span className="mobile-title">Recovery CRM</span>
          <span />
        </div>
        {dataLoading ? (
          <div className="loading-screen">
            <div className="loading-icon">💳</div>
            <div>Loading accounts from Firebase…</div>
          </div>
        ) : (
          <>
            {page === "dashboard" && <DashboardPage accounts={accounts} />}
            {page === "accounts" && <AccountsPage accounts={accounts} setAccounts={setAccounts} addToast={addToast} />}
            {page === "payments" && <PaymentsPage accounts={accounts} />}
            {page === "reports" && <ReportsPage accounts={accounts} />}
          </>
        )}
      </main>
      <Toast toasts={toasts} />
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") !== "light");
  const toggleTheme = () => setDark(d => { localStorage.setItem("theme", d ? "light" : "dark"); return !d; });
  return (
    <ThemeContext.Provider value={{ dark, toggleTheme }}>
      <MainApp />
    </ThemeContext.Provider>
  );
}
