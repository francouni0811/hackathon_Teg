function Province({
  provincia,
  ownerColor,
  geometry,
  isSelected,
  isValidTarget,
  onClick,
}) {
  const classes = ["province-shape"];

  if (isSelected) classes.push("selected");
  if (isValidTarget) classes.push("valid-target");
  if (provincia.bloqueado) classes.push("blocked");

  return (
    <g className="province-group" onClick={onClick} role="button" tabIndex={0} onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick();
      }
    }}>
      <title>{provincia.nombre}</title>

      <path className={classes.join(" ")} d={geometry.path} style={{ fill: ownerColor }} />

      {provincia.bloqueado ? <path className="province-block-layer" d={geometry.path} /> : null}

      <circle className="troop-node" cx={geometry.badge.x} cy={geometry.badge.y} r="16" />
      <text className="troop-count" x={geometry.badge.x} y={geometry.badge.y + 5}>
        {provincia.cantTropas}
      </text>
    </g>
  );
}

export default Province;
