import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, provider, db } from "./firebase";
import CompleteProfile from "./components/CompleteProfile";
import HomePage from "./pages/HomePage";

function normalizeProfile(data, user) {
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
          const basicUserData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            photoURL: firebaseUser.photoURL || "",
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
      await signInWithPopup(auth, provider);
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
    return <div style={{ padding: 24 }}>Cargando...</div>;
  }

  if (!user) {
    return (
      <div style={{ padding: 24 }}>
        <h1>App de gastos compartidos</h1>
        <button onClick={handleLogin}>Ingresar con Google</button>
      </div>
    );
  }

  if (!profile || !profile.username?.trim()) {
    return (
      <CompleteProfile
        user={user}
        profile={profile}
        onProfileCreated={setProfile}
      />
    );
  }

  return (
    <HomePage
      user={user}
      profile={profile}
      onLogout={handleLogout}
      onProfileCreated={setProfile}
    />
  );
}
