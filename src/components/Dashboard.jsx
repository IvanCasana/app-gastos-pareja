export default function Dashboard({ profile, onLogout }) {
  return (
    <div style={{ padding: 24 }}>
      <h1>Hola, {profile.username}</h1>
      <p>Bienvenido a tu app de gastos.</p>

      {profile.groupId ? (
        <p>Grupo actual: {profile.groupId}</p>
      ) : (
        <p>Todavia no estas en ningun grupo.</p>
      )}

      <button onClick={onLogout}>Cerrar sesion</button>
    </div>
  );
}
