import express from "express"
import { aplicarMovimiento } from "../services/movimiento.service.js";


const router = express.Router()

router.post("/", (req, res) => {
    try {
        const { origenId, destinoId, cantidad, jugadorId } = req.body;
        const resultado = aplicarMovimiento({ origenId, destinoId, cantidad, jugadorId });
        return res.status(200).json(resultado);
    } catch (error) {
        return res.status(error.status || 400).json({
            error: error.message || "No se pudo aplicar el movimiento",
        });
    }
})

export default router