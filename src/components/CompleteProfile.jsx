import { useState } from "react";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function CompleteProfile({ user, profile, onProfileCreated }) {
  const [username, setUsername] = useState(profile?.username || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");

    const cleanUsername = username.trim();
    const usernameLower = cleanUsername.toLowerCase();

    if (cleanUsername.length < 3) {
      setError("El nombre de usuario debe tener al menos 3 caracteres.");
      return;
    }

    setSaving(true);

    try {
      const usernameRef = doc(db, "usernames", usernameLower);
      const usernameSnap = await getDoc(usernameRef);

      if (usernameSnap.exists() && usernameSnap.data().uid !== user.uid) {
        setError("Ese nombre de usuario ya esta en uso.");
        setSaving(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);

      const completedData = {
        uid: user.uid,
        email: user.email || "",
        photoURL: user.photoURL || "",
        username: cleanUsername,
        usernameLower,
        activeGroupId: profile?.activeGroupId || profile?.groupId || null,
        groupIds: Array.isArray(profile?.groupIds)
          ? profile.groupIds
          : profile?.groupId
            ? [profile.groupId]
            : [],
        updatedAt: serverTimestamp(),
      };

      if (!profile?.createdAt) {
        await setDoc(
          userRef,
          {
            ...completedData,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        await updateDoc(userRef, completedData);
      }

      await setDoc(
        usernameRef,
        {
          uid: user.uid,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      onProfileCreated({
        ...profile,
        ...completedData,
      });
    } catch (err) {
      console.error("Error guardando perfil:", err);
      setError("Hubo un error guardando el perfil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 400 }}>
      <h2>Elegi tu nombre de usuario</h2>

      <form onSubmit={handleSave}>
        <input
          type="text"
          placeholder="Ej: Ivan"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 12,
            boxSizing: "border-box",
          }}
        />

        <button type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
