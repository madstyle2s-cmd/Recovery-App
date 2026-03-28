import { useState, useEffect, createContext, useContext } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, doc, updateDoc,
  addDoc, query, where, serverTimestamp
} from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDepNOM2euvmo1f3Iqq3WSVpLZF43YdITw",
  authDomain: "recovery-crm.firebaseapp.com",
  projectId: "recovery-crm",
  storageBucket: "recovery-crm.firebasestorage.app",
  messagingSenderId: "601901209709",
  appId: "1:601901209709:web:b6c8507caeb496db278764"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const ThemeCtx = createContext();

const fmt = n => new Intl.NumberFormat("en-BD").format(parseFloat(n) || 0);
const fmtBDT = n => "৳" + fmt(n);
const recPct = (paid, payoff) => payoff > 0 ? Math.min(((paid / payoff) * 100), 100).toFixed(1) : "0.0";

const STATUS = {
  NEW:       { label: "New",       color: "#818cf8", bg: "rgba(129,140,248,0.15)" },
  CONTACTED: { label: "Contacted", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  PARTIAL:   { label: "Partial",   color: "#06b6d4", bg: "rgba(6,182,212,0.15)"  },
  SETTLED:   { label: "Settled",   color: "#10b981", bg: "rgba(16,185,129,0.15)" },
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toasts({ list }) {
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, display:"flex", flexDirection:"column", gap:10 }}>
      {list.map(t => (
        <div key={t.id} style={{
          padding:"12px 20px", borderRadius:12, fontSize:13, fontWeight:500,
          display:"flex", alignItems:"center", gap:10, maxWidth:320,
          background: t.type==="success" ? "rgba(16,185,129,0.95)" : t.type==="error" ? "rgba(239,68,68,0.95)" : "rgba(99,102,241,0.95)",
          color:"#fff", boxShadow:"0 8px 32px rgba(0,0,0,0.4)",
          animation:"slideInRight 0.3s ease",
        }}>
          {t.type==="success"?"✅":t.type==="error"?"❌":"ℹ️"} {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [err, setErr]     = useState("");
  const [busy, setBusy]   = useState(false);

  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr("");
    try { await signInWithEmailAndPassword(auth, email, pass); }
    catch { setErr("Invalid email or password."); }
    setBusy(false);
  };

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"linear-gradient(135deg,#0f0c29 0%,#1a1560 50%,#24243e 100%)",
      fontFamily:"'Plus Jakarta Sans',sans-serif", padding:20,
    }}>
      <div style={{
        width:"100%", maxWidth:420,
        background:"rgba(255,255,255,0.05)", backdropFilter:"blur(20px)",
        border:"1px solid rgba(255,255,255,0.1)", borderRadius:24,
        padding:"48px 40px", boxShadow:"0 32px 80px rgba(0,0,0,0.5)",
      }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:52, marginBottom:16 }}>💳</div>
          <h1 style={{ fontSize:26, fontWeight:800, color:"#fff", margin:0, letterSpacing:-0.5 }}>Recovery CRM</h1>
          <p style={{ color:"rgba(255,255,255,0.45)", fontSize:14, marginTop:8 }}>Salebird Collection Management</p>
        </div>
        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {[["Email","email",email,setEmail],["Password","password",pass,setPass]].map(([label,type,val,set])=>(
            <div key={label}>
              <label style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.5)", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>{label}</label>
              <input type={type} value={val} onChange={e=>set(e.target.value)} required
                placeholder={type==="email"?"your@email.com":"••••••••"}
                style={{
                  width:"100%", padding:"13px 16px", borderRadius:12,
                  background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)",
                  color:"#fff", fontSize:14, outline:"none", boxSizing:"border-box",
                  fontFamily:"inherit",
                }} />
            </div>
          ))}
          {err && <div style={{ background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.4)", color:"#f87171", padding:"10px 14px", borderRadius:10, fontSize:13 }}>{err}</div>}
          <button type="submit" disabled={busy} style={{
            padding:"14px", background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
            color:"#fff", border:"none", borderRadius:12, fontSize:15, fontWeight:700,
            cursor:busy?"not-allowed":"pointer", marginTop:4, opacity:busy?0.7:1,
            fontFamily:"inherit", boxShadow:"0 8px 24px rgba(99,102,241,0.4)",
          }}>
            {busy ? "Signing in…" : "Sign In →"}
          </button>
        </form>
        <div style={{ marginTop:24, padding:"14px 16px", background:"rgba(255,255,255,0.04)", borderRadius:10, fontSize:12, color:"rgba(255,255,255,0.35)", lineHeight:1.9 }}>
          <div>👔 Manager: manager@recovery-crm.com / manager9999</div>
          <div>👤 Agent: shibly@recovery-crm.com / agent123</div>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV = [
  { id:"dashboard", icon:"🏠", label:"Dashboard" },
  { id:"accounts",  icon:"📋", label:"Accounts"  },
  { id:"payments",  icon:"💰", label:"Payments"  },
  { id:"reports",   icon:"📈", label:"Reports"   },
];

function Sidebar({ page, setPage, user, onLogout, open, setOpen, dark, toggleDark }) {
  return (
    <>
      {open && <div onClick={()=>setOpen(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:98,display:"block" }} />}
      <aside style={{
        width:240, minHeight:"100vh", flexShrink:0,
        background:"linear-gradient(180deg,#1e1b4b 0%,#1a1760 60%,#0f0c29 100%)",
        display:"flex", flexDirection:"column",
        borderRight:"1px solid rgba(255,255,255,0.07)",
        position:"sticky", top:0, height:"100vh",
        ...(window.innerWidth<768 ? {
          position:"fixed", left:open?0:"-100%", top:0, zIndex:99,
          transition:"left 0.25s ease",
        } : {}),
      }}>
        {/* Brand */}
        <div style={{ padding:"28px 20px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, boxShadow:"0 4px 12px rgba(99,102,241,0.4)" }}>💳</div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:"#fff", letterSpacing:-0.3 }}>Recovery CRM</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>Salebird</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"8px 12px", display:"flex", flexDirection:"column", gap:4 }}>
          {NAV.map(n => {
            const active = page === n.id;
            return (
              <button key={n.id} onClick={()=>{ setPage(n.id); setOpen(false); }}
                style={{
                  display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                  borderRadius:12, border:"none", cursor:"pointer", textAlign:"left", width:"100%",
                  fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, fontWeight:active?700:500,
                  background: active ? "linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.2))" : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.5)",
                  borderLeft: active ? "3px solid #818cf8" : "3px solid transparent",
                  transition:"all 0.15s",
                }}>
                <span style={{ fontSize:18 }}>{n.icon}</span>
                {n.label}
                {active && <div style={{ marginLeft:"auto", width:6, height:6, borderRadius:"50%", background:"#818cf8" }} />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding:16, borderTop:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", fontSize:14 }}>
              {(user?.email||"?")[0].toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user?.email?.split("@")[0]}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>Agent</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {[
              { icon: dark?"☀️":"🌙", action: toggleDark, title:"Toggle theme" },
              { icon:"🚪", action: onLogout, title:"Sign out" },
            ].map((b,i) => (
              <button key={i} onClick={b.action} title={b.title} style={{
                flex:1, padding:"9px 0", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)",
                background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.7)", fontSize:17,
                cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
              }}>{b.icon}</button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, gradient }) {
  return (
    <div style={{
      background: gradient || "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.1))",
      border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:"24px 22px",
      position:"relative", overflow:"hidden",
    }}>
      <div style={{ position:"absolute", top:-20, right:-20, fontSize:72, opacity:0.06, lineHeight:1 }}>{icon}</div>
      <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.45)", textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:800, color:"#fff", letterSpacing:-0.5, marginBottom:4 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{sub}</div>}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ accounts, dark }) {
  const C = dark;
  const amex = accounts.filter(a=>a.product==="AMEX");
  const visa = accounts.filter(a=>a.product==="VISA");
  const totalPayoff = accounts.reduce((s,a)=>s+(parseFloat(a.payoff)||0),0);
  const totalPaid   = accounts.reduce((s,a)=>s+(parseFloat(a.paidAmount)||0),0);
  const remaining   = totalPayoff - totalPaid;
  const pct         = recPct(totalPaid, totalPayoff);

  const statusCounts = ["NEW","CONTACTED","PARTIAL","SETTLED"].map(s=>({
    s, count: accounts.filter(a=>(a.status||"NEW")===s).length
  }));

  const distData = Object.entries(
    accounts.reduce((acc,a)=>{ const d=a.District||"Unknown"; acc[d]=(acc[d]||0)+1; return acc; },{})
  ).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const maxDist = Math.max(...distData.map(d=>d[1]),1);

  return (
    <div style={{ padding:"28px 24px 60px" }}>
      <div style={{ marginBottom:28 }}>
        <h2 style={{ fontSize:24, fontWeight:800, color: dark?"#fff":"#1e1b4b", margin:0, letterSpacing:-0.5 }}>Dashboard</h2>
        <p style={{ color: dark?"rgba(255,255,255,0.4)":"rgba(30,27,75,0.5)", fontSize:13, marginTop:4 }}>
          {new Date().toLocaleDateString("en-BD",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16, marginBottom:24 }}>
        <StatCard label="Total Accounts" value={accounts.length} sub={`AMEX ${amex.length} · VISA ${visa.length}`} icon="💳"
          gradient={dark?"linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.12))":"linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.06))"} />
        <StatCard label="Total Payoff" value={fmtBDT(totalPayoff)} sub="Outstanding balance" icon="📊"
          gradient={dark?"linear-gradient(135deg,rgba(239,68,68,0.2),rgba(220,38,38,0.1))":"linear-gradient(135deg,rgba(239,68,68,0.1),rgba(220,38,38,0.05))"} />
        <StatCard label="Total Collected" value={fmtBDT(totalPaid)} sub={`${pct}% recovery`} icon="✅"
          gradient={dark?"linear-gradient(135deg,rgba(16,185,129,0.2),rgba(5,150,105,0.1))":"linear-gradient(135deg,rgba(16,185,129,0.1),rgba(5,150,105,0.05))"} />
        <StatCard label="Remaining" value={fmtBDT(remaining)} sub="Still to collect" icon="⏳"
          gradient={dark?"linear-gradient(135deg,rgba(245,158,11,0.2),rgba(217,119,6,0.1))":"linear-gradient(135deg,rgba(245,158,11,0.1),rgba(217,119,6,0.05))"} />
      </div>

      {/* Charts row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        {/* Status breakdown */}
        <div style={{ background: dark?"rgba(255,255,255,0.04)":"#fff", border:`1px solid ${dark?"rgba(255,255,255,0.08)":"rgba(30,27,75,0.1)"}`, borderRadius:20, padding:24 }}>
          <div style={{ fontSize:14, fontWeight:700, color:dark?"#fff":"#1e1b4b", marginBottom:20 }}>Account Status</div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {statusCounts.map(({s,count})=>{
              const info = STATUS[s];
              const pct = accounts.length > 0 ? (count/accounts.length)*100 : 0;
              return (
                <div key={s}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:13, color:dark?"rgba(255,255,255,0.7)":"rgba(30,27,75,0.7)", fontWeight:500 }}>{info.label}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:info.color }}>{count}</span>
                  </div>
                  <div style={{ height:6, background:dark?"rgba(255,255,255,0.08)":"rgba(30,27,75,0.08)", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:info.color, borderRadius:3, transition:"width 0.6s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top districts */}
        <div style={{ background:dark?"rgba(255,255,255,0.04)":"#fff", border:`1px solid ${dark?"rgba(255,255,255,0.08)":"rgba(30,27,75,0.1)"}`, borderRadius:20, padding:24 }}>
          <div style={{ fontSize:14, fontWeight:700, color:dark?"#fff":"#1e1b4b", marginBottom:20 }}>Top Districts</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {distData.map(([d,count])=>(
              <div key={d} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ fontSize:12, color:dark?"rgba(255,255,255,0.5)":"rgba(30,27,75,0.5)", width:80, flexShrink:0 }}>{d}</div>
                <div style={{ flex:1, height:8, background:dark?"rgba(255,255,255,0.06)":"rgba(30,27,75,0.06)", borderRadius:4, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${(count/maxDist)*100}%`, background:"linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius:4 }} />
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:dark?"#818cf8":"#6366f1", width:24, textAlign:"right" }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product split */}
      <div style={{ background:dark?"rgba(255,255,255,0.04)":"#fff", border:`1px solid ${dark?"rgba(255,255,255,0.08)":"rgba(30,27,75,0.1)"}`, borderRadius:20, padding:24 }}>
        <div style={{ fontSize:14, fontWeight:700, color:dark?"#fff":"#1e1b4b", marginBottom:20 }}>Product Performance</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {[{label:"AMEX",data:amex,color:"#6366f1"},{label:"VISA",data:visa,color:"#06b6d4"}].map(p=>{
            const paid = p.data.reduce((s,a)=>s+(parseFloat(a.paidAmount)||0),0);
            const payoff = p.data.reduce((s,a)=>s+(parseFloat(a.payoff)||0),0);
            const r = recPct(paid,payoff);
            return (
              <div key={p.label} style={{ background:dark?"rgba(255,255,255,0.04)":"rgba(30,27,75,0.03)", borderRadius:14, padding:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:p.color }}>{p.label}</span>
                  <span style={{ fontSize:12, color:dark?"rgba(255,255,255,0.4)":"rgba(30,27,75,0.4)" }}>{p.data.length} accounts</span>
                </div>
                <div style={{ fontSize:22, fontWeight:800, color:dark?"#fff":"#1e1b4b", marginBottom:4 }}>{fmtBDT(paid)}</div>
                <div style={{ fontSize:11, color:dark?"rgba(255,255,255,0.4)":"rgba(30,27,75,0.4)", marginBottom:10 }}>collected of {fmtBDT(payoff)}</div>
                <div style={{ height:6, background:dark?"rgba(255,255,255,0.06)":"rgba(30,27,75,0.06)", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${r}%`, background:p.color, borderRadius:3 }} />
                </div>
                <div style={{ fontSize:12, color:p.color, fontWeight:700, marginTop:6 }}>{r}% recovery</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Account Card ──────────────────────────────────────────────────────────────
function AccountCard({ a, onClick, selected, onSelect, dark }) {
  const st = STATUS[a.status] || STATUS.NEW;
  const r = recPct(a.paidAmount, a.payoff);
  return (
    <div style={{
      background: dark?"rgba(255,255,255,0.04)":"#fff",
      border: selected ? "1.5px solid #818cf8" : `1px solid ${dark?"rgba(255,255,255,0.07)":"rgba(30,27,75,0.1)"}`,
      borderRadius:18, overflow:"hidden", transition:"all 0.2s",
      boxShadow: selected?"0 0 0 3px rgba(129,140,248,0.2)":"none",
      cursor:"pointer",
    }}
      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 12px 32px rgba(0,0,0,${dark?0.3:0.1})`; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow=selected?"0 0 0 3px rgba(129,140,248,0.2)":"none"; }}>
      {/* Top color bar */}
      <div style={{ height:3, background: a.product==="AMEX" ? "linear-gradient(90deg,#6366f1,#8b5cf6)" : "linear-gradient(90deg,#06b6d4,#0891b2)" }} />
      <div style={{ padding:"16px 18px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:12 }}>
          <input type="checkbox" checked={selected} onChange={e=>onSelect(e.target.checked)} onClick={e=>e.stopPropagation()}
            style={{ marginTop:3, accentColor:"#818cf8", width:15, height:15, cursor:"pointer", flexShrink:0 }} />
          <div style={{ flex:1, minWidth:0 }} onClick={onClick}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
              <div style={{ fontSize:14, fontWeight:700, color:dark?"#fff":"#1e1b4b", lineHeight:1.3
