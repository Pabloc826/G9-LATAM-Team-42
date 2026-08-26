import { useEffect, useState } from "react";
import "./App.css";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import AnalysisForm from "./components/AnalysisForm";
import ResultPanel from "./components/ResultPanel";
import HistoryView from "./components/HistoryView";
import HomeView from "./components/HomeView";
import ReportsView from "./components/ReportsView";
import LoginView from "./components/LoginView";
import RegisterView from "./components/RegisterView";
import { postAnalisis, ApiError } from "./api/energiaiClient";

function getInitialTheme() {
  const stored = window.localStorage.getItem("energiai-theme");
  if (stored === "day" || stored === "night") return stored;
  return "day";
}

function getInitialCollapsed() {
  return window.localStorage.getItem("energiai-sidebar-collapsed") === "true";
}

function getStoredUser() {
  try {
    const stored = window.localStorage.getItem("energiai-user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(getStoredUser);
  const [authView, setAuthView] = useState("login"); // "login" | "register"
  const [section, setSection] = useState("inicio");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [theme, setTheme] = useState(getInitialTheme);
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("energiai-theme", theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem("energiai-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  function handleLogin(data) {
    setUser(data);
    window.localStorage.setItem("energiai-user", JSON.stringify(data));
  }

  function handleLogout() {
    setUser(null);
    setAuthView("login");
    window.localStorage.removeItem("energiai-user");
    setSection("inicio");
  }

  function toggleTheme() {
    setTheme((prev) => (prev === "night" ? "day" : "night"));
  }

  async function handleSubmit(payload) {
    setSubmitting(true);
    setError(null);
    try {
      const response = await postAnalisis(payload, user?.userId);
      setResult(response);
      setHistoryRefreshKey((key) => key + 1);
    } catch (err) {
      setResult(null);
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo conectar con el servicio de JouleAI. Intenta de nuevo más tarde."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleNavigate(key) {
    setSection(key);
    setMobileMenuOpen(false);
  }

  // Si no hay usuario autenticado, mostrar Login/Register
  if (!user) {
    return authView === "login" ? (
      <LoginView
        onLogin={handleLogin}
        onSwitchToRegister={() => setAuthView("register")}
      />
    ) : (
      <RegisterView
        onRegister={handleLogin}
        onSwitchToLogin={() => setAuthView("login")}
      />
    );
  }

  return (
    <div className={`app-shell ${collapsed ? "sidebar-is-collapsed" : ""}`}>
      <Sidebar
        active={section}
        onNavigate={handleNavigate}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="app-content">
        <TopBar
          section={section}
          onNavigate={handleNavigate}
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
          mobileMenuOpen={mobileMenuOpen}
          user={user}
          onLogout={handleLogout}
        />

        <main className="app-main">
          {section === "inicio" && (
            <HomeView onNavigate={handleNavigate} refreshKey={historyRefreshKey} user={user} />
          )}

          {section === "analisis" && (
            <>
              <header className="section-header">
                <span className="eyebrow">Diagnóstico</span>
                <h1>¿Qué tan eficiente es tu consumo?</h1>
                <p className="text-muted">
                  Ingresa los datos de tu último período de facturación y JouleAI
                  clasificará tu perfil de eficiencia con recomendaciones a la medida.
                </p>
              </header>

              <div className="analysis-grid">
                <AnalysisForm onSubmit={handleSubmit} submitting={submitting} />
                <ResultPanel result={result} error={error} loading={submitting} />
              </div>
            </>
          )}

          {section === "historial" && (
            <>
              <header className="section-header">
                <span className="eyebrow">Seguimiento</span>
                <h1>Historial de análisis</h1>
                <p className="text-muted">
                  Evolución de tu consumo a lo largo del tiempo, según los análisis
                  guardados en el backend.
                </p>
              </header>

              <HistoryView refreshKey={historyRefreshKey} user={user} />
            </>
          )}

          {section === "reportes" && <ReportsView refreshKey={historyRefreshKey} />}
        </main>
      </div>
    </div>
  );
}
