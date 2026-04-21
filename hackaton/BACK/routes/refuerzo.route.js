import express from "express"
import { aplicarRefuerzo } from "../services/refuerzo.service.js";


const router = express.Router()

router.post("/", (req, res) => {
    try {
        const { provinciaId, jugadorId } = req.body;
        const resultado = aplicarRefuerzo({ provinciaId, jugadorId });
        return res.status(200).json(resultado);
    } catch (error) {
        return res.status(error.status || 400).json({
            error: error.message || "No se pudo aplicar el refuerzo",
        });
    }
})

export default router