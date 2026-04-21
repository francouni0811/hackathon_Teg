import { jugadoresData } from "./jugadores.js";
import { provinciasData } from "./provincias.js";

const REGIONES = {
  norte: {
    nombre: "Frente Norte",
    bonus: 2,
    provincias: ["altiplano", "gran-chaquena", "valles-del-norte", "litoral"],
  },
  centro: {
    nombre: "Frente Central",
    bonus: 2,
    provincias: ["cuyo", "pampa-central", "cordillera-sur", "costa-atlantica"],
  },
  sur: {
    nombre: "Frente Sur",
    bonus: 2,
    provincias: ["patagonia-norte", "patagonia-austral", "tierra-del-fuego"],
  },
};

const MISIONES_BASE = [
  {
    id: "dominar-norte",
    tipo: "controlar-region",
    regionId: "norte",
    descripcion: "Controla completamente el Frente Norte.",
  },
  {
    id: "dominar-centro",
    tipo: "controlar-region",
    regionId: "centro",
    descripcion: "Controla completamente el Frente Central.",
  },
  {
    id: "dominar-sur",
    tipo: "controlar-region",
    regionId: "sur",
    descripcion: "Controla completamente el Frente Sur.",
  },
  {
    id: "expansion-6",
    tipo: "conquistar-cantidad",
    objetivo: 6,
    descripcion: "Conquista al menos 6 provincias.",
  },
  {
    id: "fortificar-4",
    tipo: "fortificar-cantidad",
    objetivo: 4,
    tropasMinimas: 3,
    descripcion: "Mantiene 4 provincias con 3 o mas tropas.",
  },
];

function mezclarArray(array) {
  const copia = [...array];

  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }

  return copia;
}

function clonarJugadores() {
  return jugadoresData.map((jugador) => ({ ...jugador }));
}

function clonarProvincias() {
  return provinciasData.map((provincia) => ({
    ...provincia,
    vecinos: [...provincia.vecinos],
  }));
}

function calcularRefuerzos(provincias, jugadorId) {
  const cantidad = provincias.filter((provincia) => provincia.owner === jugadorId).length;
  return Math.max(1, Math.floor(cantidad / 3));
}

function asignarMisiones(jugadores) {
  const mazo = mezclarArray(MISIONES_BASE.map((mision) => ({ ...mision })));
  const asignadas = {};

  jugadores.forEach((jugador, index) => {
    const mision = mazo[index % mazo.length];
    asignadas[jugador.id] = mision;
  });

  return asignadas;
}

export function crearJuegoInicial() {
  const jugadores = clonarJugadores();
  const provincias = clonarProvincias();
  const misiones = asignarMisiones(jugadores);
  const bonosRefuerzoPendientes = {};
  const conquistasTurno = {};
  const ordenReparto = mezclarArray(provincias.map((p) => p.id));

  jugadores.forEach((jugador) => {
    bonosRefuerzoPendientes[jugador.id] = 0;
    conquistasTurno[jugador.id] = 0;
  });

  ordenReparto.forEach((provinciaId, index) => {
    const jugador = jugadores[index % jugadores.length];
    const provincia = provincias.find((p) => p.id === provinciaId);

    provincia.owner = jugador.id;
    provincia.cantTropas = 2;
    provincia.bloqueado = false;
  });

  const jugadorInicial = jugadores[0];
  const refuerzosIniciales = calcularRefuerzos(provincias, jugadorInicial.id);

  return {
    jugadores,
    provincias,
    ronda: 1,
    turnoActual: 0,
    fase: "refuerzo",
    refuerzosDisponibles: refuerzosIniciales,
    movimientoRealizado: false,
    movimientoExtraDisponible: false,
    eventoActual: null,
    historialEventos: [],
    regiones: REGIONES,
    misiones,
    bonosRefuerzoPendientes,
    conquistasTurno,
    bonusRefuerzoActual: {
      territorios: refuerzosIniciales,
      regiones: 0,
      conquista: 0,
      total: refuerzosIniciales,
    },
    ganador: null,
    ganadorPorMision: null,
  };
}