export class Provincia {
  constructor(id, nombre, owner = null, cantTropas = 0, vecinos = [], bloqueado = false) {
    this.id = id;
    this.nombre = nombre;
    this.owner = owner;
    this.cantTropas = cantTropas;
    this.vecinos = vecinos;
    this.bloqueado = bloqueado;
  }
}