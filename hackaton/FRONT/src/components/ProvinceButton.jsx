function ProvinceButton({
  provincia,
  ownerColor,
  layout,
  isSelected,
  isValidTarget,
  isBlocked,
  onClick,
}) {
  const style = {
    left: `${layout.x}%`,
    top: `${layout.y}%`,
    width: `${layout.w}%`,
    height: `${layout.h}%`,
    "--owner-color": ownerColor,
  };

  return (
    <button
      type="button"
      className={`province-btn ${isSelected ? "selected" : ""} ${isValidTarget ? "valid-target" : ""} ${
        isBlocked ? "blocked" : ""
      }`}
      style={style}
      onClick={onClick}
      title={provincia.nombre}
    >
      <span className="province-name">{provincia.nombre}</span>
      <span className="troop-badge">{provincia.cantTropas}</span>
      {isBlocked ? <span className="block-tag">Bloqueada</span> : null}
    </button>
  );
}

export default ProvinceButton;
