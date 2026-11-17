import { COURT } from '../tennisConstants';

export class Court {
  public static render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#15803d';
    ctx.fillRect(COURT.x, COURT.y, COURT.width, COURT.height);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(COURT.x, COURT.y, COURT.width, COURT.height);

    ctx.beginPath();
    ctx.moveTo(COURT.x + COURT.width / 2, COURT.y);
    ctx.lineTo(COURT.x + COURT.width / 2, COURT.y + COURT.height);
    ctx.stroke();

    ctx.strokeRect(COURT.x + 40, COURT.y + 120, COURT.width - 80, COURT.height - 240);

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(COURT.x - 10, COURT.netY - 4, COURT.width + 20, 8);

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(COURT.x - 14, COURT.netY - 10, 8, 20);
    ctx.fillRect(COURT.x + COURT.width + 6, COURT.netY - 10, 8, 20);
  }
}
