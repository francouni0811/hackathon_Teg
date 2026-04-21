import { getJuego, setJuego } from "./gameState.js";

function crearError(mensaje, status = 400) {
	const error = new Error(mensaje);
	error.status = status;
	return error;
}

function tirarDado() {
	return Math.floor(Math.random() * 6) + 1;
}

function verificarGanador(juego) {
	const owners = new Set(juego.provincias.map((provincia) => provincia.owner));
	if (owners.size === 1) {
		const [ganadorId] = [...owners];
		juego.ganador = ganadorId;
	}
}

function evaluarMisionJugador(juego, jugadorId) {
	const mision = juego.misiones?.[jugadorId];
	if (!mision) return false;

	if (mision.tipo === "controlar-region") {
		const region = juego.regiones?.[mision.regionId];
		if (!region) return false;
		return region.provincias.every((provinciaId) => {
			const provincia = juego.provincias.find((item) => item.id === provinciaId);
			return provincia?.owner === jugadorId;
		});
	}

	if (mision.tipo === "conquistar-cantidad") {
		const cantidad = juego.provincias.filter((provincia) => provincia.owner === jugadorId).length;
		return cantidad >= mision.objetivo;
	}

	if (mision.tipo === "fortificar-cantidad") {
		const tropasMinimas = mision.tropasMinimas || 3;
		const cantidad = juego.provincias.filter((provincia) => provincia.owner === jugadorId && provincia.cantTropas >= tropasMinimas).length;
		return cantidad >= mision.objetivo;
	}

	return false;
}

export function aplicarAtaque({ origenId, destinoId, jugadorId }) {
	const juego = getJuego();

	if (!juego) {
		throw crearError("No hay juego inicializado", 500);
	}

	if (juego.ganador) {
		throw crearError("La partida ya finalizo", 409);
	}

	if (juego.fase !== "ataque") {
		throw crearError("La fase actual no permite ataques");
	}

	const jugadorActual = juego.jugadores[juego.turnoActual];
	if (!jugadorActual) {
		throw crearError("No se encontro el jugador del turno actual", 500);
	}

	if (jugadorId && jugadorId !== jugadorActual.id) {
		throw crearError("No es el turno del jugador indicado", 403);
	}

	if (!origenId || !destinoId) {
		throw crearError("Faltan origenId o destinoId");
	}

	const origen = juego.provincias.find((provincia) => provincia.id === origenId);
	const destino = juego.provincias.find((provincia) => provincia.id === destinoId);

	if (!origen || !destino) {
		throw crearError("Provincia origen o destino no encontrada", 404);
	}

	if (origen.owner !== jugadorActual.id) {
		throw crearError("La provincia origen no pertenece al jugador actual", 403);
	}

	if (origen.owner === destino.owner) {
		throw crearError("No se puede atacar una provincia propia");
	}

	if (origen.bloqueado) {
		throw crearError("La provincia origen esta bloqueada y no puede atacar");
	}

	if (origen.cantTropas <= 1) {
		throw crearError("La provincia origen necesita mas de 1 tropa para atacar");
	}

	if (!origen.vecinos.includes(destino.id)) {
		throw crearError("La provincia destino no es vecina de la provincia origen");
	}

	const dadoAtacante = tirarDado();
	const dadoDefensor = tirarDado();
	let resultado = "defensa";
	let conquista = false;

	if (dadoAtacante > dadoDefensor) {
		destino.cantTropas -= 1;
		resultado = "ataque";

		if (destino.cantTropas <= 0) {
			destino.owner = jugadorActual.id;
			destino.cantTropas = 1;
			origen.cantTropas -= 1;
			conquista = true;
			if (!juego.conquistasTurno) juego.conquistasTurno = {};
			juego.conquistasTurno[jugadorActual.id] = (juego.conquistasTurno[jugadorActual.id] || 0) + 1;
		}
	} else {
		origen.cantTropas -= 1;
	}

	if (!juego.ganador && evaluarMisionJugador(juego, jugadorActual.id)) {
		juego.ganador = jugadorActual.id;
		juego.ganadorPorMision = {
			jugadorId: jugadorActual.id,
			mision: juego.misiones?.[jugadorActual.id] || null,
		};
	}

	verificarGanador(juego);
	setJuego(juego);

	return {
		mensaje: "Ataque resuelto",
		jugadorActual: {
			id: jugadorActual.id,
			nombre: jugadorActual.nombre,
			tipo: jugadorActual.tipo,
		},
		dados: {
			atacante: dadoAtacante,
			defensor: dadoDefensor,
		},
		resultado,
		conquista,
		conquistasTurno: juego.conquistasTurno?.[jugadorActual.id] || 0,
		origen,
		destino,
		ganador: juego.ganador,
		ganadorPorMision: juego.ganadorPorMision || null,
		juego,
	};
}

