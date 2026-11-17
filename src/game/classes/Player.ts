import { COURT } from '../tennisConstants';

export class Player {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public speed: number;
  public score: number = 0;
  public sets: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.width = 60; // Aumentado de 44 para 60
    this.height = 50; // Aumentado de 36 para 50
    this.speed = 5;
  }

  public move(dx: number, dy: number, isAi: boolean = false): void {
    this.x += dx * this.speed;
    this.y += dy * this.speed;

    const minX = COURT.x;
    const maxX = COURT.x + COURT.width - this.width;
    let minY: number;
    let maxY: number;

    if (isAi) {
      minY = COURT.y;
      maxY = COURT.y + COURT.height / 2 - this.height;
    } else {
      minY = COURT.y + COURT.height / 2;
      maxY = COURT.y + COURT.height - this.height;
    }

    if (this.x < minX) this.x = minX;
    if (this.x > maxX) this.x = maxX;
    if (this.y < minY) this.y = minY;
    if (this.y > maxY) this.y = maxY;
  }

  public resetPosition(startX: number, startY: number): void {
    this.x = startX;
    this.y = startY;
  }
}
