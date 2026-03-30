export default function GroupSheet({
  isOpen,
  onClose,
  groups,
  groupsLoading,
  currentGroup,
  currentUserId,
  groupError,
  newGroupName,
  joinCode,
  creatingGroup,
  joiningGroup,
  leavingGroup,
  copyingInvite,
  removingMemberId,
  deletingGroupId,
  groupNameMaxLength,
  inviteCodeLength,
  onChangeGroup,
  onCopyInviteCode,
  onRemoveMember,
  onDeleteGroup,
  onLeaveGroup,
  onCreateGroup,
  onJoinGroup,
  onNewGroupNameChange,
  onJoinCodeChange,
}) {
  const currentMemberCount = currentGroup?.memberIds?.length || 0;
  const showInviteCard = Boolean(currentGroup) && currentMemberCount < 2;

  return (
    <>
      <div
        className={`composer-sheet-backdrop ${isOpen ? "is-open" : ""}`}
        onClick={onClose}
      />

      <aside className={`composer-sheet statistics-sheet group-sheet ${isOpen ? "is-open" : ""}`}>
        <button type="button" className="composer-sheet-close" onClick={onClose}>
          Cerrar
        </button>

        <div className="composer-sheet-content">
          <header className="composer-sheet-header statistics-sheet-header">
            <p className="composer-sheet-eyebrow">Grupo</p>
            <h2>{currentGroup ? currentGroup.name : "Gestion del grupo"}</h2>
            <p className="composer-sheet-copy">
              {groups.length > 0
                ? `${groups.length} ${groups.length === 1 ? "grupo disponible" : "grupos disponibles"}`
                : "Crea o unite a tu primer grupo"}
            </p>
          </header>

          <section className="group-panel-body">
            {groupsLoading ? (
              <div className="group-panel-loading">Cargando grupos...</div>
            ) : null}

            {groups.length > 0 ? (
              <>
                <section className="group-section group-section-overview">
                  <p className="group-select-label">Selecciona grupo</p>
                  <div className="group-select-wrap">
                    <select
                      value={currentGroup?.id || ""}
                      onChange={(event) => onChangeGroup(event.target.value)}
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
                </section>

                {currentGroup ? (
                  <>
                    <section className="group-section group-section-members">
                      <div className="group-meta-grid">
                        {showInviteCard ? (
                          <div className="group-meta-card group-meta-card-invite">
                            <span>Invitacion</span>
                            <p className="group-meta-code">{currentGroup.inviteCode}</p>
                            <button
                              type="button"
                              className="button button-secondary group-meta-button"
                              onClick={onCopyInviteCode}
                              disabled={copyingInvite}
                            >
                              {copyingInvite ? "Copiando..." : "Copiar codigo"}
                            </button>
                          </div>
                        ) : null}
                        <div className="group-meta-card group-meta-card-members">
                          <span>Miembros</span>
                          <div className="group-members-list">
                            {(currentGroup.memberIds || []).map((memberId) => (
                              <div key={memberId} className="group-member-chip">
                                <span>
                                  {currentGroup.memberNames?.[memberId] || "Integrante"}
                                </span>
                                {currentGroup.createdBy === currentUserId &&
                                memberId !== currentUserId ? (
                                  <button
                                    type="button"
                                    className="group-member-remove"
                                    onClick={() => onRemoveMember(memberId)}
                                    disabled={removingMemberId === memberId}
                                    aria-label={`Sacar a ${currentGroup.memberNames?.[memberId] || "integrante"} del grupo`}
                                  >
                                    {removingMemberId === memberId ? "..." : "x"}
                                  </button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      {currentGroup.createdBy === currentUserId ? (
                        <button
                          type="button"
                          className="button button-danger"
                          disabled={deletingGroupId === currentGroup.id}
                          onClick={onDeleteGroup}
                        >
                          {deletingGroupId === currentGroup.id
                            ? "Borrando grupo..."
                            : "Borrar grupo"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="button button-secondary"
                          disabled={leavingGroup}
                          onClick={onLeaveGroup}
                        >
                          {leavingGroup ? "Saliendo..." : "Salir del grupo"}
                        </button>
                      )}
                    </section>
                  </>
                ) : null}
              </>
            ) : (
              <div className="group-panel-empty">
                <strong>Aun no tienes grupos</strong>
                <p>
                  Crea uno nuevo o usa un codigo de invitacion para empezar a
                  compartir gastos.
                </p>
              </div>
            )}

            <section className="group-actions group-section group-section-actions">
              <div className="group-actions-header">
                <p className="section-eyebrow">Acciones del grupo</p>
                <h3>Crear o unirse</h3>
                <p className="group-actions-copy">
                  Crea un grupo nuevo o entra con un codigo para seguir todo desde el
                  mismo espacio.
                </p>
              </div>

              <form
                onSubmit={onCreateGroup}
                className="form group-action-form group-action-form-create"
              >
                <label className="form-field">
                  <span className="form-field-label">Crear grupo</span>
                  <input
                    type="text"
                    placeholder="Nombre del grupo"
                    value={newGroupName}
                    maxLength={groupNameMaxLength}
                    onChange={(event) =>
                      onNewGroupNameChange(
                        event.target.value.slice(0, groupNameMaxLength)
                      )
                    }
                  />
                </label>
                <button
                  type="submit"
                  className="button"
                  disabled={creatingGroup || joiningGroup}
                >
                  {creatingGroup ? "Procesando..." : "Crear grupo"}
                </button>
              </form>

              <form
                onSubmit={onJoinGroup}
                className="form group-action-form group-action-form-join"
              >
                <label className="form-field">
                  <span className="form-field-label">Unirse con codigo</span>
                  <input
                    type="text"
                    placeholder="Codigo de invitacion"
                    value={joinCode}
                    maxLength={inviteCodeLength}
                    onChange={(event) =>
                      onJoinCodeChange(
                        event.target.value.toUpperCase().slice(0, inviteCodeLength)
                      )
                    }
                  />
                </label>
                <button
                  type="submit"
                  className="button button-secondary"
                  disabled={creatingGroup || joiningGroup}
                >
                  {joiningGroup ? "Procesando..." : "Unirme al grupo"}
                </button>
              </form>
            </section>

            {groupError ? <p className="inline-error">{groupError}</p> : null}
          </section>
        </div>
      </aside>
    </>
  );
}
