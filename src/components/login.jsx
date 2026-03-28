import { auth } from "../firebase";
import { signInWithGoogle } from "../utils/auth";

function Login({ onLogin }) {
  async function handleLogin() {
    if (onLogin) {
      await onLogin();
      return;
    }

    try {
      await signInWithGoogle(auth);
    } catch (error) {
      console.error("Error al iniciar sesion:", error);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-badge">Miticuenta</div>
        <h1 className="auth-title">Miticuenta</h1>
        <p className="auth-copy">
          Organiza grupos, registra movimientos rapido y manten todo ordenado
          en un solo lugar.
        </p>
        <button className="button auth-google-button" onClick={handleLogin}>
          <span className="auth-google-mark">G</span>
          Iniciar sesion con Google
        </button>
      </section>
    </main>
  );
}

export default Login;
