function EventBanner({ evento }) {
  if (!evento) {
    return <div className="event-banner muted">Sin evento activo</div>;
  }

  const descripcion = evento.descripcion || evento.detalle || "Evento de ronda en curso";

  return (
    <div className="event-banner">
      <strong>{evento.nombre}</strong>
      <span>{descripcion}</span>
    </div>
  );
}

export default EventBanner;
