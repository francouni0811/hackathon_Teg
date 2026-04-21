export class Jugador {
  constructor(id, nombre, tipo = "humano", color = "gris") {
    this.id = id;
    this.nombre = nombre;
    this.tipo = tipo;
    this.color = color;
  }
}