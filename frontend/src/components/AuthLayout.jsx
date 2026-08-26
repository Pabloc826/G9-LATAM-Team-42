export default function AuthLayout({ children }) {
  return (
    <div className="auth-split">
      <section className="auth-visual" aria-hidden="true">
        <img
          src="/wind-farm.jpg"
          alt=""
          className="auth-visual-img"
        />
        <div className="auth-visual-overlay" />
        <div className="auth-visual-content">
          <p className="auth-quote">
            La factura de tu luz,{" "}
            <span className="auth-quote-accent">explicada por un modelo</span>
            , no por una adivinanza.
          </p>
          <p className="auth-caption">
            Eficiencia energética impulsada por Machine Learning
          </p>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-panel-card">
            <img src="/jouleai-logo.png" alt="JouleAI" className="auth-logo" />
            {children}
          </div>
          <p className="auth-caption auth-caption--mobile">
            Eficiencia energética impulsada por Machine Learning
          </p>
        </div>
      </section>
    </div>
  );
}
