import express from "express"
import { aplicarAtaque } from "../services/ataque.service.js";


const router = express.Router()

router.post("/", (req, res) => {
    try {
        const { origenId, destinoId, jugadorId } = req.body;
        const resultado = aplicarAtaque({ origenId, destinoId, jugadorId });
        return res.status(200).json(resultado);
    } catch (error) {
        return res.status(error.status || 400).json({
            error: error.message || "No se pudo resolver el ataque",
        });
    }
})

export default router