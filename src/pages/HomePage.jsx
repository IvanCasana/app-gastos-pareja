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
import Login from "../components/login";
import CompleteProfile from "../components/CompleteProfile";
import { calculateBalance, getBalanceMessage } from "../utils/balance";
import { db, auth } from "../firebase";

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

  const user = externalUser ?? internalUser;
  const profile = externalProfile ?? internalProfile;
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
    }));
  }, [currentGroup, profile?.username, user?.uid]);

  const memberNames = useMemo(() => {
    return currentMembers.reduce((accumulator, member) => {
      accumulator[member.uid] = member.username;
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

  const otherMemberName =
    currentMembers.find((member) => member.uid !== user?.uid)?.username || "";
  const balance = calculateBalance(transactions, currentMembers, user?.uid);
  const balanceMessage = getBalanceMessage(balance, otherMemberName);

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
      } else {
        await addDoc(transactionsCollection, {
          ...transactionData,
          groupId: currentGroup.id,
          createdByUserId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
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
    } catch (error) {
      console.error("Error al borrar grupo:", error);
      setGroupError("No se pudo borrar el grupo.");
    } finally {
      setDeletingGroupId("");
    }
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <h1 className="title" style={{ marginBottom: "4px" }}>
            Gastos compartidos
          </h1>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            Usuario: {profile.username}
          </p>
        </div>
        {onLogout ? (
          <button
            type="button"
            className="button"
            style={{ width: "auto", padding: "10px 14px" }}
            onClick={onLogout}
          >
            Cerrar sesion
          </button>
        ) : null}
      </div>

      <section className="card">
        <h2 style={{ marginBottom: "12px" }}>Tus grupos</h2>

        {groupsLoading ? <p>Cargando grupos...</p> : null}

        {groups.length > 0 ? (
          <>
            <select
              value={currentGroup?.id || ""}
              onChange={(event) => handleChangeGroup(event.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "12px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
              }}
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>

            {currentGroup ? (
              <>
                <p style={{ marginBottom: "6px", color: "#6b7280" }}>
                  Codigo de invitacion: <strong>{currentGroup.inviteCode}</strong>
                </p>
                <p style={{ color: "#6b7280", fontSize: "14px" }}>
                  Miembros:{" "}
                  {(currentGroup.memberIds || [])
                    .map(
                      (memberId) =>
                        currentGroup.memberNames?.[memberId] || "Integrante"
                    )
                    .join(", ")}
                </p>
                {currentGroup.createdBy === user.uid ? (
                  <button
                    type="button"
                    className="button"
                    style={{
                      marginTop: "12px",
                      backgroundColor:
                        deletingGroupId === currentGroup.id ? "#9ca3af" : "#b42318",
                    }}
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
          <p style={{ marginBottom: "12px", color: "#6b7280" }}>
            Todavia no perteneces a ningun grupo.
          </p>
        )}

        {groupError ? (
          <p style={{ color: "#b42318", marginTop: "12px" }}>{groupError}</p>
        ) : null}
      </section>

      <section className="card">
        <h2 style={{ marginBottom: "12px" }}>Crear o unirse a un grupo</h2>

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

      <section className="card balance">
        <h2>Saldo actual</h2>
        <p>{isLoading ? "Cargando..." : balanceMessage}</p>
      </section>

      {currentGroup ? (
        <>
          <div className="card" style={{ opacity: isSaving ? 0.7 : 1 }}>
            <TransactionForm
              members={currentMembers}
              currentUserId={user.uid}
              onSaveTransaction={handleSaveTransaction}
              initialValues={editingTransaction}
              isSaving={isSaving}
              onCancelEdit={() => setEditingTransaction(null)}
            />
          </div>

          <div className="card">
            <TransactionList
              transactions={transactions}
              memberNames={memberNames}
              currentUserId={user.uid}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              deletingId={deletingTransactionId}
            />
          </div>
        </>
      ) : (
        <section className="card">
          <p>Crea o unete a un grupo para empezar a cargar movimientos.</p>
        </section>
      )}
    </main>
  );
}

export default HomePage;
