import { CANVAS_WIDTH, CANVAS_HEIGHT, COURT } from '../tennisConstants';

export class Ball {
  public x: number;
  public y: number;
  public z: number;
  public vx: number;
  public vy: number;
  public vz: number;
  public speed: number;
  public radius: number;
  public lastHitByPlayer: boolean = true;
  public isVisible: boolean = false;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.speed = 4;
    this.radius = 6;
  }

  public reset(servingToPlayer: boolean = true): void {
    this.x = COURT.x + COURT.width / 2;
    this.y = servingToPlayer ? COURT.y + 120 : COURT.y + COURT.height - 140;
    this.z = 0;
    this.vx = 0;
    this.vy = servingToPlayer ? 2.5 : -2.5;
    this.vz = 0;
    this.lastHitByPlayer = !servingToPlayer;
    this.history = [];
  }

  public history: { x: number; y: number }[] = [];

  public update(): void {
    this.x += this.vx;
    this.y += this.vy;

    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > 8) {
      this.history.shift();
    }
  }
}
