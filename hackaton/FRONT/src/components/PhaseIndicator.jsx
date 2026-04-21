function PhaseIndicator({ fase }) {
  const label = fase ? fase.toUpperCase() : "-";
  return <span className={`phase-pill phase-${fase}`}>{label}</span>;
}

export default PhaseIndicator;
