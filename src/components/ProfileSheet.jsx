import { useState } from "react";
import UserAvatar from "./UserAvatar";
import { AVATAR_PRESETS } from "../utils/avatarPresets";

const USERNAME_MAX_LENGTH = 24;

export default function ProfileSheet({
  user,
  profile,
  isOpen,
  isSaving,
  error,
  onClose,
  onSave,
  onInstallApp,
  canInstallApp,
}) {
  const [username, setUsername] = useState(profile?.username || "");
  const [avatarPreset, setAvatarPreset] = useState(profile?.avatarPreset || "");
  const currentPhotoURL = avatarPreset ? "" : profile?.photoURL || user?.photoURL || "";

  async function handleSubmit(event) {
    event.preventDefault();
    await onSave({
      username,
      avatarPreset,
    });
  }

  return (
    <>
      <div
        className={`composer-sheet-backdrop ${isOpen ? "is-open" : ""}`}
        onClick={onClose}
      />

      <aside className={`composer-sheet profile-sheet ${isOpen ? "is-open" : ""}`}>
        <button type="button" className="composer-sheet-close" onClick={onClose}>
          Cerrar
        </button>

        <div className="composer-sheet-content">
          <header className="composer-sheet-header profile-sheet-header">
            <p className="composer-sheet-eyebrow">Tu perfil</p>
            <h2>Editar perfil</h2>
            <p className="auth-copy">
              Puedes cambiar tu nombre visible. La foto actual se toma desde tu cuenta
              de Google.
            </p>
          </header>

          <div className="profile-sheet-summary">
            <UserAvatar
              photoURL={currentPhotoURL}
              avatarPreset={avatarPreset}
              alt={`Avatar de ${profile?.username || "usuario"}`}
              className="profile-sheet-avatar"
              fallbackClassName="profile-sheet-avatar-fallback"
            />

            <div className="profile-sheet-meta">
              <strong>{profile?.username}</strong>
              <span>{profile?.email || user?.email || "Sin email"}</span>
            </div>
          </div>

          <div className="profile-sheet-photo-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setAvatarPreset("")}
              disabled={!user?.photoURL}
            >
              Usar foto de Google
            </button>
          </div>

          <div className="profile-sheet-presets">
            {AVATAR_PRESETS.map((preset) => {
              const selected = avatarPreset === preset.id;

              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`profile-sheet-preset ${selected ? "is-selected" : ""}`}
                  onClick={() => setAvatarPreset(preset.id)}
                  title={preset.label}
                >
                  <UserAvatar
                    photoURL=""
                    avatarPreset={preset.id}
                    alt={preset.label}
                    className="profile-sheet-preset-avatar"
                    fallbackClassName="profile-sheet-avatar-fallback"
                  />
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="form">
            <input
              type="text"
              placeholder="Tu nombre visible"
              value={username}
              maxLength={USERNAME_MAX_LENGTH}
              onChange={(event) =>
                setUsername(event.target.value.slice(0, USERNAME_MAX_LENGTH))
              }
            />

            <button type="submit" className="button" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>

          {canInstallApp ? (
            <button type="button" className="button button-secondary" onClick={onInstallApp}>
              Instalar app
            </button>
          ) : null}

          {error ? <p className="inline-error">{error}</p> : null}
        </div>
      </aside>
    </>
  );
}
