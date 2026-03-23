import { useEffect, useMemo, useState } from "react";
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
import TransactionForm from "../components/TransactionForm";
import TransactionList from "../components/TransactionList";
import ProfileSheet from "../components/ProfileSheet";
import UserAvatar from "../components/UserAvatar";
import Login from "../components/login";
import CompleteProfile from "../components/CompleteProfile";
import { calculateBalance, getBalanceMessage } from "../utils/balance";
import { db, auth } from "../firebase";

const PAGE_SIZE = 10;

function sortTransactionsByCreatedAt(items) {
  return [...items].sort((left, right) => {
    const leftSeconds = left.createdAt?.seconds || 0;
    const rightSeconds = right.createdAt?.seconds || 0;
    return rightSeconds - leftSeconds;
  });
}

function buildNextProfile(profile, updates) {
  return {
    ...profile,
    ...updates,
  };
}

function createInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
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
  const [groupActionLoading, setGroupActionLoading] = useState(false);
  const [groupsExpanded, setGroupsExpanded] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [visibleTransactionsCount, setVisibleTransactionsCount] = useState(PAGE_SIZE);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [profileSaveError, setProfileSaveError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);

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

  const transactionsCollection = useMemo(() => collection(db, "transactions"), []);
  const groupsCollection = useMemo(() => collection(db, "groups"), []);

  useEffect(() => {
    async function loadGroups() {
      const groupIds = Array.isArray(profile?.groupIds) ? profile.groupIds : [];

      if (!user || !profile || groupIds.length === 0) {
        setGroups([]);
        setGroupsLoading(false);
        return;
      }

      setGroupsLoading(true);

      try {
        // Se cargan solo los grupos referenciados por el perfil del usuario.
        const groupDocs = await Promise.all(
          groupIds.map((groupId) => getDoc(doc(db, "groups", groupId)))
        );

        const nextGroups = groupDocs
          .filter((groupDoc) => groupDoc.exists())
          .map((groupDoc) => ({
            id: groupDoc.id,
            ...groupDoc.data(),
          }));

        setGroups(nextGroups);
      } catch (error) {
        console.error("Error al cargar grupos:", error);
        setGroupError("No se pudieron cargar tus grupos.");
      } finally {
        setGroupsLoading(false);
      }
    }

    loadGroups();
  }, [profile, user]);

  const currentGroupId = profile?.activeGroupId || profile?.groupIds?.[0] || null;
  const currentGroup =
    groups.find((group) => group.id === currentGroupId) || groups[0] || null;

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
    if (!user || !profile || !currentGroup?.id) {
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
  }, [currentGroup?.id, profile, transactionsCollection, user]);

  useEffect(() => {
    setVisibleTransactionsCount(PAGE_SIZE);
  }, [currentGroup?.id, transactions.length]);

  useEffect(() => {
    async function loadMemberProfiles() {
      if (!currentGroup?.memberIds?.length) {
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
  }, [currentGroup?.id, currentGroup?.memberIds]);

  const otherMemberName =
    currentMembers.find((member) => member.uid !== user?.uid)?.username || "";
  // La vista actual y el algoritmo de balance asumen grupos de 2 miembros.
  const balance = calculateBalance(transactions, currentMembers, user?.uid);
  const balanceMessage = getBalanceMessage(balance, otherMemberName);
  const visibleTransactions = transactions.slice(0, visibleTransactionsCount);
  const hasMoreTransactions = transactions.length > visibleTransactions.length;

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

    setGroupActionLoading(true);

    try {
      const groupRef = doc(groupsCollection);
      const nextGroupIds = [...new Set([...(profile.groupIds || []), groupRef.id])];

      await setDoc(groupRef, {
        name: cleanName,
        createdBy: user.uid,
        memberIds: [user.uid],
        memberNames: {
          [user.uid]: profile.username,
        },
        inviteCode: createInviteCode(),
        maxMembers: 2,
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await persistProfileUpdate({
        activeGroupId: groupRef.id,
        groupIds: nextGroupIds,
      });

      setNewGroupName("");
      setGroupsExpanded(false);
    } catch (error) {
      console.error("Error al crear grupo:", error);
      setGroupError("No se pudo crear el grupo.");
    } finally {
      setGroupActionLoading(false);
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

    setGroupActionLoading(true);

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

      if (
        !memberIds.includes(user.uid) &&
        memberIds.length >= (groupData.maxMembers || 2)
      ) {
        setGroupError("Ese grupo ya esta completo.");
        return;
      }

      const nextMemberIds = memberIds.includes(user.uid)
        ? memberIds
        : [...memberIds, user.uid];
      const nextMemberNames = {
        ...(groupData.memberNames || {}),
        [user.uid]: profile.username,
      };
      const nextGroupIds = [
        ...new Set([...(profile.groupIds || []), groupDoc.id]),
      ];

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
      setGroupsExpanded(false);
    } catch (error) {
      console.error("Error al unirse al grupo:", error);
      setGroupError("No se pudo unir al grupo.");
    } finally {
      setGroupActionLoading(false);
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
      } else {
        await addDoc(transactionsCollection, {
          ...transactionData,
          groupId: currentGroup.id,
          createdByUserId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setComposerOpen(false);
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
      "¿Seguro que quieres borrar este movimiento?"
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
      "¿Seguro que quieres borrar este grupo? Se eliminaran tambien sus movimientos para todos."
    );

    if (!confirmed) {
      return;
    }

    setGroupError("");
    setDeletingGroupId(currentGroup.id);

    try {
      const batch = writeBatch(db);
      const groupIdToDelete = currentGroup.id;

      // Borrar un grupo implica borrar sus movimientos y sacar ese groupId
      // de cada miembro para no dejar perfiles apuntando a un grupo inexistente.
      batch.delete(doc(db, "groups", groupIdToDelete));

      const transactionSnapshot = await getDocs(
        query(transactionsCollection, where("groupId", "==", groupIdToDelete))
      );

      transactionSnapshot.docs.forEach((transactionDoc) => {
        batch.delete(doc(db, "transactions", transactionDoc.id));
      });

      const memberIds = Array.isArray(currentGroup.memberIds)
        ? currentGroup.memberIds
        : [];

      const userSnapshots = await Promise.all(
        memberIds.map((memberId) => getDoc(doc(db, "users", memberId)))
      );

      userSnapshots.forEach((userSnapshot) => {
        if (!userSnapshot.exists()) {
          return;
        }

        const memberData = userSnapshot.data();
        const nextGroupIds = (memberData.groupIds || []).filter(
          (groupId) => groupId !== groupIdToDelete
        );
        const nextActiveGroupId =
          memberData.activeGroupId === groupIdToDelete
            ? nextGroupIds[0] || null
            : memberData.activeGroupId || null;

        batch.update(doc(db, "users", userSnapshot.id), {
          groupIds: nextGroupIds,
          activeGroupId: nextActiveGroupId,
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();

      const nextGroupIds = (profile.groupIds || []).filter(
        (groupId) => groupId !== groupIdToDelete
      );

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
      for (const groupId of profile.groupIds || []) {
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
    return <Login />;
  }

  if (!profile || !profile.username?.trim()) {
    return (
      <CompleteProfile
        user={user}
        profile={profile}
        onProfileCreated={onProfileCreated || setInternalProfile}
      />
    );
  }

  return (
    <main className="container">
      <header className="app-shell-header">
        <div className="app-shell-copy">
          <p className="header-meta">
            {profile.username}
            {currentGroup ? ` · Grupo actual: ${currentGroup.name}` : ""}
          </p>
        </div>
        <div className="header-actions">
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

      <section className="hero-panel">
        <div className="hero-panel-content">
          <p className="section-eyebrow">Resumen rapido</p>
          <h2>{currentGroup ? currentGroup.name : "Sin grupo activo"}</h2>
          <p className="hero-panel-copy">
            {isLoading
              ? "Actualizando balance y movimientos..."
              : currentGroup
              ? balanceMessage
              : "Crea o unete a un grupo para empezar a registrar movimientos."}
          </p>
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

      <section className="card group-panel">
        <button
          type="button"
          className="group-panel-toggle"
          onClick={() => setGroupsExpanded((currentValue) => !currentValue)}
        >
          <div>
            <p className="section-eyebrow">Grupos</p>
            <h2>{currentGroup ? currentGroup.name : "Sin grupo activo"}</h2>
          </div>
          <span>{groupsExpanded ? "Ocultar" : "Mostrar"}</span>
        </button>

        {groupsExpanded ? (
          <div className="group-panel-body">
            {groupsLoading ? <p>Cargando grupos...</p> : null}

            {groups.length > 0 ? (
              <>
                <p className="group-select-label">Selecciona grupo</p>
                <div className="group-select-wrap">
                  <select
                    value={currentGroup?.id || ""}
                    onChange={(event) => handleChangeGroup(event.target.value)}
                  >
                    {!currentGroup ? (
                      <option value="" disabled>
                        Selecciona grupo
                      </option>
                    ) : null}
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                {currentGroup ? (
                  <>
                    <div className="group-meta-grid">
                      <div className="group-meta-card">
                        <span>Codigo</span>
                        <strong>{currentGroup.inviteCode}</strong>
                      </div>
                      <div className="group-meta-card">
                        <span>Miembros</span>
                        <strong>
                          {(currentGroup.memberIds || [])
                            .map(
                              (memberId) =>
                                currentGroup.memberNames?.[memberId] || "Integrante"
                            )
                            .join(", ")}
                        </strong>
                      </div>
                    </div>
                    {currentGroup.createdBy === user.uid ? (
                      <button
                        type="button"
                        className="button button-danger"
                        disabled={deletingGroupId === currentGroup.id}
                        onClick={handleDeleteGroup}
                      >
                        {deletingGroupId === currentGroup.id
                          ? "Borrando grupo..."
                          : "Borrar grupo"}
                      </button>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : (
              <p className="group-panel-empty">
                Todavia no perteneces a ningun grupo.
              </p>
            )}

            <section className="group-actions">
              <div>
                <p className="section-eyebrow">Acciones del grupo</p>
                <h3>Crear o unirse</h3>
              </div>

              <form
                onSubmit={handleCreateGroup}
                className="form"
                style={{ marginBottom: "12px" }}
              >
                <input
                  type="text"
                  placeholder="Nombre del grupo"
                  value={newGroupName}
                  onChange={(event) => setNewGroupName(event.target.value)}
                />
                <button
                  type="submit"
                  className="button"
                  disabled={groupActionLoading}
                >
                  {groupActionLoading ? "Procesando..." : "Crear grupo"}
                </button>
              </form>

              <form onSubmit={handleJoinGroup} className="form">
                <input
                  type="text"
                  placeholder="Codigo de invitacion"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                />
                <button
                  type="submit"
                  className="button button-secondary"
                  disabled={groupActionLoading}
                >
                  {groupActionLoading ? "Procesando..." : "Unirme al grupo"}
                </button>
              </form>
            </section>
          </div>
        ) : null}

        {groupError ? <p className="inline-error">{groupError}</p> : null}
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
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            deletingId={deletingTransactionId}
            hasMore={hasMoreTransactions}
            onLoadMore={handleLoadMoreTransactions}
          />
        </div>
      ) : (
        <section className="card">
          <p>Crea o unete a un grupo para empezar a cargar movimientos.</p>
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
            <TransactionForm
              key={`${currentGroup.id}-${editingTransaction?.id || "new"}-${user.uid}`}
              members={currentMembers}
              currentUserId={user.uid}
              onSaveTransaction={handleSaveTransaction}
              initialValues={editingTransaction}
              isSaving={isSaving}
              onCancelEdit={handleCloseComposer}
            />
          </aside>
        </>
      ) : null}

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
    </main>
  );
}

export default HomePage;
