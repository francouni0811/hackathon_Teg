export const PHASES = ["refuerzo", "ataque", "movimiento"];

export const PLAYER_COLORS = {
  jugador: "#6fb8e9",
  bot1: "#1d4569",
  bot2: "#d1a53a",
};

export const BASE_PLAYERS = [
  { id: "jugador", nombre: "Vos", tipo: "humano", color: PLAYER_COLORS.jugador },
  { id: "bot1", nombre: "Bot Norte", tipo: "bot", color: PLAYER_COLORS.bot1 },
  { id: "bot2", nombre: "Bot Sur", tipo: "bot", color: PLAYER_COLORS.bot2 },
];

export const PROVINCE_LAYOUT = {
  altiplano: { x: 24, y: 11, w: 16, h: 10 },
  "gran-chaquena": { x: 40, y: 15, w: 22, h: 12 },
  "valles-del-norte": { x: 27, y: 24, w: 20, h: 12 },
  litoral: { x: 56, y: 28, w: 19, h: 12 },
  cuyo: { x: 24, y: 38, w: 18, h: 12 },
  "pampa-central": { x: 42, y: 40, w: 22, h: 12 },
  "cordillera-sur": { x: 28, y: 52, w: 19, h: 12 },
  "costa-atlantica": { x: 58, y: 52, w: 20, h: 12 },
  "patagonia-norte": { x: 42, y: 64, w: 21, h: 11 },
  "patagonia-austral": { x: 40, y: 77, w: 21, h: 11 },
  "tierra-del-fuego": { x: 46, y: 90, w: 13, h: 7 },
};

const BASE_PROVINCES = [
  {
    id: "altiplano",
    nombre: "Altiplano",
    vecinos: ["gran-chaquena", "valles-del-norte"],
  },
  {
    id: "gran-chaquena",
    nombre: "Gran Chaqueña",
    vecinos: ["altiplano", "valles-del-norte", "litoral", "pampa-central"],
  },
  {
    id: "valles-del-norte",
    nombre: "Valles del Norte",
    vecinos: ["altiplano", "gran-chaquena", "cuyo", "pampa-central"],
  },
  {
    id: "litoral",
    nombre: "Litoral",
    vecinos: ["gran-chaquena", "pampa-central", "costa-atlantica"],
  },
  {
    id: "cuyo",
    nombre: "Cuyo",
    vecinos: ["valles-del-norte", "pampa-central", "cordillera-sur"],
  },
  {
    id: "pampa-central",
    nombre: "Pampa Central",
    vecinos: [
      "gran-chaquena",
      "valles-del-norte",
      "litoral",
      "cuyo",
      "cordillera-sur",
      "costa-atlantica",
      "patagonia-norte",
    ],
  },
  {
    id: "cordillera-sur",
    nombre: "Cordillera Sur",
    vecinos: ["cuyo", "pampa-central", "patagonia-norte"],
  },
  {
    id: "costa-atlantica",
    nombre: "Costa Atlántica",
    vecinos: ["litoral", "pampa-central", "patagonia-norte"],
  },
  {
    id: "patagonia-norte",
    nombre: "Patagonia Norte",
    vecinos: ["pampa-central", "cordillera-sur", "costa-atlantica", "patagonia-austral"],
  },
  {
    id: "patagonia-austral",
    nombre: "Patagonia Austral",
    vecinos: ["patagonia-norte", "tierra-del-fuego"],
  },
  {
    id: "tierra-del-fuego",
    nombre: "Tierra del Fuego",
    vecinos: ["patagonia-austral"],
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

export function calcularRefuerzos(provincias, jugadorId) {
  const cantidad = provincias.filter((provincia) => provincia.owner === jugadorId).length;
  return Math.max(1, Math.floor(cantidad / 3));
}

export function crearJuegoInicialMock() {
  const jugadores = BASE_PLAYERS.map((jugador) => ({ ...jugador }));
  const provincias = BASE_PROVINCES.map((provincia) => ({
    ...provincia,
    owner: null,
    cantTropas: 0,
    bloqueado: false,
    bloqueadoHastaRonda: null,
  }));

  const orden = mezclarArray(provincias.map((provincia) => provincia.id));
  orden.forEach((provinciaId, index) => {
    const provincia = provincias.find((item) => item.id === provinciaId);
    provincia.owner = jugadores[index % jugadores.length].id;
    provincia.cantTropas = 2;
  });

  return {
    ronda: 1,
    fase: "refuerzo",
    turnoActual: 0,
    jugadores,
    provincias,
    refuerzosDisponibles: calcularRefuerzos(provincias, jugadores[0].id),
    movimientoRealizado: false,
    movimientoExtraDisponible: false,
    movimientosHechos: 0,
    eventoActual: {
      id: "arranque",
      nombre: "Inicio de campaña",
      descripcion: "La partida comienza en fase de refuerzo.",
    },
    historialEventos: [],
    ganador: null,
  };
}
