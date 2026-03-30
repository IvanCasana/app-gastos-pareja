import { lazy, Suspense, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { signInWithGoogle } from "./utils/auth";

const CompleteProfile = lazy(() => import("./components/CompleteProfile"));
const Login = lazy(() => import("./components/login"));
const HomePage = lazy(() => import("./pages/HomePage"));

function AppFallback() {
  return <div style={{ padding: 24 }}>Cargando...</div>;
}

function normalizeProfile(data, user) {
  // Mantiene compatibilidad con el modelo anterior basado en un solo groupId.
  const legacyGroupId = data?.groupId || null;
  const groupIds = Array.isArray(data?.groupIds)
    ? data.groupIds
    : legacyGroupId
      ? [legacyGroupId]
      : [];

  return {
    uid: user.uid,
    email: user.email || "",
    photoURL: user.photoURL || "",
    avatarPreset: data?.avatarPreset || "",
    username: data?.username || "",
    usernameLower: data?.usernameLower || "",
    activeGroupId: data?.activeGroupId || legacyGroupId || null,
    groupIds,
    createdAt: data?.createdAt,
    updatedAt: data?.updatedAt,
  };
}

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          // Se crea un perfil minimo para que el primer ingreso siga el flujo
          // de completar username y elegir grupo sin romper la app.
          const basicUserData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            photoURL: firebaseUser.photoURL || "",
            avatarPreset: "",
            username: "",
            usernameLower: "",
            activeGroupId: null,
            groupIds: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          await setDoc(userRef, basicUserData);
          setProfile({
            ...basicUserData,
            createdAt: undefined,
            updatedAt: undefined,
          });
        } else {
          setProfile(normalizeProfile(userSnap.data(), firebaseUser));
        }
      } catch (error) {
        console.error("Error cargando perfil:", error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithGoogle(auth);
    } catch (error) {
      console.error("Error al iniciar sesion:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesion:", error);
    }
  };

  if (loading) {
    return <AppFallback />;
  }

  if (!user) {
    return (
      <Suspense fallback={<AppFallback />}>
        <Login onLogin={handleLogin} />
      </Suspense>
    );
  }

  if (!profile || !profile.username?.trim()) {
    return (
      <Suspense fallback={<AppFallback />}>
        <CompleteProfile
          user={user}
          profile={profile}
          onProfileCreated={setProfile}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<AppFallback />}>
      <HomePage
        user={user}
        profile={profile}
        onLogout={handleLogout}
        onProfileCreated={setProfile}
      />
    </Suspense>
  );
}
