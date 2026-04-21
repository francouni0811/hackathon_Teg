import { getJuego, setJuego } from "./gameState.js";

function crearError(mensaje, status = 400) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function calcularRefuerzos(provincias, jugadorId) {
  const cantidad = provincias.filter((provincia) => provincia.owner === jugadorId).length;
  return Math.max(1, Math.floor(cantidad / 3));
}

function obtenerBonusRegiones(juego, jugadorId) {
  const regiones = juego.regiones || {};

  return Object.values(regiones).reduce((acc, region) => {
    const dominaCompleta = region.provincias.every((provinciaId) => {
      const provincia = juego.provincias.find((item) => item.id === provinciaId);
      return provincia?.owner === jugadorId;
    });

    return dominaCompleta ? acc + (region.bonus || 0) : acc;
  }, 0);
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

export function aplicarRefuerzo({ provinciaId, jugadorId }) {
  const juego = getJuego();

  if (!juego) {
    throw crearError("No hay juego inicializado", 500);
  }

  if (juego.ganador) {
    throw crearError("La partida ya finalizo", 409);
  }

  if (juego.fase !== "refuerzo") {
    throw crearError("La fase actual no permite refuerzos");
  }

  const jugadorActual = juego.jugadores[juego.turnoActual];
  if (!jugadorActual) {
    throw crearError("No se encontro el jugador del turno actual", 500);
  }

  if (jugadorId && jugadorId !== jugadorActual.id) {
    throw crearError("No es el turno del jugador indicado", 403);
  }

  if (!provinciaId) {
    throw crearError("Falta provinciaId");
  }

  const provincia = juego.provincias.find((item) => item.id === provinciaId);
  if (!provincia) {
    throw crearError("Provincia no encontrada", 404);
  }

  if (provincia.owner !== jugadorActual.id) {
    throw crearError("La provincia no pertenece al jugador actual", 403);
  }

  if (provincia.bloqueado) {
    throw crearError("La provincia esta bloqueada y no puede reforzarse");
  }

  if (typeof juego.refuerzosDisponibles !== "number") {
    const base = calcularRefuerzos(juego.provincias, jugadorActual.id);
    const bonusRegiones = obtenerBonusRegiones(juego, jugadorActual.id);
    const bonusConquista = juego.bonosRefuerzoPendientes?.[jugadorActual.id] || 0;

    juego.refuerzosDisponibles = base + bonusRegiones + bonusConquista;

    if (!juego.bonosRefuerzoPendientes) {
      juego.bonosRefuerzoPendientes = {};
    }
    juego.bonosRefuerzoPendientes[jugadorActual.id] = 0;

    juego.bonusRefuerzoActual = {
      territorios: base,
      regiones: bonusRegiones,
      conquista: bonusConquista,
      total: juego.refuerzosDisponibles,
    };
  }

  if (juego.refuerzosDisponibles <= 0) {
    throw crearError("No quedan refuerzos disponibles en este turno");
  }

  provincia.cantTropas += 1;
  juego.refuerzosDisponibles -= 1;

  if (!juego.ganador && evaluarMisionJugador(juego, jugadorActual.id)) {
    juego.ganador = jugadorActual.id;
    juego.ganadorPorMision = {
      jugadorId: jugadorActual.id,
      mision: juego.misiones?.[jugadorActual.id] || null,
    };
  }

  setJuego(juego);

  return {
    mensaje: "Refuerzo aplicado",
    jugadorActual: {
      id: jugadorActual.id,
      nombre: jugadorActual.nombre,
      tipo: jugadorActual.tipo,
    },
    provincia,
    refuerzosDisponibles: juego.refuerzosDisponibles,
    juego,
  };
}
