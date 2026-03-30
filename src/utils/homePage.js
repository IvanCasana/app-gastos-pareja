import { formatCurrencyAmount } from "./currency";

export const PAGE_SIZE = 10;
export const GROUP_NAME_MAX_LENGTH = 36;
export const INVITE_CODE_LENGTH = 6;
export const MAX_GROUP_MEMBERS = 2;

const MEOW_SOUNDS = [
  "/sounds/dragon-studio-cartoon-kitten-meow-487668.mp3",
  "/sounds/dragon-studio-cat-meow-321642.mp3",
  "/sounds/dragon-studio-cat-meow-401729.mp3",
  "/sounds/dragon-studio-cute-cat-meow-472372.mp3",
  "/sounds/dragon-studio-meow-sfx-405456.mp3",
  "/sounds/soundreality-cat-meow-fx-461188.mp3",
  "/sounds/sound_garage-cat-meow-8-fx-306184.mp3",
];

let audioContextInstance = null;
let lastMeowIndex = -1;

export function sortTransactionsByCreatedAt(items) {
  return [...items].sort((left, right) => {
    const leftSeconds = left.createdAt?.seconds || 0;
    const rightSeconds = right.createdAt?.seconds || 0;
    return rightSeconds - leftSeconds;
  });
}

export function buildNextProfile(profile, updates) {
  return {
    ...profile,
    ...updates,
  };
}

export function createInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!audioContextInstance) {
    audioContextInstance = new AudioContextClass();
  }

  return audioContextInstance;
}

export function playLogoSoundSequence() {
  const audioContext = getAudioContext();

  if (audioContext) {
    const now = audioContext.currentTime;
    const notes = [
      { frequency: 988, start: 0, duration: 0.09 },
      { frequency: 1318, start: 0.06, duration: 0.1 },
      { frequency: 1567, start: 0.12, duration: 0.14 },
    ];

    notes.forEach((note) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(note.frequency, now + note.start);

      gain.gain.setValueAtTime(0.0001, now + note.start);
      gain.gain.exponentialRampToValueAtTime(0.16, now + note.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + note.start + note.duration
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start(now + note.start);
      oscillator.stop(now + note.start + note.duration);
    });
  }

  if (typeof window === "undefined" || MEOW_SOUNDS.length === 0) {
    return;
  }

  let nextIndex = Math.floor(Math.random() * MEOW_SOUNDS.length);

  if (MEOW_SOUNDS.length > 1 && nextIndex === lastMeowIndex) {
    nextIndex = (nextIndex + 1) % MEOW_SOUNDS.length;
  }

  lastMeowIndex = nextIndex;

  window.setTimeout(() => {
    const meowAudio = new Audio(MEOW_SOUNDS[nextIndex]);
    meowAudio.volume = 0.65;
    void meowAudio.play().catch(() => {});
  }, 120);
}

export function getHeroBalanceSummary({
  currentGroup,
  isLoading,
  isBalanceHidden,
  hasCounterpart,
  balance,
  currentMemberName,
  otherMemberName,
}) {
  if (!currentGroup) {
    return {
      title: "",
      amount: "",
    };
  }

  if (isLoading) {
    return {
      title: "Actualizando balance",
      amount: "",
    };
  }

  if (isBalanceHidden) {
    return {
      title: hasCounterpart ? "Balance actual" : "Esperando otro integrante",
      amount: "******",
    };
  }

  if (!hasCounterpart) {
    return {
      title: "Invita a alguien para ver el saldo",
      amount: "",
    };
  }

  if (balance > 0) {
    return {
      title: `Saldo a favor de ${currentMemberName}:`,
      amount: `$${formatCurrencyAmount(Math.abs(balance))}`,
    };
  }

  if (balance < 0) {
    return {
      title: `Saldo a favor de ${otherMemberName}:`,
      amount: `$${formatCurrencyAmount(Math.abs(balance))}`,
    };
  }

  return {
    title: `Estan a mano con ${otherMemberName}`,
    amount: "",
  };
}
