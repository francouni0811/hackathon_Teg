import { getJuego, setJuego } from "./gameState.js";

const FASES = ["refuerzo", "ataque", "movimiento"];

function crearError(mensaje, status = 400) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function tirarDado() {
  return Math.floor(Math.random() * 6) + 1;
}

function calcularRefuerzos(provincias, jugadorId) {
  const cantidad = provincias.filter((provincia) => provincia.owner === jugadorId).length;
  return Math.max(1, Math.floor(cantidad / 3));
}

function obtenerRegionesControladas(juego, jugadorId) {
  const regiones = juego.regiones || {};
  const controladas = [];

  Object.entries(regiones).forEach(([regionId, region]) => {
    const dominaCompleta = region.provincias.every((provinciaId) => {
      const provincia = juego.provincias.find((item) => item.id === provinciaId);
      return provincia?.owner === jugadorId;
    });

    if (dominaCompleta) {
      controladas.push({ id: regionId, ...region });
    }
  });

  return controladas;
}

function contarProvinciasFortificadas(juego, jugadorId, tropasMinimas = 3) {
  return juego.provincias.filter((provincia) => provincia.owner === jugadorId && provincia.cantTropas >= tropasMinimas).length;
}

function evaluarMisionJugador(juego, jugadorId) {
  const mision = juego.misiones?.[jugadorId];
  if (!mision) {
    return { completada: false, detalle: "Sin mision asignada" };
  }

  if (mision.tipo === "controlar-region") {
    const region = juego.regiones?.[mision.regionId];
    if (!region) {
      return { completada: false, detalle: "Region de mision no encontrada" };
    }

    const completa = region.provincias.every((provinciaId) => {
      const provincia = juego.provincias.find((item) => item.id === provinciaId);
      return provincia?.owner === jugadorId;
    });

    return {
      completada: completa,
      detalle: completa ? `Control total de ${region.nombre}.` : `Aun no controla ${region.nombre}.`,
    };
  }

  if (mision.tipo === "conquistar-cantidad") {
    const cantidad = juego.provincias.filter((provincia) => provincia.owner === jugadorId).length;
    return {
      completada: cantidad >= mision.objetivo,
      detalle: `Controla ${cantidad}/${mision.objetivo} provincias.`,
    };
  }

  if (mision.tipo === "fortificar-cantidad") {
    const tropasMinimas = mision.tropasMinimas || 3;
    const cantidad = contarProvinciasFortificadas(juego, jugadorId, tropasMinimas);
    return {
      completada: cantidad >= mision.objetivo,
      detalle: `Tiene ${cantidad}/${mision.objetivo} provincias con ${tropasMinimas}+ tropas.`,
    };
  }

  return { completada: false, detalle: "Tipo de mision no reconocido" };
}

function verificarGanadorPorMision(juego, jugadorId) {
  if (juego.ganador) return;

  const estado = evaluarMisionJugador(juego, jugadorId);
  if (!estado.completada) return;

  juego.ganador = jugadorId;
  juego.ganadorPorMision = {
    jugadorId,
    detalle: estado.detalle,
    mision: juego.misiones?.[jugadorId] || null,
  };
}

function calcularRefuerzosDeTurno(juego, jugadorId) {
  const baseTerritorios = calcularRefuerzos(juego.provincias, jugadorId);
  const regionesControladas = obtenerRegionesControladas(juego, jugadorId);
  const bonusRegiones = regionesControladas.reduce((acc, region) => acc + (region.bonus || 0), 0);
  const bonusConquista = juego.bonosRefuerzoPendientes?.[jugadorId] || 0;
  const total = baseTerritorios + bonusRegiones + bonusConquista;

  if (!juego.bonosRefuerzoPendientes) {
    juego.bonosRefuerzoPendientes = {};
  }
  juego.bonosRefuerzoPendientes[jugadorId] = 0;

  juego.bonusRefuerzoActual = {
    territorios: baseTerritorios,
    regiones: bonusRegiones,
    conquista: bonusConquista,
    total,
    regionesControladas: regionesControladas.map((region) => region.nombre),
  };

  return total;
}

function elegirAleatorio(array) {
  if (!array.length) return null;
  const index = Math.floor(Math.random() * array.length);
  return array[index];
}

function nombreProvincia(provinciaId) {
  return provinciaId ? provinciaId.replace(/-/g, " ") : "provincia";
}

function verificarGanador(juego) {
  const owners = new Set(juego.provincias.map((provincia) => provincia.owner));
  if (owners.size === 1) {
    const [ganadorId] = [...owners];
    juego.ganador = ganadorId;
  }
}

function contarVecinosEnemigos(juego, provincia, jugadorId) {
  return provincia.vecinos.reduce((acc, vecinoId) => {
    const vecino = juego.provincias.find((item) => item.id === vecinoId);
    return vecino && vecino.owner !== jugadorId ? acc + 1 : acc;
  }, 0);
}

function limpiarBloqueosTemporales(juego) {
  juego.provincias.forEach((provincia) => {
    if (provincia.bloqueado && typeof provincia.bloqueadoHastaRonda === "number" && provincia.bloqueadoHastaRonda < juego.ronda) {
      provincia.bloqueado = false;
      delete provincia.bloqueadoHastaRonda;
    }
  });
}

function aplicarEventoDeRonda(juego) {
  const jugadorActivo = juego.jugadores[juego.turnoActual];
  if (!jugadorActivo) {
    juego.eventoActual = null;
    return;
  }

  limpiarBloqueosTemporales(juego);
  juego.movimientoExtraDisponible = false;

  const cartas = [
    {
      id: "paro-nacional",
      nombre: "Paro nacional",
      aplicar: () => {
        const candidatas = juego.provincias.filter((provincia) => !provincia.bloqueado);
        const provincia = elegirAleatorio(candidatas.length ? candidatas : juego.provincias);
        if (!provincia) return { detalle: "Sin provincias para aplicar" };

        provincia.bloqueado = true;
        provincia.bloqueadoHastaRonda = juego.ronda;

        return {
          provinciaId: provincia.id,
          bloqueado: true,
          bloqueadoHastaRonda: juego.ronda,
          descripcion: `La provincia ${nombreProvincia(provincia.id)} queda bloqueada por esta ronda.`,
        };
      },
    },
    {
      id: "asado-unidad",
      nombre: "Asado de unidad",
      aplicar: () => {
        const provinciasJugador = juego.provincias.filter((provincia) => provincia.owner === jugadorActivo.id);
        const provincia = elegirAleatorio(provinciasJugador);
        if (!provincia) return { detalle: "Sin provincias para aplicar" };
        provincia.cantTropas += 1;
        return {
          provinciaId: provincia.id,
          tropas: "+1",
          descripcion: `La provincia ${nombreProvincia(provincia.id)} recibe +1 tropa.`,
        };
      },
    },
    {
      id: "ola-calor",
      nombre: "Ola de calor",
      aplicar: () => {
        const candidatas = juego.provincias.filter((provincia) => provincia.cantTropas > 1);
        const provincia = elegirAleatorio(candidatas);
        if (!provincia) return { detalle: "No habia provincias con mas de 1 tropa" };
        provincia.cantTropas -= 1;
        return {
          provinciaId: provincia.id,
          tropas: "-1",
          descripcion: `La provincia ${nombreProvincia(provincia.id)} pierde 1 tropa por calor extremo.`,
        };
      },
    },
    {
      id: "subsidio-transporte",
      nombre: "Subsidio al transporte",
      aplicar: () => {
        juego.movimientoExtraDisponible = true;
        return {
          detalle: "Movimiento extra habilitado este turno",
          descripcion: "Se habilita un movimiento adicional para el jugador activo.",
        };
      },
    },
    {
      id: "festival-nacional",
      nombre: "Festival nacional",
      aplicar: () => {
        const provincia = elegirAleatorio(juego.provincias);
        if (!provincia) return { detalle: "Sin provincias para aplicar" };
        provincia.cantTropas += 2;
        return {
          provinciaId: provincia.id,
          tropas: "+2",
          descripcion: `La provincia ${nombreProvincia(provincia.id)} recibe +2 tropas por festival.`,
        };
      },
    },
  ];

  const carta = elegirAleatorio(cartas);
  const efecto = carta.aplicar();

  const descripcion =
    efecto?.descripcion ||
    efecto?.detalle ||
    (efecto?.provinciaId
      ? `Evento aplicado sobre ${nombreProvincia(efecto.provinciaId)}.`
      : "Se aplico un evento de ronda.");

  juego.eventoActual = {
    ronda: juego.ronda,
    id: carta.id,
    nombre: carta.nombre,
    efecto,
    descripcion,
  };

  juego.historialEventos.push(juego.eventoActual);
}

function prepararInicioTurno(juego) {
  const jugadorActual = juego.jugadores[juego.turnoActual];
  juego.fase = "refuerzo";
  juego.movimientoRealizado = false;
  juego.refuerzosDisponibles = calcularRefuerzosDeTurno(juego, jugadorActual.id);
}

function pasarAlSiguienteJugador(juego) {
  const totalJugadores = juego.jugadores.length;
  const siguienteTurno = (juego.turnoActual + 1) % totalJugadores;
  const vuelveAlInicio = siguienteTurno === 0;

  juego.turnoActual = siguienteTurno;

  if (vuelveAlInicio) {
    juego.ronda += 1;
    aplicarEventoDeRonda(juego);
  }

  prepararInicioTurno(juego);
}

function reforzarBot(juego, jugador) {
  let refuerzos = juego.refuerzosDisponibles;
  const regionesControladas = new Set(obtenerRegionesControladas(juego, jugador.id).map((region) => region.id));
  const regiones = juego.regiones || {};

  while (refuerzos > 0) {
    const provinciasPropias = juego.provincias.filter((provincia) => provincia.owner === jugador.id && !provincia.bloqueado);
    if (!provinciasPropias.length) break;

    const regionByProvincia = {};
    Object.entries(regiones).forEach(([regionId, region]) => {
      region.provincias.forEach((provinciaId) => {
        regionByProvincia[provinciaId] = regionId;
      });
    });

    provinciasPropias.sort((a, b) => {
      const regionA = regionByProvincia[a.id];
      const regionB = regionByProvincia[b.id];
      const riesgoB = contarVecinosEnemigos(juego, b, jugador.id);
      const riesgoA = contarVecinosEnemigos(juego, a, jugador.id);
      const regionPesoA = regionA && !regionesControladas.has(regionA) ? 4 : 0;
      const regionPesoB = regionB && !regionesControladas.has(regionB) ? 4 : 0;
      const prioridadB = riesgoB * 10 - b.cantTropas + regionPesoB;
      const prioridadA = riesgoA * 10 - a.cantTropas + regionPesoA;
      return prioridadB - prioridadA;
    });

    provinciasPropias[0].cantTropas += 1;
    refuerzos -= 1;
  }

  juego.refuerzosDisponibles = refuerzos;
}

function resolverAtaqueBot(juego, origen, destino, jugador) {
  const dadoAtacante = tirarDado();
  const dadoDefensor = tirarDado();

  if (dadoAtacante > dadoDefensor) {
    destino.cantTropas -= 1;
    if (destino.cantTropas <= 0) {
      destino.owner = jugador.id;
      destino.cantTropas = 1;
      origen.cantTropas -= 1;
      if (!juego.conquistasTurno) juego.conquistasTurno = {};
      juego.conquistasTurno[jugador.id] = (juego.conquistasTurno[jugador.id] || 0) + 1;
    }
  } else {
    origen.cantTropas -= 1;
  }

  verificarGanadorPorMision(juego, jugador.id);
  verificarGanador(juego);
}

function atacarConBot(juego, jugador) {
  let ataques = 0;

  while (ataques < 2 && !juego.ganador) {
    const opciones = [];

    juego.provincias.forEach((origen) => {
      if (origen.owner !== jugador.id || origen.bloqueado || origen.cantTropas <= 1) return;

      origen.vecinos.forEach((vecinoId) => {
        const destino = juego.provincias.find((provincia) => provincia.id === vecinoId);
        if (!destino || destino.owner === jugador.id) return;

        const ventaja = origen.cantTropas - destino.cantTropas;
        if (ventaja >= 2) {
          const presion = contarVecinosEnemigos(juego, destino, jugador.id);
          opciones.push({ origen, destino, ventaja, prioridad: ventaja + presion });
        }
      });
    });

    if (!opciones.length) break;

    opciones.sort((a, b) => b.prioridad - a.prioridad);
    const mejor = opciones[0];
    resolverAtaqueBot(juego, mejor.origen, mejor.destino, jugador);
    ataques += 1;
  }
}

function moverConBot(juego, jugador) {
  if (juego.movimientoRealizado && !juego.movimientoExtraDisponible) {
    return;
  }

  const maxMovimientos = juego.movimientoExtraDisponible ? 2 : 1;
  let movimientosHechos = 0;

  while (movimientosHechos < maxMovimientos) {
    const propias = juego.provincias.filter((provincia) => provincia.owner === jugador.id && provincia.cantTropas > 1 && !provincia.bloqueado);
    let mejorMovimiento = null;

    propias.forEach((origen) => {
      const amenazaOrigen = contarVecinosEnemigos(juego, origen, jugador.id);

      origen.vecinos.forEach((vecinoId) => {
        const destino = juego.provincias.find((provincia) => provincia.id === vecinoId);
        if (!destino || destino.owner !== jugador.id) return;

        const amenazaDestino = contarVecinosEnemigos(juego, destino, jugador.id);
        const puntaje = amenazaDestino - amenazaOrigen;

        if (puntaje > 0) {
          if (!mejorMovimiento || puntaje > mejorMovimiento.puntaje) {
            mejorMovimiento = { origen, destino, puntaje };
          }
        }
      });
    });

    if (!mejorMovimiento) break;

    mejorMovimiento.origen.cantTropas -= 1;
    mejorMovimiento.destino.cantTropas += 1;
    movimientosHechos += 1;
  }

  if (movimientosHechos > 0) {
    juego.movimientoRealizado = true;
    if (juego.movimientoExtraDisponible) {
      juego.movimientoExtraDisponible = false;
    }
  }
}

function ejecutarTurnoBot(juego) {
  const jugador = juego.jugadores[juego.turnoActual];

  juego.fase = "refuerzo";
  reforzarBot(juego, jugador);

  juego.fase = "ataque";
  atacarConBot(juego, jugador);

  juego.fase = "movimiento";
  moverConBot(juego, jugador);

  if ((juego.conquistasTurno?.[jugador.id] || 0) > 0) {
    if (!juego.bonosRefuerzoPendientes) juego.bonosRefuerzoPendientes = {};
    juego.bonosRefuerzoPendientes[jugador.id] = (juego.bonosRefuerzoPendientes[jugador.id] || 0) + 2;
    juego.conquistasTurno[jugador.id] = 0;
  }

  verificarGanadorPorMision(juego, jugador.id);

  juego.fase = "movimiento";
}

function procesarBotsSiCorresponde(juego) {
  let guard = 0;
  const maxIteraciones = juego.jugadores.length * 4;

  while (!juego.ganador && juego.jugadores[juego.turnoActual]?.tipo === "bot" && guard < maxIteraciones) {
    ejecutarTurnoBot(juego);
    if (juego.ganador) break;
    pasarAlSiguienteJugador(juego);
    guard += 1;
  }
}

export function pasarFase(jugadorId) {
  const juego = getJuego();

  if (!juego) {
    throw crearError("No hay juego inicializado", 500);
  }

  if (juego.ganador) {
    throw crearError("La partida ya finalizo", 409);
  }

  const jugadorActual = juego.jugadores[juego.turnoActual];
  if (!jugadorActual) {
    throw crearError("No se encontro el jugador del turno actual", 500);
  }

  if (jugadorId && jugadorId !== jugadorActual.id) {
    throw crearError("No es el turno del jugador indicado", 403);
  }

  const faseActualIndex = FASES.indexOf(juego.fase);
  if (faseActualIndex === -1) {
    throw crearError("Fase actual invalida", 500);
  }

  if (juego.fase === "movimiento") {
    return finalizarTurno(jugadorId);
  }

  juego.fase = FASES[faseActualIndex + 1];
  setJuego(juego);

  return {
    mensaje: "Fase avanzada",
    faseAnterior: FASES[faseActualIndex],
    faseActual: juego.fase,
    juego,
  };
}

export function finalizarTurno(jugadorId) {
  const juego = getJuego();

  if (!juego) {
    throw crearError("No hay juego inicializado", 500);
  }

  if (juego.ganador) {
    throw crearError("La partida ya finalizo", 409);
  }

  const jugadorActual = juego.jugadores[juego.turnoActual];
  if (!jugadorActual) {
    throw crearError("No se encontro el jugador del turno actual", 500);
  }

  if (jugadorId && jugadorId !== jugadorActual.id) {
    throw crearError("No es el turno del jugador indicado", 403);
  }

  if (juego.fase !== "movimiento") {
    throw crearError("Solo se puede finalizar turno luego de la fase movimiento", 400);
  }

  const turnoQueTermina = {
    id: jugadorActual.id,
    nombre: jugadorActual.nombre,
    tipo: jugadorActual.tipo,
  };

  if (!juego.bonosRefuerzoPendientes) juego.bonosRefuerzoPendientes = {};
  if (!juego.conquistasTurno) juego.conquistasTurno = {};

  const conquistasDeTurno = juego.conquistasTurno[jugadorActual.id] || 0;
  if (conquistasDeTurno > 0) {
    juego.bonosRefuerzoPendientes[jugadorActual.id] = (juego.bonosRefuerzoPendientes[jugadorActual.id] || 0) + 2;
    juego.conquistasTurno[jugadorActual.id] = 0;
  }

  verificarGanadorPorMision(juego, jugadorActual.id);

  pasarAlSiguienteJugador(juego);
  procesarBotsSiCorresponde(juego);
  setJuego(juego);

  const nuevoJugador = juego.jugadores[juego.turnoActual];

  return {
    mensaje: "Turno finalizado",
    turnoQueTermina,
    turnoActual: {
      id: nuevoJugador.id,
      nombre: nuevoJugador.nombre,
      tipo: nuevoJugador.tipo,
    },
    ronda: juego.ronda,
    fase: juego.fase,
    eventoActual: juego.eventoActual,
    ganador: juego.ganador,
    juego,
  };
}
