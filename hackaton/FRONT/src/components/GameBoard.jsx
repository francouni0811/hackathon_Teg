import { useEffect, useMemo, useState } from "react";
import mapaArgentina from "../assets/mapa argenteg.png";
import "./GameBoard.css";

const VIEWBOX_WIDTH = 1024;
const VIEWBOX_HEIGHT = 1536;

const provinceShapes = {
  altiplano: "260,120 470,120 500,280 360,320 250,250",
  "gran-chaquena": "470,120 670,150 720,360 560,430 500,280",
  "valles-del-norte": "230,260 360,250 500,280 480,470 290,500 210,400",
  litoral: "720,360 840,360 860,610 760,700 650,580 670,470",
  cuyo: "220,500 420,500 430,700 250,730 180,620",
  "pampa-central": "430,430 650,430 700,700 490,840 400,700 420,500 480,470",
  "cordillera-sur": "180,730 430,700 470,970 180,1040 150,860",
  "costa-atlantica": "700,700 860,700 870,930 690,980 600,840 620,760",
  "patagonia-norte": "240,1020 560,980 610,1120 520,1280 240,1250 170,1120",
  "patagonia-austral": "220,1250 520,1280 500,1460 230,1480 170,1380",
  "tierra-del-fuego": "360,1460 560,1460 600,1520 430,1530 330,1510",
};

const provinceCenters = {
  altiplano: { x: 365, y: 220 },
  "gran-chaquena": { x: 595, y: 285 },
  "valles-del-norte": { x: 345, y: 390 },
  litoral: { x: 760, y: 520 },
  cuyo: { x: 315, y: 610 },
  "pampa-central": { x: 540, y: 625 },
  "cordillera-sur": { x: 300, y: 865 },
  "costa-atlantica": { x: 760, y: 835 },
  "patagonia-norte": { x: 390, y: 1130 },
  "patagonia-austral": { x: 360, y: 1370 },
  "tierra-del-fuego": { x: 455, y: 1490 },
};

const provinceNames = {
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

const ownerColors = {
  jugador: "#74b9ff",
  "jugador-1": "#74b9ff",
  bot1: "#1f4e79",
  "bot-1": "#1f4e79",
  bot2: "#d4a72c",
  "bot-2": "#d4a72c",
  neutral: "rgba(255,255,255,0.15)",
};

const initialState = {
  ronda: 1,
  turnoActual: 0,
  fase: "ataque",
  jugadores: [
    { id: "jugador", nombre: "Vos", tipo: "humano" },
    { id: "bot1", nombre: "Bot 1", tipo: "bot" },
    { id: "bot2", nombre: "Bot 2", tipo: "bot" },
  ],
  eventoActual: null,
  provincias: {
    altiplano: { owner: "jugador", cantTropas: 3, bloqueado: false },
    "gran-chaquena": { owner: "bot1", cantTropas: 2, bloqueado: false },
    "valles-del-norte": { owner: "jugador", cantTropas: 4, bloqueado: false },
    litoral: { owner: "bot2", cantTropas: 3, bloqueado: false },
    cuyo: { owner: "bot1", cantTropas: 2, bloqueado: false },
    "pampa-central": { owner: "jugador", cantTropas: 5, bloqueado: false },
    "cordillera-sur": { owner: "bot2", cantTropas: 3, bloqueado: false },
    "costa-atlantica": { owner: "jugador", cantTropas: 2, bloqueado: true },
    "patagonia-norte": { owner: "bot1", cantTropas: 4, bloqueado: false },
    "patagonia-austral": { owner: "jugador", cantTropas: 2, bloqueado: false },
    "tierra-del-fuego": { owner: "bot2", cantTropas: 1, bloqueado: false },
  },
};

const API_BASE = "http://localhost:3000";

function toProvinciasObject(provinciasArray) {
  return provinciasArray.reduce((acc, provincia) => {
    acc[provincia.id] = provincia;
    return acc;
  }, {});
}

function normalizeGameState(rawState) {
  if (!rawState?.provincias) return initialState;

  if (Array.isArray(rawState.provincias)) {
    return {
      ...rawState,
      provincias: toProvinciasObject(rawState.provincias),
    };
  }

  return rawState;
}

async function apiJson(url, options) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Error de comunicacion con backend");
  }

  return data;
}

function GameBoard() {
  const [gameState, setGameState] = useState(() => initialState);
  const [selectedOrigin, setSelectedOrigin] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [battlePreview, setBattlePreview] = useState(null);
  const [isBattleRolling, setIsBattleRolling] = useState(false);
  const [rollingDice, setRollingDice] = useState({ atacante: 1, defensor: 1 });
  const [statusMessage, setStatusMessage] = useState("Cargando partida...");
  const [loading, setLoading] = useState(false);

  const provinceIds = useMemo(() => Object.keys(provinceShapes), []);
  const currentPlayer = gameState.jugadores?.[gameState.turnoActual];
  const isHumanTurn = currentPlayer?.tipo === "humano";

  const validTargets = useMemo(() => {
    const targets = new Set();
    if (!selectedOrigin) return targets;

    const origen = gameState.provincias[selectedOrigin];
    if (!origen?.vecinos?.length) return targets;

    if (gameState.fase === "ataque") {
      origen.vecinos.forEach((vecinoId) => {
        const vecino = gameState.provincias[vecinoId];
        if (vecino && vecino.owner !== currentPlayer?.id) {
          targets.add(vecinoId);
        }
      });
    }

    if (gameState.fase === "movimiento") {
      origen.vecinos.forEach((vecinoId) => {
        const vecino = gameState.provincias[vecinoId];
        if (vecino && vecino.owner === currentPlayer?.id) {
          targets.add(vecinoId);
        }
      });
    }

    return targets;
  }, [selectedOrigin, gameState.fase, gameState.provincias, currentPlayer?.id]);

  useEffect(() => {
    cargarJuegoInicial();
  }, []);

  function limpiarSeleccion() {
    setSelectedOrigin(null);
    setSelectedTarget(null);
  }

  function setGameFromResponse(data) {
    const rawGame = data?.juego || data;
    if (!rawGame?.provincias) return;

    const nextState = normalizeGameState(rawGame);
    setGameState(nextState);
  }

  async function cargarJuegoInicial() {
    try {
      setLoading(true);
      const data = await apiJson(`${API_BASE}/juego`);
      setGameFromResponse(data);
      setStatusMessage("Partida sincronizada con backend.");
    } catch {
      setStatusMessage("Backend no disponible: jugando en modo local mock.");
      setGameState(initialState);
    } finally {
      setLoading(false);
    }
  }

  function sonVecinas(origenId, destinoId) {
    const origen = gameState.provincias[origenId];
    return origen?.vecinos?.includes(destinoId);
  }

  async function reforzarProvincia(provinceId) {
    try {
      setLoading(true);
      const data = await apiJson(`${API_BASE}/refuerzo`, {
        method: "POST",
        body: JSON.stringify({ provinciaId: provinceId, jugadorId: currentPlayer?.id }),
      });
      setGameFromResponse(data);
      setStatusMessage(`Refuerzo aplicado en ${provinceNames[provinceId]}.`);
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function atacar(origenId, destinoId) {
    setIsBattleRolling(true);
    setBattlePreview({
      origen: provinceNames[origenId],
      destino: provinceNames[destinoId],
      atacante: 1,
      defensor: 1,
      resultado: "pendiente",
      conquista: false,
    });

    const intervalId = setInterval(() => {
      setRollingDice({
        atacante: Math.floor(Math.random() * 6) + 1,
        defensor: Math.floor(Math.random() * 6) + 1,
      });
    }, 90);

    try {
      setLoading(true);
      const [data] = await Promise.all([
        apiJson(`${API_BASE}/ataque`, {
          method: "POST",
          body: JSON.stringify({
            origenId,
            destinoId,
            jugadorId: currentPlayer?.id,
          }),
        }),
        new Promise((resolve) => setTimeout(resolve, 650)),
      ]);

      setGameFromResponse(data);
      if (data?.dados) {
        setBattlePreview({
          atacante: data.dados.atacante,
          defensor: data.dados.defensor,
          resultado: data.resultado,
          conquista: data.conquista,
          origen: provinceNames[origenId],
          destino: provinceNames[destinoId],
        });
      } else {
        setBattlePreview(null);
      }
      setStatusMessage(`Ataque resuelto: ${provinceNames[origenId]} -> ${provinceNames[destinoId]}.`);
    } catch (error) {
      setBattlePreview(null);
      setStatusMessage(error.message);
    } finally {
      clearInterval(intervalId);
      setIsBattleRolling(false);
      setLoading(false);
    }
  }

  async function mover(origenId, destinoId) {
    try {
      setLoading(true);
      const data = await apiJson(`${API_BASE}/movimiento`, {
        method: "POST",
        body: JSON.stringify({
          origenId,
          destinoId,
          cantidad: 1,
          jugadorId: currentPlayer?.id,
        }),
      });
      setGameFromResponse(data);
      setBattlePreview(null);
      setStatusMessage(`Movimiento aplicado: ${provinceNames[origenId]} -> ${provinceNames[destinoId]}.`);
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function avanzarHastaFase(targetPhase) {
    if (!currentPlayer?.id) return;

    try {
      setLoading(true);
      let currentPhase = gameState.fase;
      let safety = 0;
      while (currentPhase !== targetPhase && safety < 4) {
        const data = await apiJson(`${API_BASE}/juego/fase/siguiente`, {
          method: "POST",
          body: JSON.stringify({ jugadorId: currentPlayer.id }),
        });
        setGameFromResponse(data);
        currentPhase = (data.juego || data).fase;
        safety += 1;
      }
      limpiarSeleccion();
      if (targetPhase !== "ataque") {
        setBattlePreview(null);
      }
      setStatusMessage(`Fase actual: ${targetPhase}.`);
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function finalizarTurno() {
    if (!currentPlayer?.id) return;

    try {
      setLoading(true);
      const data = await apiJson(`${API_BASE}/juego/turno/finalizar`, {
        method: "POST",
        body: JSON.stringify({ jugadorId: currentPlayer.id }),
      });
      setGameFromResponse(data);
      limpiarSeleccion();
      setBattlePreview(null);
      setStatusMessage("Turno finalizado.");
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function reiniciarPartida() {
    try {
      setLoading(true);
      const data = await apiJson(`${API_BASE}/juego/reiniciar`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setGameFromResponse(data);
      limpiarSeleccion();
      setBattlePreview(null);
      setStatusMessage("Partida reiniciada.");
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleProvinceClick(provinceId) {
    if (isBattleRolling) {
      setStatusMessage("Resolviendo combate...");
      return;
    }

    if (!isHumanTurn) {
      setStatusMessage("Es turno de bot. Espera o termina turno desde backend.");
      return;
    }

    const provincia = gameState.provincias[provinceId];
    if (!provincia) return;

    const isMine = provincia.owner === currentPlayer?.id;

    if (gameState.fase === "refuerzo") {
      if (!isMine) {
        setStatusMessage("Solo podes reforzar provincias propias.");
        return;
      }
      await reforzarProvincia(provinceId);
      return;
    }

    if (gameState.fase === "ataque") {
      if (!selectedOrigin) {
        if (!isMine || provincia.cantTropas <= 1) {
          setStatusMessage("El origen de ataque debe ser propio y tener 2+ tropas.");
          return;
        }
        setSelectedOrigin(provinceId);
        setSelectedTarget(null);
        setStatusMessage(`Origen seleccionado: ${provinceNames[provinceId]}.`);
        return;
      }

      if (selectedOrigin === provinceId) {
        limpiarSeleccion();
        setStatusMessage("Seleccion de ataque limpiada.");
        return;
      }

      if (!isMine) {
        if (!sonVecinas(selectedOrigin, provinceId)) {
          setStatusMessage("Objetivo invalido: no es provincia vecina.");
          return;
        }
        setSelectedTarget(provinceId);
        await atacar(selectedOrigin, provinceId);
        limpiarSeleccion();
      } else {
        setStatusMessage("El objetivo de ataque debe ser enemigo.");
      }
      return;
    }

    if (gameState.fase === "movimiento") {
      if (!selectedOrigin) {
        if (!isMine || provincia.cantTropas <= 1) {
          setStatusMessage("El origen de movimiento debe ser propio y tener 2+ tropas.");
          return;
        }
        setSelectedOrigin(provinceId);
        setStatusMessage(`Origen de movimiento: ${provinceNames[provinceId]}.`);
        return;
      }

      if (selectedOrigin === provinceId) {
        limpiarSeleccion();
        setStatusMessage("Seleccion de movimiento limpiada.");
        return;
      }

      if (isMine) {
        if (!sonVecinas(selectedOrigin, provinceId)) {
          setStatusMessage("Destino invalido: no es provincia vecina.");
          return;
        }
        setSelectedTarget(provinceId);
        await mover(selectedOrigin, provinceId);
        limpiarSeleccion();
      } else {
        setStatusMessage("En movimiento solo podes elegir destino propio.");
      }
    }
  }

  function getProvinceFill(provinceId) {
    const provincia = gameState.provincias[provinceId];
    return ownerColors[provincia.owner] || ownerColors.neutral;
  }

  return (
    <div className="board-shell">
      <div className="board-topbar">
        <span>Ronda: {gameState.ronda ?? 1}</span>
        <span>Turno: {currentPlayer?.nombre || "-"}</span>
        <span>Fase: {gameState.fase}</span>
        <span>Evento: {gameState.eventoActual?.nombre || "-"}</span>
        <span>Origen: {selectedOrigin ? provinceNames[selectedOrigin] : "-"}</span>
        <span>Objetivo: {selectedTarget ? provinceNames[selectedTarget] : "-"}</span>
      </div>

      <div className="map-wrapper">
        <svg
          className="map-svg"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <image
            href={mapaArgentina}
            x="0"
            y="0"
            width={VIEWBOX_WIDTH}
            height={VIEWBOX_HEIGHT}
            preserveAspectRatio="xMidYMid meet"
          />

          {provinceIds.map((provinceId) => {
            const provincia = gameState.provincias[provinceId];
            const center = provinceCenters[provinceId];
            const selected = selectedOrigin === provinceId || selectedTarget === provinceId;
            const isBlocked = provincia.bloqueado;
            const isValidTarget = validTargets.has(provinceId) && !selected;

            return (
              <g
                key={provinceId}
                className={`province-group ${selected ? "selected" : ""} ${isBlocked ? "blocked" : ""} ${isValidTarget ? "valid-target" : ""}`}
                onClick={() => handleProvinceClick(provinceId)}
              >
                <polygon
                  points={provinceShapes[provinceId]}
                  fill={getProvinceFill(provinceId)}
                  fillOpacity="0.28"
                  stroke={selected ? "#fff6d6" : "#1c140d"}
                  strokeWidth={selected ? "6" : "4"}
                  className="province-shape"
                />

                <circle
                  cx={center.x}
                  cy={center.y}
                  r="26"
                  className="troop-badge"
                />
                <text
                  x={center.x}
                  y={center.y + 8}
                  textAnchor="middle"
                  className="troop-text"
                >
                  {provincia.cantTropas}
                </text>

                {isBlocked && (
                  <>
                    <circle cx={center.x + 34} cy={center.y - 26} r="14" className="blocked-badge" />
                    <text
                      x={center.x + 34}
                      y={center.y - 21}
                      textAnchor="middle"
                      className="blocked-text"
                    >
                      !
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {battlePreview ? (
        <div className={`battle-preview ${isBattleRolling ? "rolling" : ""}`}>
          <strong>
            Combate: {battlePreview.origen} {"->"} {battlePreview.destino}
          </strong>
          <span>
            Dados {isBattleRolling ? rollingDice.atacante : battlePreview.atacante} (ataque) vs {isBattleRolling ? rollingDice.defensor : battlePreview.defensor} (defensa)
          </span>
          {isBattleRolling ? (
            <span>Resolviendo combate...</span>
          ) : (
            <span>
              Resultado: {battlePreview.resultado === "ataque" ? "gana ataque" : "gana defensa"}
              {battlePreview.conquista ? " | provincia conquistada" : ""}
            </span>
          )}
        </div>
      ) : null}

      <div className="board-actions">
        <button disabled={loading || isBattleRolling} onClick={() => avanzarHastaFase("refuerzo")}>
          Refuerzo
        </button>
        <button disabled={loading || isBattleRolling} onClick={() => avanzarHastaFase("ataque")}>
          Ataque
        </button>
        <button disabled={loading || isBattleRolling} onClick={() => avanzarHastaFase("movimiento")}>
          Movimiento
        </button>
        <button disabled={loading || isBattleRolling} onClick={finalizarTurno}>
          Terminar turno
        </button>
        <button disabled={loading || isBattleRolling} onClick={reiniciarPartida}>
          Reiniciar
        </button>
        <button
          disabled={loading || isBattleRolling}
          onClick={() => {
            limpiarSeleccion();
          }}
        >
          Limpiar seleccion
        </button>
      </div>

      <div className="board-message">{loading || isBattleRolling ? "Procesando..." : statusMessage}</div>
    </div>
  );
}

export default GameBoard;
