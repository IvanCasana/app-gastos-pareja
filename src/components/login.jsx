import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";

function Login() {
  async function handleLogin() {
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error al iniciar sesion:", error);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-badge">MVP compartido</div>
        <h1 className="auth-title">Gastos compartidos</h1>
        <p className="auth-copy">
          Organiza gastos por grupo, registra movimientos rapido y manten el
          saldo claro entre ambos.
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
