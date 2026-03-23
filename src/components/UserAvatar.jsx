import { useMemo } from "react";
import { AVATAR_PRESETS } from "../utils/avatarPresets";

function FaceBase({ children, className = "" }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={`avatar-face ${className}`.trim()}>
      {children}
    </svg>
  );
}

function CatFace({ fur = "#f2a14a", ear = "#d8832f", nose = "#d26b86", stripe = "" }) {
  return (
    <FaceBase>
      <path d="M17 18 8 8v18c0 2 1 4 3 5l6-13Z" fill={ear} />
      <path d="M47 18 56 8v18c0 2-1 4-3 5l-6-13Z" fill={ear} />
      <circle cx="32" cy="34" r="22" fill={fur} />
      {stripe ? <ellipse cx="32" cy="24" rx="7" ry="5" fill={stripe} /> : null}
      <circle cx="24" cy="32" r="2.8" fill="#1d211f" />
      <circle cx="40" cy="32" r="2.8" fill="#1d211f" />
      <path d="M28 40c1.8-2.2 6.2-2.2 8 0-1 2.3-2.7 3.5-4 3.5s-3-1.2-4-3.5Z" fill={nose} />
      <path d="M24 39h-8M24 42H14M40 39h8M40 42h10" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
    </FaceBase>
  );
}

function DogFace() {
  return (
    <FaceBase>
      <ellipse cx="17" cy="26" rx="8" ry="11" fill="#9c673d" />
      <ellipse cx="47" cy="26" rx="8" ry="11" fill="#9c673d" />
      <circle cx="32" cy="34" r="22" fill="#c78a55" />
      <ellipse cx="32" cy="42" rx="10" ry="8" fill="#f3dcc2" />
      <circle cx="24" cy="32" r="2.8" fill="#1d211f" />
      <circle cx="40" cy="32" r="2.8" fill="#1d211f" />
      <circle cx="32" cy="39" r="3" fill="#1d211f" />
      <path d="M28 45c1.6 1.4 6.4 1.4 8 0" stroke="#1d211f" strokeWidth="2" strokeLinecap="round" />
    </FaceBase>
  );
}

function BunnyFace() {
  return (
    <FaceBase>
      <ellipse cx="23" cy="14" rx="6" ry="14" fill="#f5f1ee" />
      <ellipse cx="41" cy="14" rx="6" ry="14" fill="#f5f1ee" />
      <ellipse cx="23" cy="14" rx="2.5" ry="10" fill="#f3b6c6" />
      <ellipse cx="41" cy="14" rx="2.5" ry="10" fill="#f3b6c6" />
      <circle cx="32" cy="36" r="20" fill="#fffdfb" />
      <circle cx="24" cy="34" r="2.5" fill="#1d211f" />
      <circle cx="40" cy="34" r="2.5" fill="#1d211f" />
      <path d="M29 41c1.3-1.8 4.7-1.8 6 0-1 2-2.2 3-3 3-.8 0-2-1-3-3Z" fill="#d26b86" />
      <path d="M27 45c1.4 1.3 3 2 5 2s3.6-.7 5-2" stroke="#1d211f" strokeWidth="1.8" strokeLinecap="round" />
    </FaceBase>
  );
}

function FoxFace() {
  return (
    <FaceBase>
      <path d="M18 18 10 8l-2 18c0 2 1 4 3 5l7-13Z" fill="#d96e27" />
      <path d="M46 18 54 8l2 18c0 2-1 4-3 5l-7-13Z" fill="#d96e27" />
      <path d="M32 12c13 0 22 9 22 22 0 7-4 14-10 18H20C14 48 10 41 10 34c0-13 9-22 22-22Z" fill="#ef8b37" />
      <path d="M20 40c3 5 7.6 8 12 8s9-3 12-8c-2.5-2.7-6.7-4.3-12-4.3S22.5 37.3 20 40Z" fill="#fff7f0" />
      <circle cx="24" cy="32" r="2.8" fill="#1d211f" />
      <circle cx="40" cy="32" r="2.8" fill="#1d211f" />
      <path d="M29 39c1.4-1.8 4.6-1.8 6 0-1 2.2-2.2 3.2-3 3.2s-2-1-3-3.2Z" fill="#1d211f" />
    </FaceBase>
  );
}

function AnimalAvatar({ presetId }) {
  switch (presetId) {
    case "cat-ginger":
      return <CatFace fur="#f0a353" ear="#cb7b2b" stripe="#e58934" />;
    case "cat-tuxedo":
      return <CatFace fur="#44515e" ear="#2d3640" nose="#d77c95" stripe="#6d7a88" />;
    case "cat-cream":
      return <CatFace fur="#f1d9b5" ear="#d9b189" nose="#cb6d8f" stripe="#e8c89a" />;
    case "dog-brown":
      return <DogFace />;
    case "bunny-white":
      return <BunnyFace />;
    case "fox-orange":
      return <FoxFace />;
    default:
      return <CatFace fur="#f0a353" ear="#cb7b2b" stripe="#e58934" />;
  }
}

export default function UserAvatar({
  photoURL,
  avatarPreset,
  alt,
  className,
  fallbackClassName = "",
}) {
  const presetId = useMemo(() => {
    return AVATAR_PRESETS.some((preset) => preset.id === avatarPreset)
      ? avatarPreset
      : "cat-ginger";
  }, [avatarPreset]);

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={alt}
        className={className}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${className} ${fallbackClassName} avatar-preset`.trim()}
      aria-hidden="true"
    >
      <AnimalAvatar presetId={presetId} />
    </div>
  );
}
