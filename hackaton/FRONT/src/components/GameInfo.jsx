import PhaseIndicator from "./PhaseIndicator";

function GameInfo({ ronda, jugadorActual, fase }) {
  return (
    <header className="game-info">
      <div>
        <span className="label">Ronda</span>
        <strong>{ronda}</strong>
      </div>
      <div>
        <span className="label">Turno</span>
        <strong>{jugadorActual?.nombre ?? "-"}</strong>
      </div>
      <div>
        <span className="label">Fase</span>
        <PhaseIndicator fase={fase} />
      </div>
    </header>
  );
}

export default GameInfo;
