import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";

function shouldUseRedirectAuth() {
  if (typeof window === "undefined") {
    return false;
  }

  const isSmallScreen = window.matchMedia?.("(max-width: 768px)")?.matches;
  const isTouchDevice = window.matchMedia?.("(pointer: coarse)")?.matches;

  return Boolean(isSmallScreen || isTouchDevice);
}

export async function signInWithGoogle(auth) {
  const provider = new GoogleAuthProvider();

  if (shouldUseRedirectAuth()) {
    await signInWithRedirect(auth, provider);
    return;
  }

  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    const errorCode = error?.code || "";

    if (
      errorCode === "auth/popup-blocked" ||
      errorCode === "auth/operation-not-supported-in-this-environment" ||
      errorCode === "auth/web-storage-unsupported"
    ) {
      await signInWithRedirect(auth, provider);
      return;
    }

    throw error;
  }
}
