import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";

export async function signInWithGoogle(auth) {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account",
  });

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
