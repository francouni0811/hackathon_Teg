import express from "express";
import { getJuego, reiniciarJuego } from "../services/gameState.js";
import { finalizarTurno, pasarFase } from "../services/turno.service.js";

const router = express.Router();

router.get("/", (req, res) => {
  return res.status(200).json(getJuego());
});

router.post("/reiniciar", (req, res) => {
  const juego = reiniciarJuego();
  return res.status(200).json({
    mensaje: "Juego reiniciado",
    juego,
  });
});

router.post("/fase/siguiente", (req, res) => {
  try {
    const { jugadorId } = req.body;
    const resultado = pasarFase(jugadorId);
    return res.status(200).json(resultado);
  } catch (error) {
    return res.status(error.status || 400).json({
      error: error.message || "No se pudo avanzar de fase",
    });
  }
});

router.post("/turno/finalizar", (req, res) => {
  try {
    const { jugadorId } = req.body;
    const resultado = finalizarTurno(jugadorId);
    return res.status(200).json(resultado);
  } catch (error) {
    return res.status(error.status || 400).json({
      error: error.message || "No se pudo finalizar el turno",
    });
  }
});

export default router;
