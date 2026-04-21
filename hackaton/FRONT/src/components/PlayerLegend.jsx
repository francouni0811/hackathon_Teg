function PlayerLegend({ jugadores, jugadorActual }) {
  return (
    <section className="player-legend">
      {jugadores.map((jugador) => {
        const activo = jugadorActual?.id === jugador.id;
        return (
          <div key={jugador.id} className={`legend-item ${activo ? "active" : ""}`}>
            <span className="swatch" style={{ backgroundColor: jugador.color }} />
            <span>{jugador.nombre}</span>
          </div>
        );
      })}
    </section>
  );
}

export default PlayerLegend;
