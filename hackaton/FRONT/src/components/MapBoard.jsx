import { useEffect, useMemo, useRef, useState } from "react";
import mapaArgentina from "../assets/mapa-argentina.png";
import { mockGameState, ownerColors, provinceNames } from "../data/mockGameState";
import { provincePositions } from "../data/provincePositions";
import "./styles.css";

const API_BASE =
  import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3000`;

const DEFAULT_NEIGHBORS = {
  altiplano: ["gran-chaquena", "valles-del-norte"],
  "gran-chaquena": ["altiplano", "valles-del-norte", "litoral", "pampa-central"],
  "valles-del-norte": ["altiplano", "gran-chaquena", "cuyo", "pampa-central"],
  litoral: ["gran-chaquena", "pampa-central", "costa-atlantica"],
  cuyo: ["valles-del-norte", "pampa-central", "cordillera-sur"],
  "pampa-central": [
    "gran-chaquena",
    "valles-del-norte",
    "litoral",
    "cuyo",
    "cordillera-sur",
    "costa-atlantica",
    "patagonia-norte",
  ],
  "cordillera-sur": ["cuyo", "pampa-central", "patagonia-norte"],
  "costa-atlantica": ["litoral", "pampa-central", "patagonia-norte"],
  "patagonia-norte": ["pampa-central", "cordillera-sur", "costa-atlantica", "patagonia-austral"],
  "patagonia-austral": ["patagonia-norte", "tierra-del-fuego"],
  "tierra-del-fuego": ["patagonia-austral"],
};

function toProvinceMap(provincias) {
  if (!Array.isArray(provincias)) return provincias || {};

  return provincias.reduce((acc, provincia) => {
    acc[provincia.id] = {
      ...provincia,
      vecinos: provincia.vecinos || DEFAULT_NEIGHBORS[provincia.id] || [],
    };
    return acc;
  }, {});
}

function normalizeGame(rawGame) {
  if (!rawGame?.provincias) return mockGameState;

  return {
    ...rawGame,
    provincias: toProvinceMap(rawGame.provincias),
  };
}

function parsePercent(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value.replace("%", ""));
  return 0;
}

function formatProvinceName(provinceId) {
  if (!provinceId) return "provincia";
  return provinceNames[provinceId] || provinceId.replace(/-/g, " ");
}

function getEventDescription(evento) {
  if (!evento) return "";
  if (evento.descripcion) return evento.descripcion;
  if (evento.detalle) return evento.detalle;

  const efecto = evento.efecto;
  if (!efecto) return "Evento de ronda en curso.";
  if (efecto.descripcion) return efecto.descripcion;
  if (efecto.detalle) return efecto.detalle;

  if (efecto.provinciaId && efecto.bloqueado) {
    return `${formatProvinceName(efecto.provinciaId)} quedo bloqueada esta ronda.`;
  }

  if (efecto.provinciaId && efecto.tropas) {
    return `${formatProvinceName(efecto.provinciaId)} recibio ${efecto.tropas} tropas.`;
  }

  return "Evento de ronda en curso.";
}

function getEventKey(evento, historyLength) {
  if (!evento) return null;
  const scope = typeof historyLength === "number" ? historyLength : "no-history";
  return `${scope}-${evento.ronda || "sin-ronda"}-${evento.id || evento.nombre || "sin-id"}`;
}

async function apiJson(url, options = {}) {
  let response;

  try {
    response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    });
  } catch {
    throw new Error("No hay conexion con el backend. Inicia BACK y revisa CORS/puerto 3000.");
  }

  const rawText = await response.text();
  let data = {};

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { error: rawText };
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || "Error de comunicacion con backend");
  }

  return data;
}

function MapBoard() {
  const [gameState, setGameState] = useState(mockGameState);
  const [selectedOriginId, setSelectedOriginId] = useState(null);
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [feedback, setFeedback] = useState("Sincronizando con backend...");
  const [loading, setLoading] = useState(false);
  const [logLines, setLogLines] = useState([]);
  const [actionMode, setActionMode] = useState(null);
  const [lastDice, setLastDice] = useState(null);
  const [eventModal, setEventModal] = useState(null);
  const lastSeenEventRef = useRef(null);

  const provinceIds = useMemo(() => Object.keys(provincePositions), []);
  const currentPlayer = gameState.jugadores?.[gameState.turnoActual];
  const isHumanTurn = currentPlayer?.tipo === "humano";
  const players = gameState.jugadores || [];
  const humanPlayer = players.find((player) => player.tipo === "humano");
  const humanMission = gameState.misiones?.[humanPlayer?.id];

  useEffect(() => {
    void cargarJuego();
  }, []);

  useEffect(() => {
    const evento = gameState.eventoActual;
    if (!evento) return;

    const key = getEventKey(evento, gameState.historialEventos?.length);
    if (!key || key === lastSeenEventRef.current) return;

    lastSeenEventRef.current = key;
    const descripcion = getEventDescription(evento);
    setEventModal({
      nombre: evento.nombre || "Evento",
      descripcion,
      ronda: evento.ronda,
    });
    setLogLines((prev) => [`Evento: ${evento.nombre || "Evento"}. ${descripcion}`, ...prev].slice(0, 6));
  }, [gameState.eventoActual, gameState.historialEventos]);

  const troopsByPlayer = useMemo(() => {
    const map = {};
    Object.values(gameState.provincias || {}).forEach((provincia) => {
      map[provincia.owner] = (map[provincia.owner] || 0) + (provincia.cantTropas || 0);
    });
    return map;
  }, [gameState.provincias]);

  const regionStatus = useMemo(() => {
    const regiones = gameState.regiones || {};
    return Object.entries(regiones).map(([regionId, region]) => {
      const total = region.provincias.length;
      const controladas = region.provincias.filter((provinciaId) => gameState.provincias?.[provinciaId]?.owner === currentPlayer?.id).length;
      const completa = total > 0 && controladas === total;
      return {
        id: regionId,
        nombre: region.nombre,
        bonus: region.bonus,
        controladas,
        total,
        completa,
      };
    });
  }, [gameState.regiones, gameState.provincias, currentPlayer?.id]);

  const validTargets = useMemo(() => {
    const ids = new Set();
    if (!selectedOriginId) return ids;

    const origin = gameState.provincias[selectedOriginId];
    if (!origin) return ids;

    const neighbors = origin.vecinos?.length ? origin.vecinos : DEFAULT_NEIGHBORS[selectedOriginId] || [];
    neighbors.forEach((neighborId) => {
      const province = gameState.provincias[neighborId];
      if (!province) return;

      if (gameState.fase === "ataque" && province.owner !== origin.owner) {
        ids.add(neighborId);
      }

      if (gameState.fase === "movimiento" && province.owner === origin.owner) {
        ids.add(neighborId);
      }
    });

    return ids;
  }, [selectedOriginId, gameState.fase, gameState.provincias]);

  const validTargetIds = useMemo(() => Array.from(validTargets), [validTargets]);

  function clearSelection() {
    setSelectedOriginId(null);
    setSelectedTargetId(null);
  }

  function cancelActionMode() {
    setActionMode(null);
    clearSelection();
  }

  function pushLog(line) {
    setLogLines((prev) => [line, ...prev].slice(0, 6));
  }

  function setGameFromResponse(payload) {
    const rawGame = payload?.juego || payload;
    setGameState(normalizeGame(rawGame));
  }

  async function cargarJuego() {
    try {
      setLoading(true);
      const data = await apiJson(`${API_BASE}/juego`);
      setGameFromResponse(data);
      setFeedback("Partida cargada.");
      setLogLines([]);
      setLastDice(null);
    } catch {
      setFeedback("No se pudo conectar al backend. Se mantiene modo local de prueba.");
      setGameState(mockGameState);
    } finally {
      setLoading(false);
    }
  }

  function isNeighbor(originId, targetId) {
    const origin = gameState.provincias[originId];
    const neighbors = origin?.vecinos?.length ? origin.vecinos : DEFAULT_NEIGHBORS[originId] || [];
    return neighbors.includes(targetId);
  }

  async function aplicarRefuerzo(provinceId) {
    try {
      setLoading(true);
      const data = await apiJson(`${API_BASE}/refuerzo`, {
        method: "POST",
        body: JSON.stringify({
          provinciaId: provinceId,
          jugadorId: currentPlayer?.id,
        }),
      });
      setGameFromResponse(data);
      const line = `${currentPlayer?.nombre || "Jugador"} refuerza ${provinceNames[provinceId]} (+1)`;
      setFeedback(line);
      pushLog(line);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleProvinceClick(provinceId) {
    if (loading) return;

    if (!isHumanTurn) {
      setFeedback("Es turno de bot. Finaliza turno para continuar.");
      return;
    }

    const provincia = gameState.provincias[provinceId];
    if (!provincia) return;

    if (gameState.fase === "refuerzo") {
      if (provincia.owner !== currentPlayer?.id) {
        setFeedback("Solo podes reforzar provincias propias.");
        return;
      }
      if (provincia.bloqueado) {
        setFeedback("Esta provincia esta bloqueada.");
        return;
      }

      clearSelection();
      await aplicarRefuerzo(provinceId);
      return;
    }

    if (gameState.fase === "ataque") {
      if (actionMode !== "ataque") {
        setFeedback("Toca el boton Atacar para iniciar una accion de ataque.");
        return;
      }

      if (!selectedOriginId) {
        if (provincia.owner !== currentPlayer?.id) {
          setFeedback("El origen de ataque debe ser una provincia propia.");
          return;
        }
        if (provincia.cantTropas <= 1) {
          setFeedback("Necesitas 2 o mas tropas para atacar.");
          return;
        }

        setSelectedOriginId(provinceId);
        setSelectedTargetId(null);
        setFeedback(`Origen elegido: ${provinceNames[provinceId]}. Ahora elegi objetivo enemigo vecino.`);
        return;
      }

      if (selectedOriginId === provinceId) {
        clearSelection();
        setFeedback("Seleccion de ataque limpiada.");
        return;
      }

      const origin = gameState.provincias[selectedOriginId];
      if (!origin) return;

      if (provincia.owner === origin.owner) {
        setFeedback("El objetivo de ataque debe ser enemigo.");
        return;
      }

      if (!isNeighbor(selectedOriginId, provinceId)) {
        setFeedback("El objetivo debe ser provincia vecina del origen.");
        return;
      }

      setSelectedTargetId(provinceId);
      setFeedback(`Ataque listo: ${provinceNames[selectedOriginId]} -> ${provinceNames[provinceId]}. Confirma para ejecutar.`);
      return;
    }

    if (gameState.fase === "movimiento") {
      if (actionMode !== "movimiento") {
        setFeedback("Toca el boton Mover tropas para iniciar una accion de movimiento.");
        return;
      }

      if (!selectedOriginId) {
        if (provincia.owner !== currentPlayer?.id) {
          setFeedback("El origen de movimiento debe ser una provincia propia.");
          return;
        }
        if (provincia.cantTropas <= 1) {
          setFeedback("Necesitas 2 o mas tropas para mover.");
          return;
        }

        setSelectedOriginId(provinceId);
        setSelectedTargetId(null);
        setFeedback(`Origen elegido: ${provinceNames[provinceId]}. Ahora elegi destino propio vecino.`);
        return;
      }

      if (selectedOriginId === provinceId) {
        clearSelection();
        setFeedback("Seleccion de movimiento limpiada.");
        return;
      }

      const origin = gameState.provincias[selectedOriginId];
      if (!origin) return;

      if (provincia.owner !== origin.owner) {
        setFeedback("El destino de movimiento debe ser propio.");
        return;
      }

      if (!isNeighbor(selectedOriginId, provinceId)) {
        setFeedback("El destino debe ser provincia vecina del origen.");
        return;
      }

      setSelectedTargetId(provinceId);
      setFeedback(`Movimiento listo: ${provinceNames[selectedOriginId]} -> ${provinceNames[provinceId]}. Confirma para ejecutar.`);
    }
  }

  async function confirmAttack() {
    if (loading) return;

    if (gameState.fase !== "ataque") {
      setFeedback("Primero cambia a fase ataque.");
      return;
    }

    if (!selectedOriginId || !selectedTargetId) {
      setFeedback("Selecciona origen y objetivo para confirmar el ataque.");
      return;
    }

    try {
      setLoading(true);
      const data = await apiJson(`${API_BASE}/ataque`, {
        method: "POST",
        body: JSON.stringify({
          origenId: selectedOriginId,
          destinoId: selectedTargetId,
          jugadorId: currentPlayer?.id,
        }),
      });
      setGameFromResponse(data);
      setLastDice(data?.dados || null);

      const dados = data?.dados;
      if (dados) {
        const resumen =
          data.resultado === "ataque"
            ? `Ataque ${dados.atacante} vs ${dados.defensor}: ataque gana`
            : `Ataque ${dados.atacante} vs ${dados.defensor}: defensa gana`;
        const conquista = data.conquista ? ` y conquista ${provinceNames[selectedTargetId]}` : "";
        const line = `${provinceNames[selectedOriginId]} -> ${provinceNames[selectedTargetId]} | ${resumen}${conquista}`;
        pushLog(line);
        if (data.conquista) {
          setFeedback(`${resumen}. Si terminas turno, ganas +2 refuerzos por conquista.`);
        } else {
          setFeedback(resumen);
        }
      } else {
        setFeedback("Ataque confirmado.");
      }
    } catch (error) {
      setFeedback(error.message);
    } finally {
      cancelActionMode();
      setLoading(false);
    }
  }

  async function confirmMove() {
    if (loading) return;

    if (gameState.fase !== "movimiento") {
      setFeedback("Primero cambia a fase movimiento.");
      return;
    }

    if (!selectedOriginId || !selectedTargetId) {
      setFeedback("Selecciona origen y destino para confirmar el movimiento.");
      return;
    }

    try {
      setLoading(true);
      const data = await apiJson(`${API_BASE}/movimiento`, {
        method: "POST",
        body: JSON.stringify({
          origenId: selectedOriginId,
          destinoId: selectedTargetId,
          cantidad: 1,
          jugadorId: currentPlayer?.id,
        }),
      });
      setGameFromResponse(data);
      const line = `Movimiento: ${provinceNames[selectedOriginId]} -> ${provinceNames[selectedTargetId]} (+1)`;
      setFeedback(line);
      pushLog(line);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      cancelActionMode();
      setLoading(false);
    }
  }

  async function nextPhase() {
    if (loading) return;

    if (!isHumanTurn) {
      setFeedback("No podes cambiar fase en turno bot.");
      return;
    }

    try {
      setLoading(true);
      const data = await apiJson(`${API_BASE}/juego/fase/siguiente`, {
        method: "POST",
        body: JSON.stringify({ jugadorId: currentPlayer?.id }),
      });
      setGameFromResponse(data);
      const next = data?.faseActual || data?.juego?.fase || "siguiente";
      const line = `Fase cambiada a ${next}`;
      setFeedback(line);
      pushLog(line);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      cancelActionMode();
      setLoading(false);
    }
  }

  async function finishTurn() {
    if (loading) return;

    if (!isHumanTurn) {
      setFeedback("Es turno de bot.");
      return;
    }

    try {
      setLoading(true);
      const data = await apiJson(`${API_BASE}/juego/turno/finalizar`, {
        method: "POST",
        body: JSON.stringify({ jugadorId: currentPlayer?.id }),
      });
      setGameFromResponse(data);
      const line = "Turno finalizado";
      setFeedback(line);
      pushLog(line);

      const ganadorPorMision = data?.ganadorPorMision;
      if (ganadorPorMision?.jugadorId && data?.ganador) {
        const descripcionMision = ganadorPorMision.mision?.descripcion || "Mision cumplida";
        setFeedback(`Victoria por mision: ${descripcionMision}`);
        pushLog(`Victoria por mision: ${descripcionMision}`);
      }
    } catch (error) {
      setFeedback(error.message);
    } finally {
      cancelActionMode();
      setLoading(false);
    }
  }

  async function resetGame() {
    if (loading) return;

    try {
      setLoading(true);
      const data = await apiJson(`${API_BASE}/juego/reiniciar`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setGameFromResponse(data);
      setFeedback("Partida reiniciada.");
      setLogLines([]);
      setLastDice(null);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      cancelActionMode();
      setLoading(false);
    }
  }

  const statusEvent = gameState.eventoActual?.nombre || gameState.eventoActual || "Sin evento";
  const statusEventDescription = getEventDescription(gameState.eventoActual);
  const isAttackPhase = gameState.fase === "ataque";
  const isMovePhase = gameState.fase === "movimiento";
  const isRefuerzoPhase = gameState.fase === "refuerzo";

  const canConfirmAttack = isAttackPhase && actionMode === "ataque" && selectedOriginId && selectedTargetId;
  const canConfirmMove = isMovePhase && actionMode === "movimiento" && selectedOriginId && selectedTargetId;

  const nextPhaseLabel =
    gameState.fase === "refuerzo"
      ? "Pasar a Ataque"
      : gameState.fase === "ataque"
        ? "Pasar a Movimiento"
        : "Finalizar turno";

  function toggleActionMode(mode) {
    if (loading) return;
    if (actionMode === mode) {
      cancelActionMode();
      setFeedback(`Accion de ${mode} cancelada.`);
      return;
    }

    setActionMode(mode);
    clearSelection();
    const text = mode === "ataque" ? "Selecciona origen y destino para atacar." : "Selecciona origen y destino para mover tropas.";
    setFeedback(text);
  }

  return (
    <main className="map-board-shell">
      <section className="board-layout">
        <aside className="side-panel left-panel">
          <h2 className="panel-title">Estaciones jugador</h2>

          <div className="player-stack">
            {players.map((player) => {
              const isActive = player.id === currentPlayer?.id;
              return (
                <article key={player.id} className={`player-card ${isActive ? "active" : ""}`}>
                  <header>
                    <span className="player-name">{player.nombre}</span>
                    <span className="player-type">{player.tipo === "humano" ? "Vos" : "Bot"}</span>
                  </header>
                  <div className="player-row">
                    <span className="color-dot" style={{ backgroundColor: ownerColors[player.id] || "#2d6a4f" }} />
                    <span>Color</span>
                  </div>
                  <div className="player-row">
                    <strong>Tropas:</strong>
                    <span>{troopsByPlayer[player.id] || 0}</span>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="phase-box">
            <span>Ronda {gameState.ronda ?? 1}</span>
            <strong>Fase: {gameState.fase}</strong>
            {typeof gameState.refuerzosDisponibles === "number" ? (
              <span>Refuerzos disponibles: {gameState.refuerzosDisponibles}</span>
            ) : null}
          </div>

          <div className="event-box">
            <strong>Mision secreta</strong>
            <span>{humanMission?.descripcion || "Mision no disponible"}</span>
          </div>

          <div className="selection-box">
            <strong>Bonos de refuerzo</strong>
            <span>Territorios: {gameState.bonusRefuerzoActual?.territorios ?? 0}</span>
            <span>Regiones: {gameState.bonusRefuerzoActual?.regiones ?? 0}</span>
            <span>Conquista: {gameState.bonusRefuerzoActual?.conquista ?? 0}</span>
            <strong>Total: {gameState.bonusRefuerzoActual?.total ?? gameState.refuerzosDisponibles ?? 0}</strong>
          </div>

          <div className="selection-box">
            <strong>Control regional</strong>
            {regionStatus.length ? (
              regionStatus.map((region) => (
                <span key={region.id}>
                  {region.nombre}: {region.controladas}/{region.total}
                  {region.completa ? ` (+${region.bonus})` : ""}
                </span>
              ))
            ) : (
              <span>Sin regiones configuradas</span>
            )}
          </div>
        </aside>

        <section className="map-container" aria-label="Tablero de Argentina">
          <img src={mapaArgentina} alt="Mapa de Argentina" className="map-image" />

          {isAttackPhase && actionMode === "ataque" && selectedOriginId && validTargetIds.length > 0 && (
            <svg className="attack-arrows-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <marker
                  id="attackArrowHead"
                  markerWidth="3.4"
                  markerHeight="3.4"
                  refX="2.6"
                  refY="1.7"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,3.4 L3.4,1.7 z" fill="#ffd66e" />
                </marker>
              </defs>

              {validTargetIds.map((targetId) => {
                const originPos = provincePositions[selectedOriginId];
                const targetPos = provincePositions[targetId];
                if (!originPos || !targetPos) return null;

                const x1 = parsePercent(originPos.left);
                const y1 = parsePercent(originPos.top);
                const x2 = parsePercent(targetPos.left);
                const y2 = parsePercent(targetPos.top);

                return (
                  <line
                    key={`arrow-${selectedOriginId}-${targetId}`}
                    className="attack-arrow-line"
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    markerEnd="url(#attackArrowHead)"
                  />
                );
              })}
            </svg>
          )}

          {provinceIds.map((provinceId) => {
            const provincia = gameState.provincias[provinceId];
            if (!provincia) return null;
            const position = provincePositions[provinceId];
            const selected = selectedOriginId === provinceId || selectedTargetId === provinceId;
            const asOrigin = selectedOriginId === provinceId;
            const asTarget = selectedTargetId === provinceId;
            const isValidTarget = validTargets.has(provinceId);

            return (
              <button
                key={provinceId}
                type="button"
                className={`province-marker ${selected ? "selected" : ""} ${asOrigin ? "origin" : ""} ${asTarget ? "target" : ""} ${isValidTarget ? "valid-target" : ""} ${provincia.bloqueado ? "blocked" : ""}`}
                style={{
                  top: position.top,
                  left: position.left,
                  backgroundColor: ownerColors[provincia.owner] || ownerColors["jugador-1"],
                }}
                onClick={() => handleProvinceClick(provinceId)}
                title={provinceNames[provinceId]}
              >
                <span>{provincia.cantTropas}</span>
              </button>
            );
          })}
        </section>

        <aside className="side-panel right-panel">
          <h2 className="panel-title">Evento activo</h2>
          <div className="event-box">
            <strong>{statusEvent}</strong>
            <span>{statusEventDescription}</span>
          </div>

          <h2 className="panel-title">Dados</h2>
          <div className="dice-box">
            <div className="die-card">
              <span>Atacante</span>
              <strong>{lastDice?.atacante ?? "-"}</strong>
            </div>
            <div className="die-card">
              <span>Defensor</span>
              <strong>{lastDice?.defensor ?? "-"}</strong>
            </div>
          </div>

          <h2 className="panel-title">Log de juego</h2>
          <ul className="log-box">
            {logLines.length ? (
              logLines.map((line, idx) => <li key={`${line}-${idx}`}>{line}</li>)
            ) : (
              <li>Sin acciones recientes</li>
            )}
          </ul>

          <h2 className="panel-title">Acciones</h2>
          <div className="map-actions">
            {isRefuerzoPhase && (
              <p className="action-hint">Haz click en una provincia propia para reforzar.</p>
            )}

            {isAttackPhase && (
              <button
                type="button"
                disabled={loading}
                className={actionMode === "ataque" ? "action-active" : ""}
                onClick={() => toggleActionMode("ataque")}
              >
                {actionMode === "ataque" ? "Cancelar ataque" : "Atacar"}
              </button>
            )}

            {canConfirmAttack && (
              <button type="button" className="action-confirm" disabled={loading} onClick={confirmAttack}>
                Confirmar ataque
              </button>
            )}

            {isMovePhase && (
              <button
                type="button"
                disabled={loading}
                className={actionMode === "movimiento" ? "action-active" : ""}
                onClick={() => toggleActionMode("movimiento")}
              >
                {actionMode === "movimiento" ? "Cancelar movimiento" : "Mover tropas"}
              </button>
            )}

            {canConfirmMove && (
              <button type="button" className="action-confirm" disabled={loading} onClick={confirmMove}>
                Confirmar movimiento
              </button>
            )}

            {gameState.fase !== "movimiento" ? (
              <button type="button" disabled={loading} onClick={nextPhase}>{nextPhaseLabel}</button>
            ) : (
              <button type="button" disabled={loading} onClick={finishTurn}>{nextPhaseLabel}</button>
            )}
          </div>

          <h2 className="panel-title">Utilidades</h2>
          <div className="utility-actions">
            <button type="button" className="action-clear" disabled={loading} onClick={cancelActionMode}>Limpiar seleccion</button>
          </div>

          <h2 className="panel-title">Partida</h2>
          <div className="danger-zone">
            <button type="button" className="action-danger" disabled={loading} onClick={resetGame}>Reiniciar partida</button>
          </div>

          <div className="selection-box">
            <span>Origen: {selectedOriginId ? provinceNames[selectedOriginId] : "-"}</span>
            <span>Objetivo: {selectedTargetId ? provinceNames[selectedTargetId] : "-"}</span>
          </div>
        </aside>
      </section>

      <footer className="map-feedback">{loading ? "Procesando..." : feedback}</footer>

      {eventModal && (
        <div className="event-modal-overlay" role="dialog" aria-modal="true" aria-label="Nuevo evento">
          <div className="event-modal">
            <h3>{eventModal.nombre}</h3>
            {typeof eventModal.ronda === "number" ? <p className="event-modal-round">Ronda {eventModal.ronda}</p> : null}
            <p>{eventModal.descripcion}</p>
            <button type="button" onClick={() => setEventModal(null)}>
              Aceptar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default MapBoard;
