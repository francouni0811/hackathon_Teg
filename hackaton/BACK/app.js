import express from 'express';
import cors from 'cors';

import AtaqueRoute from "./routes/ataque.route.js"
import RefuerzoRoute from "./routes/refuerzo.route.js"
import MovimientoRoute from "./routes/movimiento.route.js"
import JuegoRoute from "./routes/juego.route.js"

const app = express();
const PORT = 3000;
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

// cors
app.use(cors({
  origin: (origin, callback) => {
    // Permite herramientas sin origin (curl/postman) y front en Vite local.
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origen no permitido por CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json()).use(express.urlencoded({ extended: true }));

// healthcheck
app.get("/", (req, res) => {
    res.status(200).json({ msg : "todo ok"})
} )

// routers
app.use("/juego", JuegoRoute)
app.use("/refuerzo", RefuerzoRoute)
app.use("/ataque", AtaqueRoute)
app.use("/movimiento", MovimientoRoute)
app.use("/teg/atacar", AtaqueRoute)
app.use("/teg/reforzar", RefuerzoRoute)
app.use("/teg/movimiento", MovimientoRoute)



// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});


(async function start() {

    app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
}());
