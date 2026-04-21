import { getJuego, setJuego } from "./gameState.js";

function crearError(mensaje, status = 400) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function esEnteroPositivo(valor) {
  return Number.isInteger(valor) && valor > 0;
}

function evaluarMisionJugador(juego, jugadorId) {
  const mision = juego.misiones?.[jugadorId];
  if (!mision) return false;

  if (mision.tipo === "controlar-region") {
    const region = juego.regiones?.[mision.regionId];
    if (!region) return false;
    return region.provincias.every((provinciaId) => {
      const provincia = juego.provincias.find((item) => item.id === provinciaId);
      return provincia?.owner === jugadorId;
    });
  }

  if (mision.tipo === "conquistar-cantidad") {
    const cantidad = juego.provincias.filter((provincia) => provincia.owner === jugadorId).length;
    return cantidad >= mision.objetivo;
  }

  if (mision.tipo === "fortificar-cantidad") {
    const tropasMinimas = mision.tropasMinimas || 3;
    const cantidad = juego.provincias.filter((provincia) => provincia.owner === jugadorId && provincia.cantTropas >= tropasMinimas).length;
    return cantidad >= mision.objetivo;
  }

  return false;
}

export function aplicarMovimiento({ origenId, destinoId, cantidad = 1, jugadorId }) {
  const juego = getJuego();

  if (!juego) {
    throw crearError("No hay juego inicializado", 500);
  }

  if (juego.ganador) {
    throw crearError("La partida ya finalizo", 409);
  }

  if (juego.fase !== "movimiento") {
    throw crearError("La fase actual no permite movimientos");
  }

  const jugadorActual = juego.jugadores[juego.turnoActual];
  if (!jugadorActual) {
    throw crearError("No se encontro el jugador del turno actual", 500);
  }

  if (jugadorId && jugadorId !== jugadorActual.id) {
    throw crearError("No es el turno del jugador indicado", 403);
  }

  if (!origenId || !destinoId) {
    throw crearError("Faltan origenId o destinoId");
  }

  if (!esEnteroPositivo(cantidad)) {
    throw crearError("La cantidad a mover debe ser un entero positivo");
  }

  if (juego.movimientoRealizado && !juego.movimientoExtraDisponible) {
    throw crearError("Ya se realizo un movimiento en este turno");
  }

  const origen = juego.provincias.find((provincia) => provincia.id === origenId);
  const destino = juego.provincias.find((provincia) => provincia.id === destinoId);

  if (!origen || !destino) {
    throw crearError("Provincia origen o destino no encontrada", 404);
  }

  if (origen.owner !== jugadorActual.id || destino.owner !== jugadorActual.id) {
    throw crearError("Solo se puede mover entre provincias propias", 403);
  }

  if (!origen.vecinos.includes(destino.id)) {
    throw crearError("La provincia destino no es vecina de la provincia origen");
  }

  if (origen.bloqueado) {
    throw crearError("La provincia origen esta bloqueada y no puede mover tropas");
  }

  if (origen.cantTropas - cantidad < 1) {
    throw crearError("No se puede dejar la provincia origen sin tropas");
  }

  origen.cantTropas -= cantidad;
  destino.cantTropas += cantidad;

  if (juego.movimientoRealizado && juego.movimientoExtraDisponible) {
    juego.movimientoExtraDisponible = false;
  } else {
    juego.movimientoRealizado = true;
  }

  if (!juego.ganador && evaluarMisionJugador(juego, jugadorActual.id)) {
    juego.ganador = jugadorActual.id;
    juego.ganadorPorMision = {
      jugadorId: jugadorActual.id,
      mision: juego.misiones?.[jugadorActual.id] || null,
    };
  }

  setJuego(juego);

  return {
    mensaje: "Movimiento aplicado",
    jugadorActual: {
      id: jugadorActual.id,
      nombre: jugadorActual.nombre,
      tipo: jugadorActual.tipo,
    },
    movimiento: {
      origenId,
      destinoId,
      cantidad,
    },
    origen,
    destino,
    movimientoRealizado: juego.movimientoRealizado,
    juego,
  };
}
