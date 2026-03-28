import { useState } from "react";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const USERNAME_MAX_LENGTH = 24;

function getAvatarLetter(user, profile) {
  const seed = profile?.username || user?.displayName || user?.email || "U";
  return seed.trim().charAt(0).toUpperCase();
}

export default function CompleteProfile({ user, profile, onProfileCreated }) {
  const [username, setUsername] = useState(profile?.username || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const avatarLetter = getAvatarLetter(user, profile);
  const showGoogleAvatar = Boolean(user.photoURL) && !avatarLoadFailed;

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");

    const cleanUsername = username.trim();
    const usernameLower = cleanUsername.toLowerCase();

    if (cleanUsername.length < 3) {
      setError("El nombre de usuario debe tener al menos 3 caracteres.");
      return;
    }

    if (cleanUsername.length > USERNAME_MAX_LENGTH) {
      setError(`El nombre de usuario no puede superar ${USERNAME_MAX_LENGTH} caracteres.`);
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
        avatarPreset: profile?.avatarPreset || "",
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
    <main className="auth-screen">
      <section className="auth-card auth-card-compact">
        <div className="profile-setup-avatar">
          {showGoogleAvatar ? (
            <img
              src={user.photoURL}
              alt="Foto de perfil de Google"
              className="profile-setup-avatar-image"
              onError={() => setAvatarLoadFailed(true)}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="profile-setup-avatar-fallback">{avatarLetter}</div>
          )}
        </div>
        <h1 className="auth-title">Elegi tu nombre de usuario</h1>
        <p className="auth-copy">
          Vamos a usar tu foto de Google como avatar por defecto. Este nombre se
          mostrara dentro de tus grupos y movimientos.
        </p>

        <form onSubmit={handleSave} className="form">
          <input
            type="text"
            placeholder="Tu nombre visible"
            value={username}
            maxLength={USERNAME_MAX_LENGTH}
            onChange={(event) =>
              setUsername(event.target.value.slice(0, USERNAME_MAX_LENGTH))
            }
          />

          <button type="submit" className="button" disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </form>

        {error ? <p className="inline-error">{error}</p> : null}
      </section>
    </main>
  );
}
