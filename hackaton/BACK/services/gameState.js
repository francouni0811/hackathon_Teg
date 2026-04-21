import { crearJuegoInicial } from "../models/juegoInicial.js";

let juego = crearJuegoInicial();

export function getJuego() {
  return juego;
}

export function setJuego(nuevoJuego) {
  juego = nuevoJuego;
  return juego;
}

export function reiniciarJuego() {
  juego = crearJuegoInicial();
  return juego;
}
