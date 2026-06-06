import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Fenrir Deep Research</h1>
          <p>Multi-agent research with live observability</p>
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            Research
          </NavLink>
          <NavLink to="/observability">Observability</NavLink>
          <span className="user-chip">{user?.email}</span>
          <button className="ghost-btn" onClick={logout}>
            Logout
          </button>
        </nav>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
