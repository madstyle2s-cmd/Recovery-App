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
              <div style={{ fontSize:14, fontWeight:700, color:dark?"#fff":"#1e1b4b", lineHeight:1.3 }}>{(a["A/C Name"]||"").trim()}</div>
              <span style={{ fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:20, background:st.bg, color:st.color, whiteSpace:"nowrap", flexShrink:0 }}>{st.label}</span>
            </div>
          </div>
        </div>

        <div onClick={onClick}>
          <div style={{ display:"flex", gap:12, fontSize:12, color:dark?"rgba(255,255,255,0.4)":"rgba(30,27,75,0.45)", marginBottom:14, flexWrap:"wrap" }}>
            <span>🆔 {a["Customer ID"]}</span>
            <span>📍 {a.District||"—"}</span>
            <span style={{
              fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:6,
              background: a.product==="AMEX"?"rgba(99,102,241,0.15)":"rgba(6,182,212,0.15)",
              color: a.product==="AMEX"?"#818cf8":"#06b6d4",
            }}>{a.product}</span>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
            {[["Payoff",fmtBDT(a.payoff),"#fff"],["Collected",fmtBDT(a.paidAmount),"#10b981"],["Recovery%",r+"%","#818cf8"]].map(([l,v,c])=>(
              <div key={l} style={{ background:dark?"rgba(255,255,255,0.04)":"rgba(30,27,75,0.04)", borderRadius:10, padding:"8px 10px" }}>
                <div style={{ fontSize:9, color:dark?"rgba(255,255,255,0.35)":"rgba(30,27,75,0.4)", textTransform:"uppercase", marginBottom:3, letterSpacing:0.3 }}>{l}</div>
                <div style={{ fontSize:13, fontWeight:700, color:dark?c:l==="Collected"?"#059669":l==="Recovery%"?"#4f46e5":"#1e1b4b" }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ height:5, background:dark?"rgba(255,255,255,0.06)":"rgba(30,27,75,0.06)", borderRadius:3, overflow:"hidden", marginBottom:a["Next Follow Up"]?10:0 }}>
            <div style={{ height:"100%", width:`${r}%`, borderRadius:3, background:"linear-gradient(90deg,#6366f1,#8b5cf6)", transition:"width 0.5s" }} />
          </div>

          {a["Next Follow Up"] && (
            <div style={{ fontSize:11, color:"#f59e0b", background:"rgba(245,158,11,0.1)", padding:"5px 10px", borderRadius:8, marginTop:8, display:"inline-block" }}>
              ⏰ Follow-up: {a["Next Follow Up"]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Account Modal ─────────────────────────────────────────────────────────────
function AccountModal({ a, onClose, onSave, addToast, dark }) {
  const [tab, setTab]       = useState("info");
  const [edit, setEdit]     = useState({...a});
  const [busy, setBusy]     = useState(false);
  const [payments, setPays] = useState([]);
  const [notes, setNotes]   = useState([]);
  const [calls, setCalls]   = useState([]);
  const [payAmt, setPayAmt] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payNote, setPayNote] = useState("");
  const [noteTxt, setNoteTxt] = useState("");
  const [noteCat, setNoteCat] = useState("Call");
  const [callOut, setCallOut] = useState("Answered");
  const [callDur, setCallDur] = useState("");
  const [callNts, setCallNts] = useState("");

  useEffect(()=>{ loadSubs(); },[a.id]);

  const loadSubs = async () => {
    try {
      const [p,n,c] = await Promise.all([
        getDocs(query(collection(db,"payments"),  where("accountId","==",a.id))),
        getDocs(query(collection(db,"notes"),     where("accountId","==",a.id))),
        getDocs(query(collection(db,"callLogs"),  where("accountId","==",a.id))),
      ]);
      setPays(p.docs.map(d=>({id:d.id,...d.data()})));
      setNotes(n.docs.map(d=>({id:d.id,...d.data()})));
      setCalls(c.docs.map(d=>({id:d.id,...d.data()})));
    } catch{}
  };

  const saveEdit = async () => {
    setBusy(true);
    try {
      await updateDoc(doc(db,"accounts",a.id), edit);
      onSave({...a,...edit}); addToast("Account updated!","success");
    } catch { addToast("Save failed","error"); }
    setBusy(false);
  };

  const addPay = async () => {
    if(!payAmt) return; setBusy(true);
    try {
      const newPaid = (parseFloat(a.paidAmount)||0)+parseFloat(payAmt);
      await updateDoc(doc(db,"accounts",a.id),{paidAmount:newPaid});
      await addDoc(collection(db,"payments"),{
        accountId:a.id, customerId:a["Customer ID"], accountName:a["A/C Name"],
        product:a.product, amount:parseFloat(payAmt), date:payDate, note:payNote,
        agentName:a["Agent Name"], createdAt:serverTimestamp()
      });
      onSave({...a,paidAmount:newPaid}); setPayAmt(""); setPayNote("");
      await loadSubs(); addToast(`৳${fmt(payAmt)} payment added!`,"success");
    } catch { addToast("Failed","error"); }
    setBusy(false);
  };

  const addNote = async () => {
    if(!noteTxt) return; setBusy(true);
    try {
      await addDoc(collection(db,"notes"),{
        accountId:a.id, customerId:a["Customer ID"], category:noteCat,
        content:noteTxt, date:new Date().toISOString().split("T")[0], createdAt:serverTimestamp()
      });
      setNoteTxt(""); await loadSubs(); addToast("Note saved!","success");
    } catch { addToast("Failed","error"); }
    setBusy(false);
  };

  const addCall = async () => {
    setBusy(true);
    try {
      await addDoc(collection(db,"callLogs"),{
        accountId:a.id, customerId:a["Customer ID"], outcome:callOut,
        duration:callDur, notes:callNts, date:new Date().toISOString().split("T")[0], createdAt:serverTimestamp()
      });
      setCallDur(""); setCallNts(""); await loadSubs(); addToast("Call logged!","success");
    } catch { addToast("Failed","error"); }
    setBusy(false);
  };

  const phone = (a["Customer Phone"]||"").replace(/\D/g,"").replace(/^880/,"0");
  const waNum = (a["Customer Phone"]||"").replace(/\D/g,"").replace(/^0/,"880");

  const S = { // styles
    input: { width:"100%", padding:"11px 14px", borderRadius:10,
      background:dark?"rgba(255,255,255,0.07)":"rgba(30,27,75,0.05)",
      border:`1px solid ${dark?"rgba(255,255,255,0.1)":"rgba(30,27,75,0.12)"}`,
      color:dark?"#fff":"#1e1b4b", fontSize:13, outline:"none",
      fontFamily:"'Plus Jakarta Sans',sans-serif", boxSizing:"border-box" },
    label: { fontSize:11, fontWeight:700, color:dark?"rgba(255,255,255,0.45)":"rgba(30,27,75,0.5)", textTransform:"uppercase", letterSpacing:0.5, marginBottom:5, display:"block" },
    btn: { padding:"12px 20px", borderRadius:12, border:"none", cursor:"pointer",
      background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff",
      fontSize:14, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif", width:"100%",
      boxShadow:"0 4px 16px rgba(99,102,241,0.3)", opacity:busy?0.6:1 },
    field: { marginBottom:14 },
  };

  const tabs = ["info","edit","payment","notes","calls"];
  const tabLabels = { info:"📋 Info", edit:"✏️ Edit", payment:"💰 Payment", notes:"📝 Notes", calls:"📞 Calls" };

  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)",
      zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16,
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:"100%", maxWidth:580, maxHeight:"90vh",
        background: dark?"linear-gradient(135deg,#1e1b4b,#1a1a2e)":"#f8f8ff",
        border:`1px solid ${dark?"rgba(255,255,255,0.1)":"rgba(30,27,75,0.1)"}`,
        borderRadius:24, overflow:"hidden", display:"flex", flexDirection:"column",
        boxShadow:"0 32px 80px rgba(0,0,0,0.5)",
        animation:"modalPop 0.2s ease",
      }}>
        {/* Header */}
        <div style={{ padding:"20px 24px 0", borderBottom:`1px solid ${dark?"rgba(255,255,255,0.07)":"rgba(30,27,75,0.07)"}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:17, fontWeight:800, color:dark?"#fff":"#1e1b4b" }}>{(a["A/C Name"]||"").trim()}</div>
              <div style={{ fontSize:12, color:dark?"rgba(255,255,255,0.4)":"rgba(30,27,75,0.4)", marginTop:3 }}>
                ID: {a["Customer ID"]} · {a.product} · {a.District}
              </div>
            </div>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:10, border:"none", background:dark?"rgba(255,255,255,0.08)":"rgba(30,27,75,0.08)", color:dark?"rgba(255,255,255,0.6)":"rgba(30,27,75,0.6)", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
          </div>
          {/* Quick actions */}
          <div style={{ display:"flex", gap:10, marginBottom:14 }}>
            {phone && <a href={`tel:${phone}`} style={{ padding:"7px 16px", borderRadius:10, fontSize:13, fontWeight:600, background:"rgba(99,102,241,0.15)", color:"#818cf8", border:"1px solid rgba(99,102,241,0.25)", textDecoration:"none" }}>📞 Call</a>}
            {waNum && <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer" style={{ padding:"7px 16px", borderRadius:10, fontSize:13, fontWeight:600, background:"rgba(16,185,129,0.15)", color:"#10b981", border:"1px solid rgba(16,185,129,0.25)", textDecoration:"none" }}>💬 WhatsApp</a>}
          </div>
          {/* Tabs */}
          <div style={{ display:"flex", gap:0, overflowX:"auto" }}>
            {tabs.map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{
                padding:"10px 14px", border:"none", borderBottom:`2px solid ${tab===t?"#818cf8":"transparent"}`,
                background:"transparent", color:tab===t?"#818cf8":dark?"rgba(255,255,255,0.4)":"rgba(30,27,75,0.4)",
                fontSize:13, fontWeight:tab===t?700:500, cursor:"pointer", whiteSpace:"nowrap",
                fontFamily:"'Plus Jakarta Sans',sans-serif", transition:"all 0.15s",
              }}>{tabLabels[t]}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:24 }}>

          {/* INFO */}
          {tab==="info" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                ["A/C Number",a["A/C Number"]], ["Customer ID",a["Customer ID"]],
                ["Card Number",a["Card Number"]], ["Phone",a["Customer Phone"]],
                ["District",a.District], ["Job",a["Job Profile"]],
                ["Status",a.status], ["Agent",a["Agent Name"]],
                ["Supervisor",a["Supervisor Name"]], ["Contactable",a.Contactable],
                ["Limit",fmtBDT(a.limit)], ["Payoff",fmtBDT(a.payoff)],
                ["Paid",fmtBDT(a.paidAmount)], ["Recovery%",recPct(a.paidAmount,a.payoff)+"%"],
                ["Write-Off Date",a["Write Off Date"]], ["Settlement Amt",a["Settlement Amount"]||"—"],
                ["Nature of Suit",a["Nature of Suit"]||"—"], ["Case No",a["Case No"]||"—"],
              ].map(([l,v])=>(
                <div key={l} style={{ background:dark?"rgba(255,255,255,0.04)":"rgba(30,27,75,0.03)", borderRadius:12, padding:"10px 14px" }}>
                  <div style={{ fontSize:10, color:dark?"rgba(255,255,255,0.35)":"rgba(30,27,75,0.4)", textTransform:"uppercase", letterSpacing:0.5, marginBottom:3 }}>{l}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:dark?"#e0e7ff":"#1e1b4b" }}>{v||"—"}</div>
                </div>
              ))}
              {[["Present Address",a["Present Address"]],["Permanent Address",a["Permanent Address"]],["Last Update",a["Last Update"]]].filter(([,v])=>v).map(([l,v])=>(
                <div key={l} style={{ gridColumn:"1/-1", background:dark?"rgba(255,255,255,0.04)":"rgba(30,27,75,0.03)", borderRadius:12, padding:"10px 14px" }}>
                  <div style={{ fontSize:10, color:dark?"rgba(255,255,255,0.35)":"rgba(30,27,75,0.4)", textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 }}>{l}</div>
                  <div style={{ fontSize:13, color:dark?"#c7d2fe":"#3730a3", lineHeight:1.6 }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* EDIT */}
          {tab==="edit" && (
            <div>
              {[
                ["Status","status","select",["NEW","CONTACTED","PARTIAL","SETTLED"]],
                ["Agent Name","Agent Name","text"],
                ["Next Follow Up","Next Follow Up","date"],
                ["Settlement Amount","Settlement Amount","number"],
                ["Customer Phone","Customer Phone","text"],
                ["Contactable","Contactable","select",["Contactable","Not Contactable"]],
                ["Notes","Notes","textarea"],
              ].map(([label,key,type,opts])=>(
                <div key={key} style={S.field}>
                  <label style={S.label}>{label}</label>
                  {type==="select" ? (
                    <select value={edit[key]||""} onChange={e=>setEdit({...edit,[key]:e.target.value})} style={{...S.input}}>
                      {opts.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : type==="textarea" ? (
                    <textarea value={edit[key]||""} onChange={e=>setEdit({...edit,[key]:e.target.value})} rows={3} style={{...S.input,resize:"vertical"}} />
                  ) : (
                    <input type={type} value={edit[key]||""} onChange={e=>setEdit({...edit,[key]:e.target.value})} style={S.input} />
                  )}
                </div>
              ))}
              <button onClick={saveEdit} disabled={busy} style={S.btn}>{busy?"Saving…":"✅ Save Changes"}</button>
            </div>
          )}

          {/* PAYMENT */}
          {tab==="payment" && (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
                {[["Payoff",fmtBDT(a.payoff),"#ef4444"],["Collected",fmtBDT(a.paidAmount),"#10b981"],["Remaining",fmtBDT((parseFloat(a.payoff)||0)-(parseFloat(a.paidAmount)||0)),"#f59e0b"]].map(([l,v,c])=>(
                  <div key={l} style={{ background:dark?"rgba(255,255,255,0.04)":"rgba(30,27,75,0.03)", borderRadius:14, padding:14, textAlign:"center" }}>
                    <div style={{ fontSize:10, color:dark?"rgba(255,255,255,0.4)":"rgba(30,27,75,0.4)", textTransform:"uppercase", marginBottom:5 }}>{l}</div>
                    <div style={{ fontSize:16, fontWeight:800, color:c }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={S.field}><label style={S.label}>Amount (BDT)</label><input type="number" value={payAmt} onChange={e=>setPayAmt(e.target.value)} style={S.input} placeholder="Enter amount" /></div>
              <div style={S.field}><label style={S.label}>Date</label><input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)} style={S.input} /></div>
              <div style={S.field}><label style={S.label}>Note (bKash, Cash, etc.)</label><input type="text" value={payNote} onChange={e=>setPayNote(e.target.value)} style={S.input} placeholder="Optional" /></div>
              <button onClick={addPay} disabled={busy||!payAmt} style={S.btn}>💰 Add Payment</button>
              {payments.length>0 && (
                <div style={{ marginTop:20 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:dark?"rgba(255,255,255,0.4)":"rgba(30,27,75,0.4)", textTransform:"uppercase", marginBottom:10, letterSpacing:0.5 }}>Payment History</div>
                  {payments.sort((a,b)=>b.date>a.date?1:-1).map(p=>(
                    <div key={p.id} style={{ display:"flex", gap:10, padding:"10px 14px", background:dark?"rgba(255,255,255,0.04)":"rgba(30,27,75,0.03)", borderRadius:10, marginBottom:8, alignItems:"center" }}>
                      <span style={{ fontSize:12, color:dark?"rgba(255,255,255,0.4)":"rgba(30,27,75,0.4)" }}>{p.date}</span>
                      <span style={{ fontWeight:700, color:"#10b981", marginLeft:"auto" }}>+{fmtBDT(p.amount)}</span>
                      {p.note&&<span style={{ fontSize:12, color:dark?"rgba(255,255,255,0.4)":"rgba(30,27,75,0.4)" }}>{p.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NOTES */}
          {tab==="notes" && (
            <div>
              <div style={S.field}><label style={S.label}>Category</label>
                <select value={noteCat} onChange={e=>setNoteCat(e.target.value)} style={S.input}>
                  {["Call","Visit","Email","SMS","WhatsApp","Other"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={S.field}><label style={S.label}>Note</label><textarea value={noteTxt} onChange={e=>setNoteTxt(e.target.value)} rows={3} style={{...S.input,resize:"vertical"}} placeholder="Write your note…" /></div>
              <button onClick={addNote} disabled={busy||!noteTxt} style={S.btn}>📝 Save Note</button>
              {notes.length>0 && (
                <div style={{ marginTop:20 }}>
                  {notes.sort((a,b)=>b.date>a.date?1:-1).map(n=>(
                    <div key={n.id} style={{ padding:"12px 14px", background:dark?"rgba(255,255,255,0.04)":"rgba(30,27,75,0.03)", borderRadius:10, marginBottom:8 }}>
                      <div style={{ display:"flex", gap:8, marginBottom:6 }}>
                        <span style={{ fontSize:11, background:"rgba(99,102,241,0.15)", color:"#818cf8", padding:"2px 8px", borderRadius:6, fontWeight:600 }}>{n.category}</span>
                        <span style={{ fontSize:11, color:dark?"rgba(255,255,255,0.35)":"rgba(30,27,75,0.35)" }}>{n.date}</span>
                      </div>
                      <div style={{ fontSize:13, color:dark?"#c7d2fe":"#3730a3", lineHeight:1.5 }}>{n.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CALLS */}
          {tab==="calls" && (
            <div>
              <div style={S.field}><label style={S.label}>Outcome</label>
                <select value={callOut} onChange={e=>setCallOut(e.target.value)} style={S.input}>
                  {["Answered","No Answer","Busy","Wrong Number","Switched Off"].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div style={S.field}><label style={S.label}>Duration (minutes)</label><input type="number" value={callDur} onChange={e=>setCallDur(e.target.value)} style={S.input} placeholder="e.g. 5" /></div>
              <div style={S.field}><label style={S.label}>Notes</label><textarea value={callNts} onChange={e=>setCallNts(e.target.value)} rows={2} style={{...S.input,resize:"vertical"}} placeholder="What was discussed?" /></div>
              <button onClick={addCall} disabled={busy} style={S.btn}>📞 Log Call</button>
              {calls.length>0 && (
                <div style={{ marginTop:20 }}>
                  {calls.sort((a,b)=>b.date>a.date?1:-1).map(c=>{
                    const oc = {Answered:"#10b981","No Answer":"#ef4444",Busy:"#f59e0b","Wrong Number":"#6b7280","Switched Off":"#6b7280"};
                    return (
                      <div key={c.id} style={{ padding:"12px 14px", background:dark?"rgba(255,255,255,0.04)":"rgba(30,27,75,0.03)", borderRadius:10, marginBottom:8 }}>
                        <div style={{ display:"flex", gap:8, marginBottom:c.notes?6:0, alignItems:"center" }}>
                          <span style={{ fontSize:11, background:`${oc[c.outcome]||"#6b7280"}22`, color:oc[c.outcome]||"#6b7280", padding:"2px 8px", borderRadius:6, fontWeight:700 }}>{c.outcome}</span>
                          <span style={{ fontSize:11, color:dark?"rgba(255,255,255,0.35)":"rgba(30,27,75,0.35)" }}>{c.date}</span>
                          {c.duration&&<span style={{ fontSize:11, color:dark?"rgba(255,255,255,0.35)":"rgba(30,27,75,0.35)", marginLeft:"auto" }}>{c.duration} min</span>}
                        </div>
                        {c.notes&&<div style={{ fontSize:13, color:dark?"#c7d2fe":"#3730a3" }}>{c.notes}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Accounts Page ─────────────────────────────────────────────────────────────
function Accounts({ accounts, setAccounts, addToast, dark }) {
  const [q, setQ]           = useState("");
  const [product, setProd]  = useState("ALL");
  const [status, setStat]   = useState("ALL");
  const [district, setDist] = useState("ALL");
  const [selected, setSel]  = useState([]);
  const [active, setActive] = useState(null);
  const [bulkStat, setBulkStat] = useState("CONTACTED");
  const [showBulk, setShowBulk] = useState(false);

  const filtered = accounts.filter(a=>{
    const lo = q.toLowerCase();
    return (!q || (a["A/C Name"]||"").toLowerCase().includes(lo)||(a["Customer ID"]||"").includes(lo)||(a["Customer Phone"]||"").includes(lo)||(a.District||"").toLowerCase().includes(lo))
      && (product==="ALL"||a.product===product)
      && (status==="ALL"||(a.status||"NEW")===status)
      && (district==="ALL"||a.District===district);
  });

  const districts = ["ALL",...new Set(accounts.map(a=>a.District).filter(Boolean).sort())];

  const exportCSV = () => {
    const keys = ["A/C Name","Customer ID","Product Name","District","Status","Customer Phone","limit","payoff","paidAmount","Next Follow Up","Agent Name"];
    const rows = [keys.join(","),...filtered.map(a=>keys.map(k=>`"${(a[k]||"").toString().replace(/"/g,'""')}"`).join(","))];
    const blob = new Blob([rows.join("\n")],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a"); el.href=url; el.download=`accounts_${Date.now()}.csv`; el.click();
    addToast("CSV exported!","success");
  };

  const bulkUpdate = async () => {
    try {
      await Promise.all(selected.map(id=>updateDoc(doc(db,"accounts",id),{status:bulkStat})));
      setAccounts(accounts.map(a=>selected.includes(a.id)?{...a,status:bulkStat}:a));
      setSel([]); setShowBulk(false); addToast(`${selected.length} accounts updated`,"success");
    } catch { addToast("Bulk update failed","error"); }
  };

  const inp = { padding:"10px 16px", borderRadius:12, fontSize:13, outline:"none", fontFamily:"'Plus Jakarta Sans',sans-serif", boxSizing:"border-box",
    background:dark?"rgba(255,255,255,0.06)":"#fff",
    border:`1px solid ${dark?"rgba(255,255,255,0.1)":"rgba(30,27,75,0.15)"}`,
    color:dark?"#fff":"#1e1b4b" };

  return (
    <div style={{ padding:"28px 24px 60px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontSize:24, fontWeight:800, color:dark?"#fff":"#1e1b4b", margin:0, letterSpacing:-0.5, display:"flex", alignItems:"center", gap:10 }}>
            Accounts
            <span style={{ fontSize:13, fontWeight:700, padding:"3px 12px", borderRadius:20, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff" }}>{filtered.length}</span>
          </h2>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {selected.length>0 && <button onClick={()=>setShowBulk(true)} style={{ padding:"9px 16px", borderRadius:10, border:"none", background:"rgba(99,102,241,0.2)", color:"#818cf8", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>⚡ Bulk ({selected.length})</button>}
          <button onClick={exportCSV} style={{ padding:"9px 16px", borderRadius:10, border:`1px solid ${dark?"rgba(255,255,255,0.12)":"rgba(30,27,75,0.15)"}`, background:dark?"rgba(255,255,255,0.06)":"#fff", color:dark?"#fff":"#1e1b4b", fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>📤 Export</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="🔍 Search name, ID, phone, district…" style={{...inp, flex:1, minWidth:200}} />
        {[["product",product,setProd,["ALL","AMEX","VISA"]],["status",status,setStat,["ALL","NEW","CONTACTED","PARTIAL","SETTLED"]],["district",district,setDist,districts]].map(([key,val,set,opts])=>(
          <select key={key} value={val} onChange={e=>set(e.target.value)} style={{...inp, cursor:"pointer"}}>
            {opts.map(o=><option key={o} value={o}>{key==="product"&&o==="ALL"?"All Products":key==="status"&&o==="ALL"?"All Status":key==="district"&&o==="ALL"?"All Districts":o}</option>)}
          </select>
        ))}
      </div>

      {selected.length>0 && (
        <div style={{ background:"linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.1))", border:"1px solid rgba(99,102,241,0.3)", borderRadius:12, padding:"10px 16px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:13, color:"#818cf8", fontWeight:600 }}>
          {selected.length} account(s) selected
          <button onClick={()=>setSel([])} style={{ background:"rgba(99,102,241,0.2)", border:"none", color:"#818cf8", borderRadius:8, padding:"4px 12px", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>✕ Clear</button>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
        {filtered.length===0
          ? <div style={{ gridColumn:"1/-1", textAlign:"center", padding:60, color:dark?"rgba(255,255,255,0.3)":"rgba(30,27,75,0.3)", fontSize:14 }}>No accounts found. Try adjusting filters.</div>
          : filtered.map(a=>(
            <AccountCard key={a.id} a={a} dark={dark} selected={selected.includes(a.id)}
              onSelect={v=>setSel(v?[...selected,a.id]:selected.filter(x=>x!==a.id))}
              onClick={()=>setActive(a)} />
          ))}
      </div>

      {showBulk && (
        <div onClick={()=>setShowBulk(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
          <div onClick={e=>e.stopPropagation()} style={{ width:"100%",maxWidth:380,background:dark?"linear-gradient(135deg,#1e1b4b,#1a1a2e)":"#f8f8ff",border:`1px solid ${dark?"rgba(255,255,255,0.1)":"rgba(30,27,75,0.1)"}`,borderRadius:20,padding:28,boxShadow:"0 24px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ fontSize:17, fontWeight:800, color:dark?"#fff":"#1e1b4b", marginBottom:6 }}>Bulk Update</div>
            <div style={{ fontSize:13, color:dark?"rgba(255,255,255,0.4)":"rgba(30,27,75,0.4)", marginBottom:20 }}>{selected.length} accounts selected</div>
            <label style={{ fontSize:11, fontWeight:700, color:dark?"rgba(255,255,255,0.45)":"rgba(30,27,75,0.5)", textTransform:"uppercase", letterSpacing:0.5, marginBottom:6, display:"block" }}>Set Status To</label>
            <select value={bulkStat} onChange={e=>setBulkStat(e.target.value)} style={{ width:"100%", padding:"11px 14px", borderRadius:10, background:dark?"rgba(255,255,255,0.07)":"rgba(30,27,75,0.05)", border:`1px solid ${dark?"rgba(255,255,255,0.1)":"rgba(30,27,75,0.12)"}`, color:dark?"#fff":"#1e1b4b", fontSize:13, marginBottom:20, fontFamily:"inherit" }}>
              {["NEW","CONTACTED","PARTIAL","SETTLED"].map(s=><option key={s}>{s}</option>)}
            </select>
            <button onClick={bulkUpdate} style={{ width:"100%", padding:"12px", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", border:"none", borderRadius:12, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>⚡ Apply to {selected.length} Accounts</button>
          </div>
        </div>
      )}

      {active && <AccountModal a={active} dark={dark} onClose={()=>setActive(null)} addToast={addToast}
        onSave={u=>{ setAccounts(accounts.map(a=>a.id===u.id?u:a)); setActive(u); }} />}
    </div>
  );
}

// ── Payments Page ─────────────────────────────────────────────────────────────
function Payments({ dark }) {
  const [pays, setPays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    getDocs(collection(db,"payments")).then(s=>{ setPays(s.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); });
  },[]);

  const total = pays.reduce((s,p)=>s+(parseFloat(p.amount)||0),0);

  const th = { padding:"11px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:dark?"rgba(255,255,255,0.4)":"rgba(30,27,75,0.4)", textTransform:"uppercase", letterSpacing:0.5, borderBottom:`1px solid ${dark?"rgba(255,255,255,0.07)":"rgba(30,27,75,0.07)"}` };
  const td = { padding:"13px 16px", fontSize:13, color:dark?"#e0e7ff":"#1e1b4b", borderBottom:`1px solid ${dark?"rgba(255,255,255,0.04)":"rgba(30,27,75,0.05)"}` };

  return (
    <div style={{ padding:"28px 24px 60px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ fontSize:24, fontWeight:800, color:dark?"#fff":"#1e1b4b", margin:0, letterSpacing:-0.5, display:"flex", alignItems:"center", gap:10 }}>
          Payments <span style={{ fontSize:13, fontWeight:700, padding:"3px 12px", borderRadius:20, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff" }}>{pays.length}</span>
        </h2>
        <div style={{ fontSize:18, fontWeight:800, color:"#10b981" }}>Total: {fmtBDT(total)}</div>
      </div>
      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:dark?"rgba(255,255,255,0.3)":"rgba(30,27,75,0.3)" }}>Loading payments…</div>
      ) : pays.length===0 ? (
        <div style={{ textAlign:"center", padding:80, color:dark?"rgba(255,255,255,0.3)":"rgba(30,27,75,0.3)", fontSize:14 }}>No payments yet. Open an account and add a payment!</div>
      ) : (
        <div style={{ background:dark?"rgba(255,255,255,0.03)":"#fff", border:`1px solid ${dark?"rgba(255,255,255,0.07)":"rgba(30,27,75,0.1)"}`, borderRadius:20, overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>{["Date","Account","Product","Amount","Agent","Note"].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {pays.sort((a,b)=>b.date>a.date?1:-1).map(p=>(
                  <tr key={p.id} style={{ transition:"background 0.15s" }}
                    onMouseEnter={e=>e.currentTarget.style.background=dark?"rgba(255,255,255,0.03)":"rgba(30,27,75,0.02)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={td}>{p.date}</td>
                    <td style={td}>{p.accountName}</td>
                    <td style={td}><span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:6, background:p.product==="AMEX"?"rgba(99,102,241,0.15)":"rgba(6,182,212,0.15)", color:p.product==="AMEX"?"#818cf8":"#06b6d4" }}>{p.product}</span></td>
                    <td style={{...td, fontWeight:800, color:"#10b981"}}>{fmtBDT(p.amount)}</td>
                    <td style={td}>{p.agentName||"—"}</td>
                    <td style={{...td, color:dark?"rgba(255,255,255,0.35)":"rgba(30,27,75,0.4)"}}>{p.note||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reports Page ──────────────────────────────────────────────────────────────
function Reports({ accounts, dark }) {
  const byAgent = Object.entries(
    accounts.reduce((acc,a)=>{ const ag=a["Agent Name"]||"Unassigned"; if(!acc[ag])acc[ag]={count:0,paid:0,payoff:0}; acc[ag].count++; acc[ag].paid+=parseFloat(a.paidAmount)||0; acc[ag].payoff+=parseFloat(a.payoff)||0; return acc; },{})
  ).sort((a,b)=>b[1].paid-a[1].paid);

  const byDist = Object.entries(
    accounts.reduce((acc,a)=>{ const d=a.District||"Unknown"; if(!acc[d])acc[d]={count:0,paid:0}; acc[d].count++; acc[d].paid+=parseFloat(a.paidAmount)||0; return acc; },{})
  ).sort((a,b)=>b[1].paid-a[1].paid).slice(0,10);

  const cardStyle = { background:dark?"rgba(255,255,255,0.03)":"#fff", border:`1px solid ${dark?"rgba(255,255,255,0.07)":"rgba(30,27,75,0.1)"}`, borderRadius:20, padding:24, marginBottom:20 };
  const th = { padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700, color:dark?"rgba(255,255,255,0.4)":"rgba(30,27,75,0.4)", textTransform:"uppercase", letterSpacing:0.5, borderBottom:`1px solid ${dark?"rgba(255,255,255,0.07)":"rgba(30,27,75,0.07)"}` };
  const td = { padding:"12px 14px", fontSize:13, color:dark?"#e0e7ff":"#1e1b4b", borderBottom:`1px solid ${dark?"rgba(255,255,255,0.04)":"rgba(30,27,75,0.04)"}` };

  return (
    <div style={{ padding:"28px 24px 60px" }}>
      <h2 style={{ fontSize:24, fontWeight:800, color:dark?"#fff":"#1e1b4b", margin:"0 0 24px", letterSpacing:-0.5 }}>Reports</h2>
      <div style={cardStyle}>
        <div style={{ fontSize:15, fontWeight:700, color:dark?"#fff":"#1e1b4b", marginBottom:16 }}>👤 Agent Performance</div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>{["Agent","Accounts","Collected","Recovery"].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {byAgent.map(([ag,d])=>{
                const r = recPct(d.paid,d.payoff);
                return (
                  <tr key={ag}>
                    <td style={td}><span style={{ fontWeight:600 }}>{ag}</span></td>
                    <td style={td}>{d.count}</td>
                    <td style={{...td, fontWeight:700, color:"#10b981"}}>{fmtBDT(d.paid)}</td>
                    <td style={td}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ flex:1, height:6, background:dark?"rgba(255,255,255,0.06)":"rgba(30,27,75,0.06)", borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${r}%`, background:"linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius:3 }} />
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, color:"#818cf8", width:40 }}>{r}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize:15, fontWeight:700, color:dark?"#fff":"#1e1b4b", marginBottom:16 }}>📍 District-wise Collection</div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>{["District","Accounts","Collected"].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {byDist.map(([d,data])=>(
                <tr key={d}>
                  <td style={td}>{d}</td>
                  <td style={td}>{data.count}</td>
                  <td style={{...td, fontWeight:700, color:"#10b981"}}>{fmtBDT(data.paid)}</td>
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
function Main() {
  const [user, setUser]         = useState(null);
  const [authLoading, setAuthL] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [dataLoading, setDataL] = useState(true);
  const [page, setPage]         = useState("dashboard");
  const [sideOpen, setSideOpen] = useState(false);
  const [toasts, setToasts]     = useState([]);
  const [dark, setDark]         = useState(()=>localStorage.getItem("crm_theme")!=="light");

  const toggleDark = () => setDark(d=>{ localStorage.setItem("crm_theme",d?"light":"dark"); return !d; });
  const addToast = (msg,type="success") => {
    const id=Date.now(); setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3500);
  };

  useEffect(()=>{ return onAuthStateChanged(auth,u=>{ setUser(u); setAuthL(false); }); },[]);
  useEffect(()=>{
    if(!user) return;
    setDataL(true);
    getDocs(collection(db,"accounts")).then(s=>{ setAccounts(s.docs.map(d=>({id:d.id,...d.data()}))); setDataL(false); });
  },[user]);

  if(authLoading) return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#0f0c29,#1a1560,#24243e)", color:"rgba(255,255,255,0.5)", gap:16 }}>
      <div style={{ fontSize:48, animation:"spin 2s linear infinite" }}>💳</div>
      <div style={{ fontSize:14, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Loading…</div>
    </div>
  );

  if(!user) return <Login />;

  const bg = dark ? "linear-gradient(135deg,#0f0c29 0%,#1a1760 100%)" : "#f0f0ff";

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:bg, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes modalPop { from{transform:scale(0.95) translateY(10px);opacity:0} to{transform:none;opacity:1} }
        @keyframes slideInRight { from{transform:translateX(40px);opacity:0} to{transform:none;opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-thumb { background:rgba(99,102,241,0.3); border-radius:3px; }
        input[type=number]::-webkit-inner-spin-button { opacity:1; }
        select option { background:#1e1b4b; color:#fff; }
      `}</style>

      <Sidebar page={page} setPage={setPage} user={user} onLogout={()=>signOut(auth)}
        open={sideOpen} setOpen={setSideOpen} dark={dark} toggleDark={toggleDark} />

      <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column" }}>
        {/* Mobile topbar */}
        <div style={{ display:"none", padding:"14px 20px", background:dark?"rgba(15,12,41,0.95)":"rgba(240,240,255,0.95)", backdropFilter:"blur(10px)", borderBottom:`1px solid ${dark?"rgba(255,255,255,0.07)":"rgba(30,27,75,0.1)"}`, alignItems:"center", justifyContent:"space-between",
          ...(window.innerWidth<=768?{display:"flex"}:{}) }}>
          <button onClick={()=>setSideOpen(true)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:dark?"#fff":"#1e1b4b" }}>☰</button>
          <span style={{ fontWeight:800, fontSize:16, color:dark?"#fff":"#1e1b4b" }}>Recovery CRM</span>
          <span style={{ width:32 }} />
        </div>

        {dataLoading ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, color:dark?"rgba(255,255,255,0.4)":"rgba(30,27,75,0.4)" }}>
            <div style={{ fontSize:48, animation:"spin 2s linear infinite" }}>💳</div>
            <div style={{ fontSize:14 }}>Loading accounts from Firebase…</div>
          </div>
        ) : (
          <>
            {page==="dashboard" && <Dashboard accounts={accounts} dark={dark} />}
            {page==="accounts"  && <Accounts accounts={accounts} setAccounts={setAccounts} addToast={addToast} dark={dark} />}
            {page==="payments"  && <Payments dark={dark} />}
            {page==="reports"   && <Reports accounts={accounts} dark={dark} />}
          </>
        )}
      </div>
      <Toasts list={toasts} />
    </div>
  );
}

export default function App() { return <Main />; }
