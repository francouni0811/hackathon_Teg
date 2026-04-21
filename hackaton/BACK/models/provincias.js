import { Provincia } from "./provinciaModel.js";

export const provinciasData = [
  new Provincia("altiplano", "Altiplano", null, 0, ["gran-chaquena", "valles-del-norte"], false),
  new Provincia("gran-chaquena", "Gran Chaqueña", null, 0, ["altiplano", "valles-del-norte", "litoral", "pampa-central"], false),
  new Provincia("valles-del-norte", "Valles del Norte", null, 0, ["altiplano", "gran-chaquena", "cuyo", "pampa-central"], false),
  new Provincia("litoral", "Litoral", null, 0, ["gran-chaquena", "pampa-central", "costa-atlantica"], false),
  new Provincia("cuyo", "Cuyo", null, 0, ["valles-del-norte", "pampa-central", "cordillera-sur"], false),
  new Provincia("pampa-central", "Pampa Central", null, 0, ["gran-chaquena", "valles-del-norte", "litoral", "cuyo", "cordillera-sur", "costa-atlantica"], false),
  new Provincia("cordillera-sur", "Cordillera Sur", null, 0, ["cuyo", "pampa-central", "patagonia-norte"], false),
  new Provincia("costa-atlantica", "Costa Atlántica", null, 0, ["litoral", "pampa-central", "patagonia-norte"], false),
  new Provincia("patagonia-norte", "Patagonia Norte", null, 0, ["pampa-central", "cordillera-sur", "costa-atlantica", "patagonia-austral"], false),
  new Provincia("patagonia-austral", "Patagonia Austral", null, 0, ["patagonia-norte", "tierra-del-fuego"], false),
  new Provincia("tierra-del-fuego", "Tierra del Fuego", null, 0, ["patagonia-austral"], false),
];