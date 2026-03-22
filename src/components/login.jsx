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
    <main className="container">
      <div className="card" style={{ marginTop: "80px", textAlign: "center" }}>
        <h1 className="title">Gastos Pareja</h1>
        <p style={{ marginBottom: "16px" }}>Inicia sesion para continuar</p>
        <button className="button" onClick={handleLogin}>
          Iniciar sesion con Google
        </button>
      </div>
    </main>
  );
}

export default Login;
