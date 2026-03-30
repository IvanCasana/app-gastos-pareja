import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import TransactionList from "../components/TransactionList";
import UserAvatar from "../components/UserAvatar";
import { calculateBalance } from "../utils/balance";
import { formatCurrencyAmount, splitCurrencyAmount } from "../utils/currency";
import {
  buildNextProfile,
  createInviteCode,
  GROUP_NAME_MAX_LENGTH,
  INVITE_CODE_LENGTH,
  MAX_GROUP_MEMBERS,
  PAGE_SIZE,
  playLogoSoundSequence,
  sortTransactionsByCreatedAt,
} from "../utils/homePage";
import { db, auth } from "../firebase";

const TransactionForm = lazy(() => import("../components/TransactionForm"));
const ProfileSheet = lazy(() => import("../components/ProfileSheet"));
const StatisticsSheet = lazy(() => import("../components/StatisticsSheet"));
const GroupSheet = lazy(() => import("../components/GroupSheet"));
const Login = lazy(() => import("../components/login"));
const CompleteProfile = lazy(() => import("../components/CompleteProfile"));

function SheetFallback() {
  return <div style={{ padding: 16 }}>Cargando...</div>;
}

function HomePage({
  user: externalUser,
  profile: externalProfile,
  onLogout,
  onProfileCreated,
}) {
  const [transactions, setTransactions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [internalUser, setInternalUser] = useState(undefined);
  const [internalProfile, setInternalProfile] = useState(undefined);
  const [transactionsError, setTransactionsError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [groupError, setGroupError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState("");
  const [deletingGroupId, setDeletingGroupId] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [joiningGroup, setJoiningGroup] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [copyingInvite, setCopyingInvite] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState("");
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [statisticsSheetOpen, setStatisticsSheetOpen] = useState(false);
  const [visibleTransactionsCount, setVisibleTransactionsCount] = useState(PAGE_SIZE);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [profileSaveError, setProfileSaveError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [logoBubble, setLogoBubble] = useState(false);
  const [uiToast, setUiToast] = useState("");
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState(null);

  const user = externalUser ?? internalUser;
  const profile = externalProfile ?? internalProfile;
  // HomePage soporta dos modos: integrado dentro de App con sesion ya resuelta,
  // o usado por su cuenta leyendo Auth y perfil desde Firebase.
  const hasExternalSession =
    externalUser !== undefined && externalProfile !== undefined;

  useEffect(() => {
    if (hasExternalSession) {
      return undefined;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setInternalUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, [hasExternalSession]);

  useEffect(() => {
    if (hasExternalSession) {
      return undefined;
    }

    async function loadProfile() {
      if (!internalUser) {
        setInternalProfile(null);
        return;
      }

      try {
        const userDocRef = doc(db, "users", internalUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setInternalProfile(userDocSnap.data());
        } else {
          setInternalProfile(null);
        }
      } catch (error) {
        console.error("Error al cargar perfil:", error);
        setInternalProfile(null);
      }
    }

    loadProfile();
  }, [hasExternalSession, internalUser]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPromptEvent(event);
    }

    function handleAppInstalled() {
      setInstallPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!uiToast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setUiToast("");
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [uiToast]);

  const transactionsCollection = useMemo(() => collection(db, "transactions"), []);
  const groupsCollection = useMemo(() => collection(db, "groups"), []);

  useEffect(() => {
    if (!user || !profile) {
      setGroups([]);
      setGroupsLoading(false);
      return undefined;
    }

    setGroupsLoading(true);

    const memberGroupsQuery = query(
      groupsCollection,
      where("memberIds", "array-contains", user.uid)
    );

    const unsubscribeGroups = onSnapshot(
      memberGroupsQuery,
      (snapshot) => {
        const nextGroups = snapshot.docs.map((groupDoc) => ({
          id: groupDoc.id,
          ...groupDoc.data(),
        }));

        setGroups(nextGroups);
        setGroupError("");
        setGroupsLoading(false);
      },
      (error) => {
        console.error("Error al cargar grupos:", error);
        setGroupError("No se pudieron cargar tus grupos.");
        setGroupsLoading(false);
      }
    );

    return () => unsubscribeGroups();
  }, [groupsCollection, profile, user]);

  useEffect(() => {
    async function syncProfileGroups() {
      const actualGroupIds = groups.map((group) => group.id);
      const storedGroupIds = Array.isArray(profile.groupIds) ? profile.groupIds : [];
      const nextActiveGroupId =
        groups.find((group) => group.id === profile.activeGroupId)?.id ||
        actualGroupIds[0] ||
        null;

      const groupIdsChanged =
        actualGroupIds.length !== storedGroupIds.length ||
        actualGroupIds.some((groupId) => !storedGroupIds.includes(groupId));
      const activeGroupChanged = (profile.activeGroupId || null) !== nextActiveGroupId;

      if (!groupIdsChanged && !activeGroupChanged) {
        return;
      }

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        groupIds: actualGroupIds,
        activeGroupId: nextActiveGroupId,
        updatedAt: serverTimestamp(),
      });

      (onProfileCreated || setInternalProfile)(
        buildNextProfile(profile, {
          groupIds: actualGroupIds,
          activeGroupId: nextActiveGroupId,
        })
      );
    }

    if (!user || !profile) {
      return;
    }

    void syncProfileGroups();
  }, [groups, onProfileCreated, profile, user]);

  const currentGroupId =
    groups.find((group) => group.id === profile?.activeGroupId)?.id ||
    groups[0]?.id ||
    null;
  const currentGroup =
    groups.find((group) => group.id === currentGroupId) || groups[0] || null;
  const profileGroupIds = Array.isArray(profile?.groupIds) ? profile.groupIds : [];
  const canAccessCurrentGroup =
    Boolean(user?.uid && currentGroup?.id) &&
    currentGroup.memberIds?.includes(user.uid) &&
    profileGroupIds.includes(currentGroup.id);

  const currentMembers = useMemo(() => {
    if (!currentGroup) return [];

    return (currentGroup.memberIds || []).map((memberId) => ({
      uid: memberId,
      username:
        currentGroup.memberNames?.[memberId] ||
        (memberId === user?.uid ? profile?.username : "Integrante"),
      photoURL:
        memberId === user?.uid
          ? profile?.photoURL || ""
          : memberProfiles[memberId]?.photoURL || "",
      avatarPreset:
        memberId === user?.uid
          ? profile?.avatarPreset || ""
          : memberProfiles[memberId]?.avatarPreset || "",
    }));
  }, [currentGroup, memberProfiles, profile?.avatarPreset, profile?.photoURL, profile?.username, user?.uid]);

  const memberNames = useMemo(() => {
    return currentMembers.reduce((accumulator, member) => {
      accumulator[member.uid] = member.username;
      return accumulator;
    }, {});
  }, [currentMembers]);

  const memberPhotos = useMemo(() => {
    return currentMembers.reduce((accumulator, member) => {
      accumulator[member.uid] = member.photoURL || "";
      return accumulator;
    }, {});
  }, [currentMembers]);

  const memberAvatarPresets = useMemo(() => {
    return currentMembers.reduce((accumulator, member) => {
      accumulator[member.uid] = member.avatarPreset || "";
      return accumulator;
    }, {});
  }, [currentMembers]);

  useEffect(() => {
    if (!user || !profile || !currentGroup?.id || !canAccessCurrentGroup) {
      setTransactions([]);
      setTransactionsError("");
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    setTransactionsError("");

    const transactionsQuery = query(
      transactionsCollection,
      where("groupId", "==", currentGroup.id)
    );

    const unsubscribeFirestore = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const transactionsFromDb = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setTransactions(sortTransactionsByCreatedAt(transactionsFromDb));
        setTransactionsError("");
        setIsLoading(false);
      },
      (error) => {
        console.error("Error al leer movimientos:", error);
        setTransactions([]);
        setTransactionsError(
          "Firestore rechazo la lectura de movimientos. Revisa las reglas y publica firestore.rules."
        );
        setIsLoading(false);
      }
    );

    return () => unsubscribeFirestore();
  }, [canAccessCurrentGroup, currentGroup?.id, profile, transactionsCollection, user]);

  useEffect(() => {
    setVisibleTransactionsCount(PAGE_SIZE);
  }, [currentGroup?.id, transactions.length]);

  useEffect(() => {
    if (!user?.uid || !currentGroup?.id) {
      setLastSeenAt(null);
      return;
    }

    const storageKey = `miticuenta:last-seen:${user.uid}:${currentGroup.id}`;

    try {
      const storedValue = window.localStorage.getItem(storageKey);
      const parsedValue = storedValue ? Number(storedValue) : NaN;

      setLastSeenAt(Number.isFinite(parsedValue) ? parsedValue : null);
      window.localStorage.setItem(storageKey, String(Date.now()));
    } catch (error) {
      console.error("No se pudo guardar la ultima visita:", error);
      setLastSeenAt(null);
    }
  }, [currentGroup?.id, user?.uid]);

  useEffect(() => {
    async function loadMemberProfiles() {
      if (!currentGroup?.memberIds?.length || !canAccessCurrentGroup) {
        setMemberProfiles({});
        return;
      }

      try {
        const memberEntries = await Promise.all(
          currentGroup.memberIds.map(async (memberId) => {
            const userDoc = await getDoc(doc(db, "users", memberId));

            if (!userDoc.exists()) {
              return [memberId, { photoURL: "", avatarPreset: "" }];
            }

            const memberData = userDoc.data();
            return [
              memberId,
              {
                photoURL: memberData.photoURL || "",
                avatarPreset: memberData.avatarPreset || "",
              },
            ];
          })
        );

        setMemberProfiles(Object.fromEntries(memberEntries));
      } catch (error) {
        console.error("Error al cargar perfiles de miembros:", error);
        setMemberProfiles({});
      }
    }

    loadMemberProfiles();
  }, [canAccessCurrentGroup, currentGroup?.id, currentGroup?.memberIds]);

  const otherMemberName =
    currentMembers.find((member) => member.uid !== user?.uid)?.username || "";
  const currentMemberName =
    currentMembers.find((member) => member.uid === user?.uid)?.username ||
    profile?.username ||
    "";
  // La vista actual y el algoritmo de balance asumen grupos de 2 miembros.
  const balance = calculateBalance(transactions, currentMembers, user?.uid);
  const visibleTransactions = transactions.slice(0, visibleTransactionsCount);
  const hasMoreTransactions = transactions.length > visibleTransactions.length;
  const isBalanced = currentGroup && currentMembers.length === 2 && balance === 0;
  const hasCounterpart = currentGroup && currentMembers.length === 2;
  const balanceAmountLabel = `$${formatCurrencyAmount(Math.abs(balance))}`;
  const balanceAmountParts = splitCurrencyAmount(Math.abs(balance));
  const balanceAmountGroups = balanceAmountParts.integerPart.split(".");

  function getHeroBalanceSummary() {
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
        amount: "••••••",
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
        amount: balanceAmountLabel,
      };
    }

    if (balance < 0) {
      return {
        title: `Saldo a favor de ${otherMemberName}:`,
        amount: balanceAmountLabel,
      };
    }

    return {
      title: `Estan a mano con ${otherMemberName}`,
      amount: "",
    };
  }

  const heroBalanceSummary = getHeroBalanceSummary();

  async function persistProfileUpdate(updates) {
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    const nextProfile = buildNextProfile(profile, updates);
    (onProfileCreated || setInternalProfile)(nextProfile);
    return nextProfile;
  }

  async function handleCreateGroup(event) {
    event.preventDefault();
    setGroupError("");

    const cleanName = newGroupName.trim();

    if (cleanName.length < 3) {
      setGroupError("El nombre del grupo debe tener al menos 3 caracteres.");
      return;
    }

    if (cleanName.length > GROUP_NAME_MAX_LENGTH) {
      setGroupError(`El nombre del grupo no puede superar ${GROUP_NAME_MAX_LENGTH} caracteres.`);
      return;
    }

    if (creatingGroup || joiningGroup) {
      return;
    }

    setCreatingGroup(true);

    try {
      const groupRef = doc(groupsCollection);
      const nextGroupIds = [...new Set([...groups.map((group) => group.id), groupRef.id])];

      await setDoc(groupRef, {
        name: cleanName,
        createdBy: user.uid,
        memberIds: [user.uid],
        memberNames: {
          [user.uid]: profile.username,
        },
        inviteCode: createInviteCode(),
        maxMembers: MAX_GROUP_MEMBERS,
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await persistProfileUpdate({
        activeGroupId: groupRef.id,
        groupIds: nextGroupIds,
      });

      setNewGroupName("");
      setGroupSheetOpen(false);
      setUiToast("Grupo creado");
    } catch (error) {
      console.error("Error al crear grupo:", error);
      setGroupError("No se pudo crear el grupo.");
    } finally {
      setCreatingGroup(false);
    }
  }

  async function handleJoinGroup(event) {
    event.preventDefault();
    setGroupError("");

    const cleanCode = joinCode.trim().toUpperCase();

    if (!cleanCode) {
      setGroupError("Ingresa un codigo de invitacion.");
      return;
    }

    if (creatingGroup || joiningGroup) {
      return;
    }

    setJoiningGroup(true);

    try {
      // Unirse por codigo actualiza el grupo y tambien el perfil del usuario
      // para que el selector lo muestre disponible de inmediato.
      const groupQuery = query(
        groupsCollection,
        where("inviteCode", "==", cleanCode),
        limit(1)
      );
      const groupSnapshot = await getDocs(groupQuery);

      if (groupSnapshot.empty) {
        setGroupError("No existe un grupo con ese codigo.");
        return;
      }

      const groupDoc = groupSnapshot.docs[0];
      const groupData = groupDoc.data();
      const memberIds = Array.isArray(groupData.memberIds)
        ? groupData.memberIds
        : [];
      const maxMembers = Math.min(
        Number(groupData.maxMembers) || MAX_GROUP_MEMBERS,
        MAX_GROUP_MEMBERS
      );

      if (
        !memberIds.includes(user.uid) &&
        memberIds.length >= maxMembers
      ) {
        setGroupError("Ese grupo ya alcanzo el limite de 2 personas.");
        return;
      }

      const nextMemberIds = memberIds.includes(user.uid)
        ? memberIds
        : [...memberIds, user.uid];
      const nextMemberNames = {
        ...(groupData.memberNames || {}),
        [user.uid]: profile.username,
      };
      const nextGroupIds = [...new Set([...groups.map((group) => group.id), groupDoc.id])];

      await setDoc(
        doc(db, "groups", groupDoc.id),
        {
          memberIds: nextMemberIds,
          memberNames: nextMemberNames,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await persistProfileUpdate({
        activeGroupId: groupDoc.id,
        groupIds: nextGroupIds,
      });

      setJoinCode("");
      setGroupSheetOpen(false);
      setUiToast("Te uniste al grupo");
    } catch (error) {
      console.error("Error al unirse al grupo:", error);
      setGroupError("No se pudo unir al grupo.");
    } finally {
      setJoiningGroup(false);
    }
  }

  async function handleChangeGroup(groupId) {
    if (!groupId || groupId === currentGroupId) {
      return;
    }

    setGroupError("");

    try {
      await persistProfileUpdate({
        activeGroupId: groupId,
      });
      setEditingTransaction(null);
      setComposerOpen(false);
    } catch (error) {
      console.error("Error al cambiar de grupo:", error);
      setGroupError("No se pudo cambiar el grupo activo.");
    }
  }

  async function handleCopyInviteCode() {
    if (!currentGroup?.inviteCode || copyingInvite) {
      return;
    }

    setGroupError("");
    setCopyingInvite(true);

    try {
      await navigator.clipboard.writeText(currentGroup.inviteCode);
      setUiToast("Codigo copiado");
    } catch (error) {
      console.error("Error al copiar codigo:", error);
      setGroupError(`No se pudo copiar el codigo. Es: ${currentGroup.inviteCode}`);
    } finally {
      setCopyingInvite(false);
    }
  }

  async function handleLeaveGroup() {
    if (!currentGroup || !user || !profile) {
      return;
    }

    if (currentGroup.createdBy === user.uid) {
      setGroupError("El admin no puede salir del grupo.");
      return;
    }

    const confirmed = window.confirm(
      "Seguro que quieres salir del grupo? Tus movimientos quedaran en el historial."
    );

    if (!confirmed) {
      return;
    }

    setGroupError("");
    setLeavingGroup(true);

    try {
      const nextMemberIds = (currentGroup.memberIds || []).filter(
        (memberId) => memberId !== user.uid
      );
      const nextMemberNames = { ...(currentGroup.memberNames || {}) };
      delete nextMemberNames[user.uid];

      await setDoc(
        doc(db, "groups", currentGroup.id),
        {
          memberIds: nextMemberIds,
          memberNames: nextMemberNames,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      const nextGroupIds = groups
        .map((group) => group.id)
        .filter((groupId) => groupId !== currentGroup.id);

      await persistProfileUpdate({
        groupIds: nextGroupIds,
        activeGroupId:
          profile.activeGroupId === currentGroup.id ? nextGroupIds[0] || null : profile.activeGroupId,
      });

      setEditingTransaction(null);
      setComposerOpen(false);
      setUiToast("Saliste del grupo");
    } catch (error) {
      console.error("Error al salir del grupo:", error);
      setGroupError("No se pudo salir del grupo.");
    } finally {
      setLeavingGroup(false);
    }
  }

  async function handleRemoveMember(memberId) {
    if (!currentGroup || !user) {
      return;
    }

    if (currentGroup.createdBy !== user.uid) {
      setGroupError("Solo el admin puede sacar integrantes.");
      return;
    }

    if (memberId === user.uid) {
      setGroupError("El admin no puede sacarse del grupo.");
      return;
    }

    const confirmed = window.confirm(
      "Seguro que quieres sacar a esta persona del grupo? Sus movimientos quedaran en el historial."
    );

    if (!confirmed) {
      return;
    }

    setGroupError("");
    setRemovingMemberId(memberId);

    try {
      const nextMemberIds = (currentGroup.memberIds || []).filter(
        (currentMemberId) => currentMemberId !== memberId
      );
      const nextMemberNames = { ...(currentGroup.memberNames || {}) };
      delete nextMemberNames[memberId];

      await setDoc(
        doc(db, "groups", currentGroup.id),
        {
          memberIds: nextMemberIds,
          memberNames: nextMemberNames,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setUiToast("Integrante eliminado");
    } catch (error) {
      console.error("Error al sacar integrante:", error);
      setGroupError("No se pudo sacar a la persona del grupo.");
    } finally {
      setRemovingMemberId("");
    }
  }

  async function handleSaveTransaction(transactionData) {
    if (!currentGroup?.id) {
      setSaveError("Primero debes crear o unirte a un grupo.");
      return false;
    }

    setSaveError("");
    setIsSaving(true);

    try {
      if (editingTransaction) {
        if (editingTransaction.createdByUserId !== user.uid) {
          setSaveError("Solo puedes editar movimientos creados por ti.");
          return false;
        }

        await updateDoc(doc(db, "transactions", editingTransaction.id), {
          ...transactionData,
          groupId: currentGroup.id,
          updatedAt: serverTimestamp(),
        });
        setEditingTransaction(null);
        setComposerOpen(false);
        setUiToast("Movimiento actualizado");
      } else {
        await addDoc(transactionsCollection, {
          ...transactionData,
          groupId: currentGroup.id,
          createdByUserId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setComposerOpen(false);
        setUiToast("Movimiento guardado");
      }

      return true;
    } catch (error) {
      console.error("Error al guardar movimiento:", error);
      if (error?.code === "permission-denied") {
        setSaveError("Solo el creador del movimiento puede editarlo.");
      } else {
        setSaveError(
          "Firestore rechazo el guardado. Revisa las reglas y publica firestore.rules."
        );
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditTransaction(transaction) {
    setSaveError("");

    if (transaction.createdByUserId !== user.uid) {
      setSaveError("Solo puedes editar movimientos creados por ti.");
      return;
    }

    setEditingTransaction(transaction);
    setComposerOpen(true);
  }

  async function handleDeleteTransaction(transaction) {
    setSaveError("");

    if (transaction.createdByUserId !== user.uid) {
      setSaveError("Solo puedes borrar movimientos creados por ti.");
      return;
    }

    const confirmed = window.confirm(
      "Seguro que quieres borrar este movimiento?"
    );

    if (!confirmed) {
      return;
    }

    setDeletingTransactionId(transaction.id);

    try {
      await deleteDoc(doc(db, "transactions", transaction.id));

      if (editingTransaction?.id === transaction.id) {
        setEditingTransaction(null);
      }
    } catch (error) {
      console.error("Error al borrar movimiento:", error);
      if (error?.code === "permission-denied") {
        setSaveError("Solo el creador del movimiento puede borrarlo.");
      } else {
        setSaveError("No se pudo borrar el movimiento.");
      }
    } finally {
      setDeletingTransactionId("");
    }
  }

  async function handleDeleteGroup() {
    if (!currentGroup) {
      return;
    }

    if (currentGroup.createdBy !== user.uid) {
      setGroupError("Solo el creador del grupo puede borrarlo.");
      return;
    }

    const confirmed = window.confirm(
      "Seguro que quieres borrar este grupo? Se eliminaran tambien sus movimientos para todos."
    );

    if (!confirmed) {
      return;
    }

    setGroupError("");
    setDeletingGroupId(currentGroup.id);

    try {
      const batch = writeBatch(db);
      const groupIdToDelete = currentGroup.id;

      // Borrar el grupo y sus movimientos debe funcionar con las reglas actuales.
      // La sincronizacion posterior de `groupIds` y `activeGroupId` de cada perfil
      // la resuelve el efecto `syncProfileGroups` cuando cada integrante vuelve a cargar.
      batch.delete(doc(db, "groups", groupIdToDelete));

      const transactionSnapshot = await getDocs(
        query(transactionsCollection, where("groupId", "==", groupIdToDelete))
      );

      transactionSnapshot.docs.forEach((transactionDoc) => {
        batch.delete(doc(db, "transactions", transactionDoc.id));
      });

      await batch.commit();

      const nextGroupIds = groups
        .map((group) => group.id)
        .filter((groupId) => groupId !== groupIdToDelete);

      (onProfileCreated || setInternalProfile)(
        buildNextProfile(profile, {
          groupIds: nextGroupIds,
          activeGroupId:
            profile.activeGroupId === groupIdToDelete
              ? nextGroupIds[0] || null
              : profile.activeGroupId,
        })
      );

      setEditingTransaction(null);
      setTransactions([]);
      setComposerOpen(false);
    } catch (error) {
      console.error("Error al borrar grupo:", error);
      setGroupError("No se pudo borrar el grupo.");
    } finally {
      setDeletingGroupId("");
    }
  }

  function handleOpenComposer() {
    setSaveError("");
    setEditingTransaction(null);
    setComposerOpen(true);
  }

  function handleCloseComposer() {
    setEditingTransaction(null);
    setComposerOpen(false);
  }

  function handleLoadMoreTransactions() {
    setVisibleTransactionsCount((currentValue) => currentValue + PAGE_SIZE);
  }

  async function handleSaveProfile({ username, avatarPreset }) {
    if (!user || !profile) {
      return false;
    }

    setProfileSaveError("");

    const cleanUsername = username.trim();
    const usernameLower = cleanUsername.toLowerCase();

    if (cleanUsername.length < 3) {
      setProfileSaveError("El nombre de usuario debe tener al menos 3 caracteres.");
      return false;
    }

    const currentUsernameLower = (profile.usernameLower || "").toLowerCase();
    const nextAvatarPreset = avatarPreset || "";

    if (
      usernameLower === currentUsernameLower &&
      nextAvatarPreset === (profile.avatarPreset || "")
    ) {
      setProfileSheetOpen(false);
      return true;
    }

    setProfileSaving(true);

    try {
      const nextUsernameRef = doc(db, "usernames", usernameLower);
      const nextUsernameSnap = await getDoc(nextUsernameRef);

      if (nextUsernameSnap.exists() && nextUsernameSnap.data().uid !== user.uid) {
        setProfileSaveError("Ese nombre de usuario ya esta en uso.");
        return false;
      }

      const batch = writeBatch(db);

      batch.update(doc(db, "users", user.uid), {
        username: cleanUsername,
        usernameLower,
        avatarPreset: nextAvatarPreset,
        updatedAt: serverTimestamp(),
      });

      batch.set(
        nextUsernameRef,
        {
          uid: user.uid,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (currentUsernameLower && currentUsernameLower !== usernameLower) {
        batch.delete(doc(db, "usernames", currentUsernameLower));
      }

      // El username visible debe mantenerse sincronizado dentro de cada grupo
      // donde el usuario ya figura como miembro.
      for (const groupId of groups.map((group) => group.id)) {
        batch.update(doc(db, "groups", groupId), {
          [`memberNames.${user.uid}`]: cleanUsername,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      const nextProfile = buildNextProfile(profile, {
        username: cleanUsername,
        usernameLower,
        avatarPreset: nextAvatarPreset,
      });

      (onProfileCreated || setInternalProfile)(nextProfile);
      setProfileSheetOpen(false);
      return true;
    } catch (error) {
      console.error("Error al guardar perfil:", error);
      setProfileSaveError("No se pudo actualizar el perfil.");
      return false;
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleInstallApp() {
    if (!installPromptEvent) {
      return;
    }

    await installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
    setProfileSheetOpen(false);
  }

  async function handleLogoClick() {
    playLogoSoundSequence();
    setLogoBubble(true);
    window.setTimeout(() => setLogoBubble(false), 1400);
  }

  if (user === undefined || profile === undefined) {
    return (
      <main className="container">
        <div className="card" style={{ marginTop: "80px", textAlign: "center" }}>
          <p>Cargando...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<SheetFallback />}>
        <Login />
      </Suspense>
    );
  }

  if (!profile || !profile.username?.trim()) {
    return (
      <Suspense fallback={<SheetFallback />}>
        <CompleteProfile
          user={user}
          profile={profile}
          onProfileCreated={onProfileCreated || setInternalProfile}
        />
      </Suspense>
    );
  }

  return (
    <main className="container">
      <header className="app-shell-header">
        <div className="header-identity-card">
          <div className="header-identity">
            <button
              type="button"
              className="header-logo-button"
              onClick={handleLogoClick}
              aria-label="Activar sonido del logo"
            >
              <img
                src="/icon-32.png"
                alt="Logo de Miticuenta"
                className="header-logo"
              />
              {logoBubble ? <span className="header-logo-bubble">miau</span> : null}
            </button>
            <div className="app-shell-copy">
              <p className="header-kicker">Miticuenta</p>
              <p className="header-user">{profile.username}</p>
            </div>
          </div>
          <div className="header-status-row">
            <span className="header-status-chip">
              {currentGroup ? `Grupo actual: ${currentGroup.name}` : "Sin grupo activo"}
            </span>
            <span className="header-status-chip header-status-chip-soft">
              {currentGroup
                ? `${currentMembers.length} ${currentMembers.length === 1 ? "integrante" : "integrantes"}`
                : "Empieza creando un grupo"}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className={`button button-ghost ${
              groupSheetOpen ? "header-action-active" : ""
            }`}
            onClick={() => setGroupSheetOpen(true)}
          >
            Grupo
          </button>
          {currentGroup ? (
            <button
              type="button"
              className="button button-ghost"
              onClick={() => setStatisticsSheetOpen(true)}
            >
              Estadisticas
            </button>
          ) : null}
          <button
            type="button"
            className="button button-ghost"
            onClick={() => {
              setProfileSaveError("");
              setProfileSheetOpen(true);
            }}
          >
            Perfil
          </button>
          {onLogout ? (
            <button
              type="button"
              className="button button-ghost"
              onClick={onLogout}
            >
              Cerrar sesion
            </button>
          ) : null}
        </div>
      </header>

      {uiToast ? <div className="app-toast">{uiToast}</div> : null}

      <section className="hero-panel">
        <div className="hero-panel-content">
          <p className="section-eyebrow">Resumen rapido</p>
          <h2>{currentGroup ? currentGroup.name : "Sin grupo activo"}</h2>
          {currentGroup ? (
            <div
              className={`hero-balance-card ${
                !hasCounterpart && !isLoading ? "hero-balance-card-actionable" : ""
              }`}
              onClick={
                !hasCounterpart && !isLoading
                  ? () => setGroupSheetOpen(true)
                  : undefined
              }
              role={!hasCounterpart && !isLoading ? "button" : undefined}
              tabIndex={!hasCounterpart && !isLoading ? 0 : undefined}
              onKeyDown={
                !hasCounterpart && !isLoading
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setGroupSheetOpen(true);
                      }
                    }
                  : undefined
              }
            >
              <div className="hero-balance-head">
                <span className="hero-balance-label">
                  {isLoading
                    ? "Actualizando balance"
                    : isBalanced
                    ? "Balance al dia"
                    : hasCounterpart
                    ? "Balance actual"
                    : "Esperando otro integrante"}
                </span>
                <button
                  type="button"
                  className={`hero-balance-toggle ${
                    isBalanceHidden ? "is-hidden" : ""
                  }`}
                  aria-label={
                    isBalanceHidden ? "Mostrar saldo actual" : "Ocultar saldo actual"
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsBalanceHidden((currentValue) => !currentValue);
                  }}
                >
                  <span className="hero-balance-eye" aria-hidden="true">
                    <span className="hero-balance-eye-pupil" />
                  </span>
                </button>
              </div>
              <div className="hero-balance-body">
                <p className="hero-balance-title">{heroBalanceSummary.title}</p>
                {heroBalanceSummary.amount ? (
                  <p
                    className={`hero-balance-value ${
                      isBalanceHidden ? "hero-balance-value-hidden" : ""
                    }`}
                  >
                    {isBalanceHidden ? (
                      heroBalanceSummary.amount
                    ) : (
                      <>
                        <span className="hero-balance-currency">$</span>
                        <span className="hero-balance-integer">
                          {balanceAmountGroups.map((group, index) => (
                            <span key={`${group}-${index}`} className="hero-balance-group">
                              {group}
                              {index < balanceAmountGroups.length - 1 ? (
                                <span className="hero-balance-separator">.</span>
                              ) : null}
                            </span>
                          ))}
                        </span>
                        <span className="hero-balance-decimal">
                          ,{balanceAmountParts.decimalPart}
                        </span>
                      </>
                    )}
                  </p>
                ) : null}
              </div>
              {!isLoading && !hasCounterpart ? (
                <p className="hero-panel-copy">
                  Cuando se sume otra persona, vas a ver aca como quedan las cuentas.
                </p>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              className="hero-empty-card"
              onClick={() => setGroupSheetOpen(true)}
            >
              <span className="hero-empty-badge">Empeza por un grupo</span>
              <p className="hero-panel-copy">
                Crea un grupo nuevo o unite con un codigo para empezar a registrar
                gastos, transferencias y movimientos compartidos.
              </p>
            </button>
          )}
          {currentMembers.length > 0 ? (
            <div className="member-pill-row">
              {currentMembers.map((member) => (
                <div key={member.uid} className="member-pill" title={member.username}>
                  <UserAvatar
                    photoURL={member.avatarPreset ? "" : member.photoURL}
                    avatarPreset={member.avatarPreset}
                    alt={`Avatar de ${member.username}`}
                    className="member-pill-avatar"
                    fallbackClassName="member-pill-avatar-fallback"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {currentGroup ? (
          <button
            type="button"
            className="button hero-panel-button"
            onClick={handleOpenComposer}
          >
            + Agregar movimiento
          </button>
        ) : null}
      </section>

      {transactionsError ? (
        <section
          className="card"
          style={{ borderColor: "#f2b8b5", backgroundColor: "#fff5f4" }}
        >
          <p style={{ color: "#b42318" }}>{transactionsError}</p>
        </section>
      ) : null}

      {saveError ? (
        <section
          className="card"
          style={{ borderColor: "#f2b8b5", backgroundColor: "#fff5f4" }}
        >
          <p style={{ color: "#b42318" }}>{saveError}</p>
        </section>
      ) : null}

      {currentGroup ? (
        <div className="card">
          <TransactionList
            transactions={visibleTransactions}
            memberNames={memberNames}
            memberPhotos={memberPhotos}
            memberAvatarPresets={memberAvatarPresets}
            currentUserId={user.uid}
            lastSeenAt={lastSeenAt}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            deletingId={deletingTransactionId}
            hasMore={hasMoreTransactions}
            onLoadMore={handleLoadMoreTransactions}
          />
        </div>
      ) : (
        <section className="card empty-state empty-state-prominent">
          <p className="empty-state-title">Tu historial va a aparecer aca</p>
          <p className="empty-state-copy">
            Apenas tengas un grupo activo, vas a poder anotar gastos, dar dinero y
            seguir todo el movimiento desde un solo lugar.
          </p>
        </section>
      )}

      {currentGroup ? (
        <>
          <button
            type="button"
            className="composer-fab"
            onClick={handleOpenComposer}
          >
            +
          </button>

          <div
            className={`composer-sheet-backdrop ${composerOpen ? "is-open" : ""}`}
            onClick={handleCloseComposer}
          />

          <aside className={`composer-sheet ${composerOpen ? "is-open" : ""}`}>
            <button
              type="button"
              className="composer-sheet-close"
              onClick={handleCloseComposer}
            >
              Cerrar
            </button>
            <Suspense fallback={<SheetFallback />}>
              <TransactionForm
                key={`${currentGroup.id}-${editingTransaction?.id || "new"}-${user.uid}`}
                members={currentMembers}
                currentUserId={user.uid}
                onSaveTransaction={handleSaveTransaction}
                initialValues={editingTransaction}
                isSaving={isSaving}
                onCancelEdit={handleCloseComposer}
              />
            </Suspense>
          </aside>
        </>
      ) : null}

      <Suspense fallback={null}>
        <GroupSheet
          isOpen={groupSheetOpen}
          onClose={() => setGroupSheetOpen(false)}
          groups={groups}
          groupsLoading={groupsLoading}
          currentGroup={currentGroup}
          currentUserId={user.uid}
          groupError={groupError}
          newGroupName={newGroupName}
          joinCode={joinCode}
          creatingGroup={creatingGroup}
          joiningGroup={joiningGroup}
          leavingGroup={leavingGroup}
          copyingInvite={copyingInvite}
          removingMemberId={removingMemberId}
          deletingGroupId={deletingGroupId}
          groupNameMaxLength={GROUP_NAME_MAX_LENGTH}
          inviteCodeLength={INVITE_CODE_LENGTH}
          onChangeGroup={handleChangeGroup}
          onCopyInviteCode={handleCopyInviteCode}
          onRemoveMember={handleRemoveMember}
          onDeleteGroup={handleDeleteGroup}
          onLeaveGroup={handleLeaveGroup}
          onCreateGroup={handleCreateGroup}
          onJoinGroup={handleJoinGroup}
          onNewGroupNameChange={setNewGroupName}
          onJoinCodeChange={setJoinCode}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ProfileSheet
          key={`${profile.uid}-${profile.username}-${profileSheetOpen ? "open" : "closed"}`}
          user={user}
          profile={profile}
          isOpen={profileSheetOpen}
          isSaving={profileSaving}
          error={profileSaveError}
          onClose={() => setProfileSheetOpen(false)}
          onSave={handleSaveProfile}
          onInstallApp={handleInstallApp}
          canInstallApp={Boolean(installPromptEvent)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <StatisticsSheet
          isOpen={statisticsSheetOpen}
          onClose={() => setStatisticsSheetOpen(false)}
          transactions={transactions}
          members={currentMembers}
          currentGroupName={currentGroup?.name || ""}
          currentGroupCreatedAt={currentGroup?.createdAt || null}
        />
      </Suspense>
    </main>
  );
}

export default HomePage;
