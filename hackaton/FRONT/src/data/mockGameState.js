export const ownerColors = {
  jugador: "#1b8f3b",
  "jugador-1": "#1b8f3b",
  bot1: "#8f1d1d",
  "bot-1": "#8f1d1d",
  bot2: "#1f4f8f",
  "bot-2": "#1f4f8f",
};

export const provinceNames = {
  altiplano: "Altiplano",
  "gran-chaquena": "Gran Chaqueña",
  "valles-del-norte": "Valles del Norte",
  litoral: "Litoral",
  cuyo: "Cuyo",
  "pampa-central": "Pampa Central",
  "cordillera-sur": "Cordillera Sur",
  "costa-atlantica": "Costa Atlántica",
  "patagonia-norte": "Patagonia Norte",
  "patagonia-austral": "Patagonia Austral",
  "tierra-del-fuego": "Tierra del Fuego",
};

export const mockGameState = {
  fase: "ataque",
  ronda: 1,
  turnoActual: 0,
  jugadores: [
    { id: "jugador-1", nombre: "Jugador", tipo: "humano", color: ownerColors["jugador-1"] },
    { id: "bot-1", nombre: "Bot Norte", tipo: "bot", color: ownerColors["bot-1"] },
    { id: "bot-2", nombre: "Bot Sur", tipo: "bot", color: ownerColors["bot-2"] },
  ],
  regiones: {
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
  },
  misiones: {
    "jugador-1": {
      id: "dominar-norte",
      tipo: "controlar-region",
      regionId: "norte",
      descripcion: "Controla completamente el Frente Norte.",
    },
  },
  bonusRefuerzoActual: {
    territorios: 3,
    regiones: 0,
    conquista: 0,
    total: 3,
  },
  eventoActual: { nombre: "Paro nacional" },
  provincias: {
    altiplano: { owner: "jugador-1", cantTropas: 3, bloqueado: false },
    "gran-chaquena": { owner: "bot-1", cantTropas: 2, bloqueado: false },
    "valles-del-norte": { owner: "jugador-1", cantTropas: 4, bloqueado: false },
    litoral: { owner: "bot-2", cantTropas: 3, bloqueado: false },
    cuyo: { owner: "bot-1", cantTropas: 2, bloqueado: false },
    "pampa-central": { owner: "jugador-1", cantTropas: 5, bloqueado: false },
    "cordillera-sur": { owner: "bot-2", cantTropas: 3, bloqueado: false },
    "costa-atlantica": { owner: "jugador-1", cantTropas: 2, bloqueado: true },
    "patagonia-norte": { owner: "bot-1", cantTropas: 4, bloqueado: false },
    "patagonia-austral": { owner: "jugador-1", cantTropas: 2, bloqueado: false },
    "tierra-del-fuego": { owner: "bot-2", cantTropas: 1, bloqueado: false },
  },
};
