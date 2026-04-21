function ActionBar({
  fase,
  refuerzosDisponibles,
  canConfirmAttack,
  canConfirmMove,
  remainingMoves,
  onSetPhase,
  onConfirmAttack,
  onConfirmMove,
  onEndTurn,
  onResetSelection,
  disabled,
}) {
  return (
    <section className="action-bar">
      <div className="phase-actions">
        <button type="button" onClick={() => onSetPhase("refuerzo")} disabled={disabled || fase === "refuerzo"}>
          Reforzar
        </button>
        <button type="button" onClick={() => onSetPhase("ataque")} disabled={disabled || fase === "ataque"}>
          Atacar
        </button>
        <button type="button" onClick={() => onSetPhase("movimiento")} disabled={disabled || fase === "movimiento"}>
          Mover tropas
        </button>
      </div>

      <div className="turn-actions">
        <button type="button" onClick={onConfirmAttack} disabled={disabled || !canConfirmAttack}>
          Confirmar ataque
        </button>
        <button type="button" onClick={onConfirmMove} disabled={disabled || !canConfirmMove}>
          Confirmar movimiento
        </button>
        <button type="button" onClick={onResetSelection} disabled={disabled}>
          Limpiar selección
        </button>
        <button type="button" className="primary" onClick={onEndTurn} disabled={disabled}>
          Terminar turno
        </button>
      </div>

      <div className="action-meta">
        <span>Refuerzos: {refuerzosDisponibles}</span>
        <span>Movimientos restantes: {remainingMoves}</span>
      </div>
    </section>
  );
}

export default ActionBar;
