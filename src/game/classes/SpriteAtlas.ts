export class SpriteAtlas {
  public image: HTMLImageElement;
  public isLoaded: boolean = false;
  public frameWidth: number = 0;
  public frameHeight: number = 0;

  constructor(imagePath: string, totalCols: number = 2, totalRows: number = 4) {
    this.image = new Image();
    this.image.src = imagePath;
    this.image.onload = () => {
      this.isLoaded = true;
      this.frameWidth = this.image.width / totalCols;
      this.frameHeight = this.image.height / totalRows;
    };
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    col: number,
    row: number,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number,
  ): void {
    if (!this.isLoaded) return;

    const sx = col * this.frameWidth;
    const sy = row * this.frameHeight;
    ctx.drawImage(this.image, sx, sy, this.frameWidth, this.frameHeight, dx, dy, dWidth, dHeight);
  }
}
