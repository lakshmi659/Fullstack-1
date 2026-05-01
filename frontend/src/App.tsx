/**
 * fullstack-project— App.tsx
 * — Bharath K 
 * Single-file React frontend:
 *   - Login page (JWT auth via /auth/login)
 *   - Users table with loading/error states + Add/Delete
 *   - File upload panel + file list
 *   - JWT profile view (decoded token + /auth/me protected route)
 */

import { useState, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface User {
  id: string;
  name: string;
  email: string;
  age: number | null;
}

interface FileRecord {
  id: string;
  original_filename: string;
  saved_filename: string;
  content_type: string;
  size_bytes: number;
  size_kb: number;
  uploaded_at: string;
  download_url: string;
}

interface AuthProfile {
  message: string;
  user: string;
  role: string;
  issued_at: string;
}

type Tab = "users" | "files" | "profile";

// ─── Config ──────────────────────────────────────────────────────────────────
const API = "http://localhost:8000";

// ─── JWT decode (no external lib) ────────────────────────────────────────────
function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// ─── API helper ──────────────────────────────────────────────────────────────
async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<unknown> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

// ─── Global Styles ───────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #0d0f14;
    --surface:  #141720;
    --surface2: #1b2030;
    --border:   #252d3d;
    --text:     #e8ecf4;
    --muted:    #556080;
    --accent:   #f5a623;
    --accent2:  #ff6b35;
    --green:    #4ade80;
    --red:      #f87171;
    --blue:     #60a5fa;
    --purple:   #a78bfa;
  }

  html, body, #root { height: 100%; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  /* ── LOGIN ─────────────────────────────────────────────── */
  .login-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    background-image:
      radial-gradient(ellipse at 15% 60%, rgba(245,166,35,.06) 0%, transparent 55%),
      radial-gradient(ellipse at 85% 20%, rgba(96,165,250,.04) 0%, transparent 50%);
  }

  .login-card {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 3rem 3rem 2.5rem;
    width: 440px;
    position: relative;
    animation: fadeUp .4s ease;
  }
  .login-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .login-eyebrow {
    font-size: .65rem;
    text-transform: uppercase;
    letter-spacing: .14em;
    color: var(--accent);
    margin-bottom: .6rem;
  }
  .login-title {
    font-family: 'Syne', sans-serif;
    font-size: 2.1rem;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -.03em;
    margin-bottom: .35rem;
  }
  .login-sub {
    color: var(--muted);
    font-size: .75rem;
    margin-bottom: 2rem;
  }

  .creds-box {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    padding: .9rem 1.1rem;
    margin-bottom: 2rem;
    font-size: .72rem;
    line-height: 2;
    color: var(--muted);
  }
  .creds-box strong { color: var(--accent); }

  /* ── FORM ─────────────────────────────────────────────── */
  .field { margin-bottom: 1.2rem; }
  .field label {
    display: block;
    font-size: .65rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: .1em;
    margin-bottom: .45rem;
  }
  .field input {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    padding: .7rem 1rem;
    font-family: inherit;
    font-size: .88rem;
    outline: none;
    transition: border-color .2s, box-shadow .2s;
  }
  .field input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,166,35,.08);
  }

  /* Buttons */
  .btn {
    background: var(--accent);
    color: #000;
    padding: .75rem 1.5rem;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: .88rem;
    border: none;
    cursor: pointer;
    letter-spacing: .05em;
    text-transform: uppercase;
    transition: opacity .2s, transform .1s;
    width: 100%;
  }
  .btn:hover:not(:disabled) { opacity: .88; }
  .btn:active:not(:disabled) { transform: scale(.99); }
  .btn:disabled { opacity: .38; cursor: not-allowed; }

  .btn-sm {
    background: var(--surface2);
    color: var(--text);
    padding: .45rem .9rem;
    font-family: inherit;
    font-size: .72rem;
    border: 1px solid var(--border);
    cursor: pointer;
    transition: background .15s;
    text-transform: uppercase;
    letter-spacing: .07em;
    white-space: nowrap;
  }
  .btn-sm:hover { background: var(--border); }

  .btn-outline {
    background: transparent;
    color: var(--text);
    padding: .65rem 1.25rem;
    font-family: inherit;
    font-size: .78rem;
    border: 1px solid var(--border);
    cursor: pointer;
    transition: border-color .15s, color .15s;
    text-transform: uppercase;
    letter-spacing: .07em;
  }
  .btn-outline:hover { border-color: var(--accent); color: var(--accent); }

  .btn-danger {
    background: transparent;
    color: var(--red);
    border: 1px solid rgba(248,113,113,.35);
    padding: .35rem .75rem;
    font-family: inherit;
    font-size: .68rem;
    cursor: pointer;
    transition: all .15s;
    text-transform: uppercase;
    letter-spacing: .06em;
  }
  .btn-danger:hover { background: var(--red); color: #000; border-color: var(--red); }

  .error-banner {
    background: rgba(248,113,113,.1);
    border: 1px solid rgba(248,113,113,.3);
    color: var(--red);
    padding: .65rem 1rem;
    font-size: .78rem;
    margin-top: .9rem;
  }

  /* ── DASHBOARD ────────────────────────────────────────── */
  .dashboard { display: flex; min-height: 100vh; }

  .sidebar {
    width: 230px;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: hidden;
  }

  .sidebar-logo {
    padding: 1.7rem 1.5rem 1.4rem;
    border-bottom: 1px solid var(--border);
  }
  .sidebar-logo .brand {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 1.05rem;
    color: var(--text);
    letter-spacing: -.02em;
    display: flex;
    align-items: center;
    gap: .5rem;
  }
  .brand-dot {
    width: 8px; height: 8px;
    background: var(--accent);
    border-radius: 50%;
    display: inline-block;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(245,166,35,.5); }
    50%      { box-shadow: 0 0 0 5px rgba(245,166,35,0); }
  }
  .sidebar-logo .sub {
    font-size: .62rem;
    color: var(--muted);
    margin-top: .25rem;
    text-transform: uppercase;
    letter-spacing: .1em;
  }

  .sidebar-nav { flex: 1; padding: .75rem 0; }

  .nav-item {
    display: flex;
    align-items: center;
    gap: .75rem;
    padding: .75rem 1.5rem;
    font-size: .73rem;
    cursor: pointer;
    color: var(--muted);
    transition: all .15s;
    border-left: 2px solid transparent;
    text-transform: uppercase;
    letter-spacing: .09em;
    user-select: none;
  }
  .nav-item:hover { color: var(--text); background: rgba(255,255,255,.02); }
  .nav-item.active {
    color: var(--accent);
    border-left-color: var(--accent);
    background: rgba(245,166,35,.05);
  }
  .nav-icon { font-size: .95rem; width: 20px; text-align: center; }

  .sidebar-footer {
    padding: 1rem 1.5rem 1.25rem;
    border-top: 1px solid var(--border);
  }

  .user-badge {
    display: flex;
    align-items: center;
    gap: .7rem;
    margin-bottom: .85rem;
  }
  .avatar {
    width: 30px; height: 30px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: .75rem;
    color: #000;
    flex-shrink: 0;
    text-transform: uppercase;
  }
  .user-info .uname { font-size: .78rem; color: var(--text); font-weight: 600; }
  .user-info .urole {
    font-size: .6rem;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .btn-logout {
    width: 100%;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    padding: .5rem;
    font-family: inherit;
    font-size: .68rem;
    cursor: pointer;
    text-align: center;
    transition: all .15s;
    text-transform: uppercase;
    letter-spacing: .08em;
  }
  .btn-logout:hover { border-color: var(--red); color: var(--red); }

  /* ── MAIN ─────────────────────────────────────────────── */
  .main { flex: 1; overflow: auto; }

  .page-header {
    padding: 2rem 2.5rem 1.6rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    background: var(--surface);
  }
  .page-title {
    font-family: 'Syne', sans-serif;
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -.03em;
    color: var(--text);
  }
  .page-sub { color: var(--muted); font-size: .7rem; margin-top: .2rem; }

  .content { padding: 2rem 2.5rem; }

  /* ── STATS ────────────────────────────────────────────── */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 1rem;
    margin-bottom: 1.75rem;
  }
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 1.25rem 1.5rem;
  }
  .stat-label {
    font-size: .62rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: .1em;
    margin-bottom: .45rem;
  }
  .stat-value {
    font-family: 'Syne', sans-serif;
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--text);
  }
  .stat-value.accent { color: var(--accent); }
  .stat-value.blue   { color: var(--blue); }
  .stat-value.green  { color: var(--green); }

  /* ── PANEL ────────────────────────────────────────────── */
  .panel {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 1.75rem;
    margin-bottom: 1.5rem;
  }
  .panel-title {
    font-family: 'Syne', sans-serif;
    font-size: .88rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 1.4rem;
    text-transform: uppercase;
    letter-spacing: .04em;
    display: flex;
    align-items: center;
    gap: .6rem;
  }
  .panel-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  /* ── TABLE ────────────────────────────────────────────── */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: .8rem; }
  thead tr { border-bottom: 1px solid var(--border); }
  th {
    text-align: left;
    padding: .55rem 1rem;
    color: var(--muted);
    font-size: .62rem;
    text-transform: uppercase;
    letter-spacing: .1em;
    font-weight: 500;
  }
  td {
    padding: .8rem 1rem;
    border-bottom: 1px solid rgba(255,255,255,.035);
    vertical-align: middle;
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255,255,255,.02); }

  .cell-id {
    color: var(--muted);
    font-size: .67rem;
    max-width: 90px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: default;
  }
  .cell-email { color: var(--blue); }
  .cell-muted { color: var(--muted); }

  /* ── ADD USER FORM ────────────────────────────────────── */
  .form-row {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: flex-end;
  }
  .field-sm { flex: 1; min-width: 150px; }
  .field-xs { width: 110px; flex-shrink: 0; }

  /* ── UPLOAD ZONE ─────────────────────────────────────── */
  .upload-zone {
    border: 2px dashed var(--border);
    padding: 2.75rem;
    text-align: center;
    cursor: pointer;
    transition: all .2s;
    color: var(--muted);
    font-size: .78rem;
    background: transparent;
    user-select: none;
  }
  .upload-zone:hover, .upload-zone.drag {
    border-color: var(--accent);
    color: var(--accent);
    background: rgba(245,166,35,.03);
  }
  .upload-icon { font-size: 2.2rem; margin-bottom: .75rem; }

  input[type="file"] { display: none; }

  /* ── FILE LIST ───────────────────────────────────────── */
  .file-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: .85rem 0;
    border-bottom: 1px solid rgba(255,255,255,.035);
    gap: 1rem;
  }
  .file-row:last-child { border-bottom: none; }
  .file-info { flex: 1; min-width: 0; }
  .file-name {
    color: var(--text);
    font-size: .82rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .file-meta { color: var(--muted); font-size: .67rem; margin-top: .2rem; }
  .file-type-badge {
    display: inline-block;
    padding: .1rem .45rem;
    font-size: .6rem;
    text-transform: uppercase;
    letter-spacing: .06em;
    margin-right: .4rem;
    background: rgba(96,165,250,.1);
    color: var(--blue);
  }
  .file-actions { display: flex; gap: .5rem; flex-shrink: 0; }

  /* ── JWT / PROFILE ───────────────────────────────────── */
  .code-block {
    background: var(--bg);
    border: 1px solid var(--border);
    padding: 1.35rem 1.5rem;
    font-size: .76rem;
    line-height: 1.9;
    overflow-x: auto;
  }
  .jk { color: var(--blue); }
  .jv-num { color: var(--green); }
  .jv-str { color: var(--accent); }
  .jv-bool { color: var(--purple); }
  .j-indent { padding-left: 1.5rem; }

  .profile-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  /* ── LOADING / EMPTY / ERROR ─────────────────────────── */
  .state-row {
    padding: 2.5rem;
    text-align: center;
    color: var(--muted);
    font-size: .78rem;
  }
  .state-row.error { color: var(--red); }

  .spinner {
    display: inline-block;
    width: 14px; height: 14px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin .65s linear infinite;
    margin-right: .5rem;
    vertical-align: middle;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── TOAST ──────────────────────────────────────────── */
  .toast {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 3px solid var(--green);
    padding: .85rem 1.3rem;
    font-size: .78rem;
    z-index: 9999;
    max-width: 370px;
    animation: toastIn .3s ease;
    pointer-events: none;
  }
  .toast.err { border-left-color: var(--red); }
  @keyframes toastIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── BADGE ──────────────────────────────────────────── */
  .badge {
    display: inline-block;
    padding: .18rem .6rem;
    font-size: .62rem;
    text-transform: uppercase;
    letter-spacing: .06em;
    font-weight: 600;
  }
  .badge-admin { background: rgba(245,166,35,.15); color: var(--accent); }
  .badge-user  { background: rgba(96,165,250,.1);  color: var(--blue); }
`;

// ─── Toast Component ─────────────────────────────────────────────────────────
function Toast({
  msg,
  type,
  onHide,
}: {
  msg: string;
  type: "ok" | "err";
  onHide: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onHide, 3500);
    return () => clearTimeout(t);
  }, [onHide]);

  return (
    <div className={`toast ${type === "err" ? "err" : ""}`}>
      {type === "ok" ? "✓ " : "⚠ "}
      {msg}
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("jwt_token")
  );
  const [tab, setTab] = useState<Tab>("users");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const jwtPayload = token ? decodeJWT(token) : null;
  const username = (jwtPayload?.sub as string) || "unknown";
  const role = (jwtPayload?.role as string) || "user";

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
  }

  function handleLogin(t: string) {
    localStorage.setItem("jwt_token", t);
    setToken(t);
  }

  function handleLogout() {
    localStorage.removeItem("jwt_token");
    setToken(null);
    setTab("users");
  }

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="dashboard">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="brand">
              <span className="brand-dot" />
              Fullstack-project
            </div>
            <div className="sub">API Interface v1.0</div>
          </div>

          <nav className="sidebar-nav">
            {(
              [
                ["users", "👤", "Users"],
                ["files", "📁", "Files"],
                ["profile", "🔐", "Profile"],
              ] as [Tab, string, string][]
            ).map(([id, icon, label]) => (
              <div
                key={id}
                className={`nav-item ${tab === id ? "active" : ""}`}
                onClick={() => setTab(id)}
              >
                <span className="nav-icon">{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-badge">
              <div className="avatar">{username[0]?.toUpperCase() || "?"}</div>
              <div className="user-info">
                <div className="uname">{username}</div>
                <div className="urole">{role}</div>
              </div>
            </div>
            <button className="btn-logout" onClick={handleLogout}>
              ↩ Sign Out
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="main">
          {tab === "users" && (
            <UsersTab token={token} toast={showToast} />
          )}
          {tab === "files" && (
            <FilesTab token={token} toast={showToast} />
          )}
          {tab === "profile" && (
            <ProfileTab token={token} payload={jwtPayload} />
          )}
        </main>
      </div>

      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
    </>
  );
}

// ─── Login Page ──────────────────────────────────────────────────────────────
function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!username || !password) return;
    setLoading(true);
    setError("");
    try {
      const body = new URLSearchParams({
        username,
        password,
        grant_type: "password",
      });
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { detail?: string }).detail || "Authentication failed"
        );
      }
      const data = (await res.json()) as { access_token: string };
      onLogin(data.access_token);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-eyebrow">Fullstack-project </div>
          <div className="login-title">Welcome back</div>
          <div className="login-sub">
            Sign in to access the dashboard
          </div>

          <div className="creds-box">
            <strong>admin</strong> / admin123 — administrator access
            <br />
            <strong>user</strong> &nbsp;/ user123 &nbsp;— standard access
          </div>

          <div className="field">
            <label>Username</label>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <button
            className="btn"
            onClick={handleSubmit}
            disabled={loading || !username || !password}
          >
            {loading ? "Authenticating..." : "Sign In →"}
          </button>

          {error && <div className="error-banner">⚠ {error}</div>}
        </div>
      </div>
    </>
  );
}

// ─── Users Tab ───────────────────────────────────────────────────────────────
function UsersTab({
  token,
  toast,
}: {
  token: string;
  toast: (msg: string, type?: "ok" | "err") => void;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add-user form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = (await apiFetch("/users/", {}, token)) as User[];
      setUsers(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function addUser() {
    if (!name.trim() || !email.trim()) return;
    setAdding(true);
    try {
      await apiFetch(
        "/users/",
        {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            age: age ? parseInt(age, 10) : null,
          }),
        },
        token
      );
      toast("User created successfully");
      setName("");
      setEmail("");
      setAge("");
      fetchUsers();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to create user", "err");
    } finally {
      setAdding(false);
    }
  }

  async function deleteUser(id: string, uname: string) {
    if (!confirm(`Delete user "${uname}"?`)) return;
    try {
      await apiFetch(`/users/${id}`, { method: "DELETE" }, token);
      toast("User deleted");
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Delete failed", "err");
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Users</div>
          <div className="page-sub">
            Task 1 — CRUD via /users/ endpoint
          </div>
        </div>
        <button className="btn-sm" onClick={fetchUsers}>
          ↻ Refresh
        </button>
      </div>

      <div className="content">
        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Total Users</div>
            <div className="stat-value accent">{users.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">API Endpoint</div>
            <div
              style={{
                fontSize: ".72rem",
                color: "var(--blue)",
                marginTop: ".35rem",
              }}
            >
              GET /users/
            </div>
          </div>
        </div>

        {/* Add user form */}
        <div className="panel">
          <div className="panel-title">Add New User</div>
          <div className="form-row">
            <div className="field-sm">
              <div className="field">
                <label>Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alice Smith"
                  onKeyDown={(e) => e.key === "Enter" && addUser()}
                />
              </div>
            </div>
            <div className="field-sm">
              <div className="field">
                <label>Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alice@example.com"
                  onKeyDown={(e) => e.key === "Enter" && addUser()}
                />
              </div>
            </div>
            <div className="field-xs">
              <div className="field">
                <label>Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="25"
                  min={0}
                  max={150}
                />
              </div>
            </div>
            <div className="field" style={{ alignSelf: "flex-end" }}>
              <button
                className="btn"
                style={{ width: "auto", padding: ".72rem 1.5rem" }}
                onClick={addUser}
                disabled={adding || !name.trim() || !email.trim()}
              >
                {adding ? "Adding…" : "+ Add User"}
              </button>
            </div>
          </div>
        </div>

        {/* Users table */}
        <div className="panel">
          <div className="panel-title">All Users</div>

          {loading ? (
            <div className="state-row">
              <span className="spinner" />
              Loading users…
            </div>
          ) : error ? (
            <div className="state-row error">⚠ {error}</div>
          ) : users.length === 0 ? (
            <div className="state-row">
              No users yet — add one above.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Age</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <span className="cell-id" title={u.id}>
                          {u.id.slice(0, 8)}…
                        </span>
                      </td>
                      <td>{u.name}</td>
                      <td className="cell-email">{u.email}</td>
                      <td className="cell-muted">{u.age ?? "—"}</td>
                      <td>
                        <button
                          className="btn-danger"
                          onClick={() => deleteUser(u.id, u.name)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Files Tab ───────────────────────────────────────────────────────────────
function FilesTab({
  token,
  toast,
}: {
  token: string;
  toast: (msg: string, type?: "ok" | "err") => void;
}) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [selected, setSelected] = useState<File | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await apiFetch("/files/", {}, token)) as FileRecord[];
      setFiles(data);
    } catch {
      /* silently ignore */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  async function uploadFile() {
    if (!selected) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", selected);
      const res = await fetch(`${API}/files/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { detail?: string }).detail || "Upload failed"
        );
      }
      toast("File uploaded successfully");
      setSelected(null);
      fetchFiles();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Upload failed", "err");
    } finally {
      setUploading(false);
    }
  }

  async function deleteFile(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await apiFetch(`/files/${id}`, { method: "DELETE" }, token);
      toast("File deleted");
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Delete failed", "err");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) setSelected(f);
  }

  function formatSize(kb: number) {
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString();
  }

  function shortType(ct: string) {
    return ct.split("/")[1]?.toUpperCase() || ct;
  }

  const totalSize = files.reduce((s, f) => s + f.size_kb, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Files</div>
          <div className="page-sub">
            Task 3 — Upload & manage via /files/ endpoint
          </div>
        </div>
        <button className="btn-sm" onClick={fetchFiles}>
          ↻ Refresh
        </button>
      </div>

      <div className="content">
        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Total Files</div>
            <div className="stat-value blue">{files.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Size</div>
            <div className="stat-value">{formatSize(totalSize)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Max File Size</div>
            <div
              style={{
                fontSize: ".75rem",
                color: "var(--muted)",
                marginTop: ".35rem",
              }}
            >
              10 MB
            </div>
          </div>
        </div>

        {/* Upload panel */}
        <div className="panel">
          <div className="panel-title">Upload File</div>
          <label>
            <div
              className={`upload-zone ${drag ? "drag" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
            >
              <div className="upload-icon">📂</div>
              {selected ? (
                <>
                  <div
                    style={{
                      color: "var(--text)",
                      marginBottom: ".3rem",
                      fontWeight: 600,
                    }}
                  >
                    {selected.name}
                  </div>
                  <div style={{ fontSize: ".68rem" }}>
                    {(selected.size / 1024).toFixed(1)} KB — {selected.type}
                  </div>
                </>
              ) : (
                <>
                  <div>Drop file here or click to browse</div>
                  <div style={{ fontSize: ".68rem", marginTop: ".45rem" }}>
                    JPEG · PNG · GIF · WEBP · PDF — max 10 MB
                  </div>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                onChange={(e) => {
                  if (e.target.files?.[0]) setSelected(e.target.files[0]);
                }}
              />
            </div>
          </label>

          {selected && (
            <div
              style={{
                marginTop: "1rem",
                display: "flex",
                gap: ".75rem",
              }}
            >
              <button
                className="btn"
                style={{ flex: 1 }}
                onClick={uploadFile}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "↑ Upload File"}
              </button>
              <button
                className="btn-outline"
                onClick={() => setSelected(null)}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* File list */}
        <div className="panel">
          <div className="panel-title">Uploaded Files</div>

          {loading ? (
            <div className="state-row">
              <span className="spinner" />
              Loading files…
            </div>
          ) : files.length === 0 ? (
            <div className="state-row">No files uploaded yet.</div>
          ) : (
            files.map((f) => (
              <div className="file-row" key={f.id}>
                <div className="file-info">
                  <div className="file-name">{f.original_filename}</div>
                  <div className="file-meta">
                    <span className="file-type-badge">
                      {shortType(f.content_type)}
                    </span>
                    {formatSize(f.size_kb)} · {formatDate(f.uploaded_at)}
                  </div>
                </div>
                <div className="file-actions">
                  <a
                    href={`${API}${f.download_url}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <button className="btn-sm">↓ Download</button>
                  </a>
                  <button
                    className="btn-danger"
                    onClick={() =>
                      deleteFile(f.id, f.original_filename)
                    }
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────
function ProfileTab({
  token,
  payload,
}: {
  token: string;
  payload: Record<string, unknown> | null;
}) {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/auth/me", {}, token)
      .then((d) => {
        setProfile(d as AuthProfile);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed");
        setLoading(false);
      });
  }, [token]);

  /** Render a JSON-like value with syntax colouring */
  function renderVal(v: unknown): JSX.Element {
    if (typeof v === "number")
      return <span className="jv-num">{v}</span>;
    if (typeof v === "boolean")
      return <span className="jv-bool">{String(v)}</span>;
    return <span className="jv-str">"{String(v)}"</span>;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Profile</div>
          <div className="page-sub">
            Task 2 — JWT decode + protected /auth/me route
          </div>
        </div>
      </div>

      <div className="content">
        {/* /auth/me */}
        <div className="panel">
          <div className="panel-title">GET /auth/me — Protected Route</div>

          {loading ? (
            <div className="state-row">
              <span className="spinner" />
              Fetching profile…
            </div>
          ) : error ? (
            <div className="state-row error">⚠ {error}</div>
          ) : profile ? (
            <>
              <div className="profile-grid">
                <div className="stat-card">
                  <div className="stat-label">User</div>
                  <div className="stat-value">{profile.user}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Role</div>
                  <div
                    style={{ marginTop: ".45rem" }}
                  >
                    <span
                      className={`badge badge-${profile.role}`}
                    >
                      {profile.role}
                    </span>
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontSize: ".78rem",
                  color: "var(--muted)",
                  marginBottom: ".3rem",
                }}
              >
                Server response
              </div>
              <div className="code-block">
                {"{"}<br />
                <span className="j-indent">
                  <span className="jk">"message"</span>:{" "}
                  <span className="jv-str">"{profile.message}"</span>
                  ,
                  <br />
                  <span className="jk">"user"</span>:{" "}
                  <span className="jv-str">"{profile.user}"</span>
                  ,
                  <br />
                  <span className="jk">"role"</span>:{" "}
                  <span className="jv-str">"{profile.role}"</span>
                  ,
                  <br />
                  <span className="jk">"issued_at"</span>:{" "}
                  <span className="jv-str">"{profile.issued_at}"</span>
                </span>
                <br />
                {"}"}
              </div>
            </>
          ) : null}
        </div>

        {/* JWT decoded payload */}
        <div className="panel">
          <div className="panel-title">JWT Payload (Decoded)</div>
          {payload ? (
            <div className="code-block">
              {"{"}<br />
              <div className="j-indent">
                {Object.entries(payload).map(([k, v]) => (
                  <div key={k}>
                    <span className="jk">"{k}"</span>:{" "}
                    {renderVal(v)},
                  </div>
                ))}
              </div>
              {"}"}
            </div>
          ) : (
            <div className="state-row">No payload available.</div>
          )}
        </div>

        {/* Raw bearer token */}
        <div className="panel">
          <div className="panel-title">Bearer Token (Raw)</div>
          <div
            className="code-block"
            style={{
              wordBreak: "break-all",
              color: "var(--muted)",
              fontSize: ".68rem",
              lineHeight: "1.7",
            }}
          >
            {token}
          </div>
        </div>
      </div>
    </>
  );
}
