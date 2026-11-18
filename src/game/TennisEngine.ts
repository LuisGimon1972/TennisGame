import { CANVAS_WIDTH, CANVAS_HEIGHT, COURT } from './tennisConstants';
import { Ball } from './classes/Ball';
import { Player } from './classes/Player';
import { Court } from './classes/Court';
import { SpriteAtlas } from './classes/SpriteAtlas';
import { soundManager } from './classes/SoundManager';

const MAX_BALL_SPEED = 6.5;

type Competitor = 'player' | 'ai';
type PointReason = 'upper-baseline' | 'lower-baseline' | 'side-out';

interface BounceMark {
  x: number;
  y: number;
  alpha: number;
  type: 'player-point' | 'ai-point' | 'neutral';
}

export class TennisEngine {
  public player: Player;
  public ai: Player;
  public ball: Ball;
  public atlas: SpriteAtlas;
  public isGameOver = false;
  public message = 'PRONTO PARA JOGAR! (SAQUE)';
  public isDeuce = false;
  public advantageServer: 'player' | 'ai' | null = null;
  public bounceMarks: BounceMark[] = [];
  public isGameStarted = false;

  private difficulty: 'easy' | 'hard' = 'hard';
  private gameMode: 'pvp' | 'pve' = 'pve';

  private powerCharge = 0;
  private isCharging = false;
  private chargeStartTime = 0;
  private maxChargeTime = 1000;

  private p2PowerCharge = 0;
  private p2IsCharging = false;
  private p2ChargeStartTime = 0;

  private rallyId = 0;
  private resolvedRallyId = -1;
  private lastStriker: Competitor | null = null;
  public lastPoint: {
    rallyId: number;
    winner: Competitor;
    reason: PointReason;
  } | null = null;

  private lastHitTime = 0;
  private hitCooldownMs = 350;
  private aiTargetX = 0;
  private aiTargetY = 0;
  private aiNextDecisionAt = 0;
  private aiWasReceiving = false;
  private aiApproachNet = false;

  constructor() {
    this.player = new Player(COURT.x + COURT.width / 2 - 22, COURT.y + COURT.height - 80);
    this.ai = new Player(COURT.x + COURT.width / 2 - 22, COURT.y + 40);
    this.ball = new Ball(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    this.atlas = new SpriteAtlas('images/AtlasTennis1.png', 2, 4);
    this.resetPoint(true);
  }

  public setDifficulty(level: 'easy' | 'hard'): void {
    this.difficulty = level;
    this.gameMode = 'pve';
    this.message = level === 'hard' ? 'Modo Difícil Ativado' : 'Modo Fácil Ativado';
  }

  public setGameMode(mode: 'pve' | 'pvp'): void {
    this.gameMode = mode;
    this.message = mode === 'pvp' ? 'Modo Humano vs Humano Ativado' : 'Modo Jogador vs IA Ativado';
  }

  public startPowerCharge(): void {
    if (this.isGameOver || !this.isGameStarted) return;
    this.isCharging = true;
    this.chargeStartTime = performance.now();
    this.powerCharge = 0;
  }

  public releasePowerCharge(): void {
    if (!this.isCharging) return;
    const elapsed = performance.now() - this.chargeStartTime;
    this.powerCharge = Math.min(elapsed / this.maxChargeTime, 1.0);
    this.isCharging = false;
  }

  public startP2PowerCharge(): void {
    if (this.isGameOver || !this.isGameStarted || this.gameMode !== 'pvp') return;
    this.p2IsCharging = true;
    this.p2ChargeStartTime = performance.now();
    this.p2PowerCharge = 0;
  }

  public releaseP2PowerCharge(): void {
    if (!this.p2IsCharging) return;
    const elapsed = performance.now() - this.p2ChargeStartTime;
    this.p2PowerCharge = Math.min(elapsed / this.maxChargeTime, 1.0);
    this.p2IsCharging = false;
  }

  public resetPoint(servingToPlayer: boolean = true): void {
    this.rallyId += 1;
    this.lastStriker = null;
    this.ball.reset(servingToPlayer);
    this.aiNextDecisionAt = 0;
    this.aiWasReceiving = false;
    this.aiApproachNet = false;
    this.isCharging = false;
    this.powerCharge = 0;
    this.p2IsCharging = false;
    this.p2PowerCharge = 0;
    this.lastHitTime = 0;
    this.player.resetPosition(COURT.x + COURT.width / 2 - 22, COURT.y + COURT.height - 80);
    this.ai.resetPosition(COURT.x + COURT.width / 2 - 22, COURT.y + 40);
  }

  public restartMatch(): void {
    this.player.score = 0;
    this.ai.score = 0;
    this.player.sets = 0;
    this.ai.sets = 0;
    this.isGameOver = false;
    this.isDeuce = false;
    this.advantageServer = null;
    this.bounceMarks = [];
    this.lastPoint = null;
    this.message = 'NOVA PARTIDA INICIADA!';
    this.resetPoint(true);
  }

  public getScoreDisplay(score: number, isAi: boolean): string {
    if (this.isGameOver) return 'FIM';

    const pAdv = this.advantageServer === 'player';
    const aAdv = this.advantageServer === 'ai';

    if (this.player.score >= 3 && this.ai.score >= 3) {
      if (this.isDeuce) return '40 (DEUCE)';
      if (isAi && aAdv) return 'VANTAGEM';
      if (!isAi && pAdv) return 'VANTAGEM';
      return '40';
    }

    const mapPoints = ['0', '15', '30', '40'];
    return mapPoints[score] || '40';
  }

  private awardPoint(
    winner: Competitor,
    reason: PointReason,
    rallyId: number,
    landingX?: number,
    landingY?: number,
  ): void {
    if (
      this.isGameOver ||
      !this.isGameStarted ||
      rallyId !== this.rallyId ||
      this.resolvedRallyId === rallyId
    )
      return;

    this.resolvedRallyId = rallyId;
    this.lastPoint = { rallyId, winner, reason };
    this.registerLandingMark(landingX, landingY, winner === 'player' ? 'player-point' : 'ai-point');
    this.handlePointScored(winner === 'player');
    try {
      soundManager.playScore();
    } catch (error) {
      console.warn('Não foi possível reproduzir o som do ponto.', error);
    }
  }

  private handlePointScored(scoredByPlayer: boolean): void {
    if (scoredByPlayer) this.player.score += 1;
    else this.ai.score += 1;

    const playerScore = this.player.score;
    const aiScore = this.ai.score;
    const difference = playerScore - aiScore;

    if (Math.max(playerScore, aiScore) >= 4 && Math.abs(difference) >= 2) {
      this.winGame(difference > 0);
      return;
    }

    this.isDeuce = playerScore >= 3 && aiScore >= 3 && difference === 0;
    this.advantageServer =
      playerScore >= 3 && aiScore >= 3 && difference !== 0
        ? difference > 0
          ? 'player'
          : 'ai'
        : null;

    if (this.isDeuce) this.message = 'DEUCE!';
    else if (this.advantageServer === 'player') this.message = 'VANTAGEM PARA O JOGADOR 1!';
    else if (this.advantageServer === 'ai') {
      this.message =
        this.gameMode === 'pvp' ? 'VANTAGEM PARA O JOGADOR 2!' : 'VANTAGEM PARA O OPONENTE!';
    } else {
      this.message = scoredByPlayer
        ? 'Ponto do Jogador 1!'
        : this.gameMode === 'pvp'
          ? 'Ponto do Jogador 2!'
          : 'Ponto do Oponente!';
    }

    this.resetPoint(!scoredByPlayer);
  }

  private judgeBoundary(
    previousX: number,
    previousY: number,
    rallyId: number,
  ): { x: number; y: number; reason: PointReason } | null {
    const { x, y, radius } = this.ball;
    if (![previousX, previousY, x, y, radius].every(Number.isFinite) || radius < 0) {
      this.message = 'Jogada reiniciada: posição inválida da bola.';
      this.resetPoint(true);
      return null;
    }

    const left = COURT.x - radius;
    const right = COURT.x + COURT.width + radius;
    const top = COURT.y - radius;
    const bottom = COURT.y + COURT.height + radius;
    const dx = x - previousX;
    const dy = y - previousY;
    const exits: { time: number; x: number; y: number; reason: PointReason }[] = [];

    const addExit = (
      outside: boolean,
      deltaX: number,
      deltaY: number,
      startX: number,
      startY: number,
      edgeX: number | null,
      edgeY: number | null,
      reason: PointReason,
    ) => {
      if (!outside) return;
      const fraction =
        edgeY !== null
          ? this.crossingFraction(startY, y, edgeY, deltaY)
          : this.crossingFraction(startX, x, edgeX as number, deltaX);

      exits.push({
        time: fraction,
        x: startX + (x - startX) * fraction,
        y: startY + (y - startY) * fraction,
        reason,
      });
    };

    addExit(x < left, dx, dy, previousX, previousY, left, null, 'side-out');
    addExit(x > right, dx, dy, previousX, previousY, right, null, 'side-out');
    addExit(y < top, dx, dy, previousX, previousY, null, top, 'upper-baseline');
    addExit(y > bottom, dx, dy, previousX, previousY, null, bottom, 'lower-baseline');
    exits.sort((a, b) => a.time - b.time);
    const exit = exits[0];
    if (!exit) return null;

    let winner: Competitor;
    if (exit.reason === 'upper-baseline') {
      winner = exit.y < COURT.y ? 'player' : 'ai';
    } else if (exit.reason === 'lower-baseline') {
      winner = 'ai';
    } else {
      if (this.lastStriker === null) {
        this.message = 'Jogada reiniciada: saída lateral sem autor identificado.';
        this.resetPoint(true);
        return null;
      }
      winner = this.lastStriker === 'player' ? 'ai' : 'player';
    }

    this.awardPoint(winner, exit.reason, rallyId, exit.x, exit.y);
    return { x: exit.x, y: exit.y, reason: exit.reason };
  }

  private crossingFraction(start: number, end: number, edge: number, delta: number): number {
    if (Math.abs(delta) < 0.000001) return 0;
    return this.clamp((edge - start) / delta, 0, 1);
  }

  private winGame(playerWon: boolean) {
    if (playerWon) {
      this.player.sets++;
      this.message = 'JOGO E SET PARA O JOGADOR 1! 🏆';
    } else {
      this.ai.sets++;
      this.message =
        this.gameMode === 'pvp' ? 'JOGO E SET PARA O JOGADOR 2! 🏆' : 'JOGO E SET PARA O OPONENTE!';
    }

    this.player.score = 0;
    this.ai.score = 0;
    this.isDeuce = false;
    this.advantageServer = null;

    if (this.player.sets >= 3 || this.ai.sets >= 3) {
      this.isGameOver = true;
      this.message = playerWon
        ? 'PARTIDA VENCIDA PELO JOGADOR 1!'
        : this.gameMode === 'pvp'
          ? 'PARTIDA VENCIDA PELO JOGADOR 2!'
          : 'PARTIDA VENCIDA PELO OPONENTE!';
    } else {
      this.resetPoint(playerWon);
    }
  }

  public update(playerDx: number, playerDy: number, p2Dx: number = 0, p2Dy: number = 0): void {
    if (this.isGameOver || !this.isGameStarted) return;

    if (this.isCharging) {
      const elapsed = performance.now() - this.chargeStartTime;
      this.powerCharge = Math.min(elapsed / this.maxChargeTime, 1.0);
    }

    if (this.gameMode === 'pvp' && this.p2IsCharging) {
      const elapsed = performance.now() - this.p2ChargeStartTime;
      this.p2PowerCharge = Math.min(elapsed / this.maxChargeTime, 1.0);
    }

    this.player.move(playerDx, playerDy);

    if (this.gameMode === 'pvp') {
      this.ai.move(p2Dx, p2Dy, true);
      const netY = COURT.y + COURT.height / 2;
      const minY = COURT.y + 8;
      const maxY = Math.max(minY, netY - this.ai.height - 24);
      this.ai.x = this.clamp(this.ai.x, COURT.x, COURT.x + COURT.width - this.ai.width);
      this.ai.y = this.clamp(this.ai.y, minY, maxY);
    } else {
      this.updateAI();
    }

    this.limitBallSpeed();

    const previousX = this.ball.x;
    const previousY = this.ball.y;
    const currentRallyId = this.rallyId;

    if (this.lastStriker === null && this.ball.vy !== 0) {
      this.lastStriker = this.ball.vy < 0 ? 'player' : 'ai';
      this.ball.lastHitByPlayer = this.lastStriker === 'player';
    }
    this.ball.update();

    if (this.judgeBoundary(previousX, previousY, currentRallyId)) return;

    const currentTime = performance.now();

    for (let i = this.bounceMarks.length - 1; i >= 0; i--) {
      const mark = this.bounceMarks[i];
      if (!mark) continue;
      mark.alpha -= 0.002;
      if (mark.alpha <= 0) this.bounceMarks.splice(i, 1);
    }

    const netY = COURT.y + COURT.height / 2;
    const playerFace = this.player.y;
    const aiFace = this.ai.y + this.ai.height;
    const radius = this.ball.radius;
    const canHit = currentTime - this.lastHitTime > this.hitCooldownMs;

    if (canHit) {
      if (
        this.ball.vy > 0 &&
        playerFace >= netY &&
        previousY + radius <= playerFace &&
        this.ball.y + radius >= playerFace
      ) {
        const hitX = this.crossingX(previousX, previousY, playerFace - radius);
        if (hitX + radius >= this.player.x && hitX - radius <= this.player.x + this.player.width) {
          const paddleCenter = this.player.x + this.player.width / 2;
          const offset = this.clamp((hitX - paddleCenter) / (this.player.width / 2), -1, 1);
          const powerMultiplier = 1.0 + this.powerCharge * 1.5;

          this.ball.x = hitX;
          this.ball.y = playerFace - radius - 2;

          const aimX = COURT.x + COURT.width * (0.5 + offset * 0.42);
          const contactY = COURT.y + 8 + this.ai.height + radius;
          const vyUp = -Math.max(3.0, Math.min(3.6 * powerMultiplier, 4.6));
          const travelFrames = Math.max(1, (this.ball.y - contactY) / Math.abs(vyUp));

          this.ball.vx = this.clamp((aimX - hitX) / travelFrames, -2.6, 2.6);
          this.ball.vy = vyUp;
          this.ball.lastHitByPlayer = true;
          this.lastStriker = 'player';

          this.lastHitTime = currentTime;
          this.powerCharge = 0;
          soundManager.playHit();
        }
      } else if (
        this.ball.vy < 0 &&
        aiFace <= netY &&
        previousY - radius >= aiFace &&
        this.ball.y - radius <= aiFace
      ) {
        const hitX = this.crossingX(previousX, previousY, aiFace + radius);
        if (hitX + radius >= this.ai.x && hitX - radius <= this.ai.x + this.ai.width) {
          this.ball.x = hitX;
          this.ball.y = aiFace + radius + 2;

          if (this.gameMode === 'pvp') {
            const paddleCenter = this.ai.x + this.ai.width / 2;
            const offset = this.clamp((hitX - paddleCenter) / (this.ai.width / 2), -1, 1);
            const p2PowerMultiplier = 1.0 + this.p2PowerCharge * 1.5;

            const aimX = COURT.x + COURT.width * (0.5 - offset * 0.42);
            const targetY = this.player.y - radius;
            const vyDown = Math.max(3.0, Math.min(3.6 * p2PowerMultiplier, 4.6));
            const travelFrames = Math.max(1, (targetY - (aiFace + radius)) / vyDown);

            this.ball.vx = this.clamp((aimX - hitX) / travelFrames, -2.6, 2.6);
            this.ball.vy = vyDown;
            this.p2PowerCharge = 0;
          } else {
            if (this.difficulty === 'easy') {
              this.ball.vx = (Math.random() - 0.5) * 3.5;
              this.ball.vy = Math.max(3.8, Math.abs(this.ball.vy) * 1.0);
            } else {
              const playerCenter = this.player.x + this.player.width / 2;
              const aimX =
                COURT.x + COURT.width * (playerCenter < COURT.x + COURT.width / 2 ? 0.78 : 0.22);
              const targetY = this.player.y - radius;
              const travelFrames = Math.max(1, (targetY - (aiFace + radius)) / 4.5);
              this.ball.vx = this.clamp((aimX - hitX) / travelFrames, -3.5, 3.5);
              this.ball.vy = Math.max(2.5, Math.abs(this.ball.vy) * 1.02);
            }
          }

          this.ball.lastHitByPlayer = false;
          this.lastStriker = 'ai';
          this.lastHitTime = currentTime;
          soundManager.playHit();
        }
      }
    }

    this.limitBallSpeed();
  }

  private registerLandingMark(
    landingX?: number,
    landingY?: number,
    type: 'player-point' | 'ai-point' | 'neutral' = 'neutral',
  ): void {
    if (landingX === undefined || landingY === undefined) return;

    const netY = COURT.y + COURT.height / 2;
    // Bloqueia marcas geradas exatamente na zona central da rede (margem de 40px)
    if (Math.abs(landingY - netY) < 40) {
      return;
    }

    this.bounceMarks.push({ x: landingX, y: landingY, alpha: 1.0, type });
    if (this.bounceMarks.length > 8) {
      this.bounceMarks.shift();
    }
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private updateAI(): void {
    const now = performance.now();
    const netY = COURT.y + COURT.height / 2;
    const minY = COURT.y + 8;
    const maxY = Math.max(minY, netY - this.ai.height - 24);
    const baselineY = this.clamp(COURT.y + 40, minY, maxY);
    const receiving = this.ball.vy < 0;
    const reactionTime = this.difficulty === 'hard' ? 150 : 500;
    const errorMargin = this.difficulty === 'hard' ? 25 : 120;
    const moveSpeed = this.difficulty === 'hard' ? 1.0 : 0.65;

    if (receiving && !this.aiWasReceiving) {
      this.aiApproachNet = false;
      this.aiNextDecisionAt = 0;
    }
    this.aiWasReceiving = receiving;

    if (now >= this.aiNextDecisionAt) {
      this.aiNextDecisionAt = now + reactionTime;
      this.aiTargetY = baselineY;

      const courtCenter = COURT.x + COURT.width / 2;
      let targetCenterX = courtCenter;

      if (receiving) {
        const contactY = this.aiTargetY + this.ai.height + this.ball.radius;
        const framesToContact = (contactY - this.ball.y) / this.ball.vy;
        if (framesToContact >= 0) {
          const humanError = (Math.random() - 0.5) * errorMargin;
          targetCenterX = this.ball.x + this.ball.vx * Math.min(framesToContact, 120) + humanError;
        } else {
          targetCenterX = this.ai.x + this.ai.width / 2;
        }
      } else {
        targetCenterX = courtCenter;
      }

      this.aiTargetX = this.clamp(
        targetCenterX - this.ai.width / 2,
        COURT.x,
        COURT.x + COURT.width - this.ai.width,
      );
    }

    const dx = this.aiTargetX - this.ai.x;
    const dy = this.aiTargetY - this.ai.y;
    const deadZone = 3;
    let moveX = Math.abs(dx) > deadZone ? Math.sign(dx) : 0;
    let moveY = Math.abs(dy) > deadZone ? Math.sign(dy) : 0;
    const magnitude = Math.hypot(moveX, moveY);
    if (magnitude > 1) {
      moveX /= magnitude;
      moveY /= magnitude;
    }

    this.ai.move(moveX * moveSpeed, moveY * moveSpeed, true);
    this.ai.x = this.clamp(this.ai.x, COURT.x, COURT.x + COURT.width - this.ai.width);
    this.ai.y = this.clamp(this.ai.y, minY, maxY);
  }

  private crossingX(previousX: number, previousY: number, contactY: number): number {
    const distanceY = this.ball.y - previousY;
    if (Math.abs(distanceY) < 0.000001) return this.ball.x;
    const fraction = this.clamp((contactY - previousY) / distanceY, 0, 1);
    return previousX + (this.ball.x - previousX) * fraction;
  }

  private limitBallSpeed(): void {
    const speed = Math.hypot(this.ball.vx, this.ball.vy);
    const currentMaxSpeed = this.difficulty === 'easy' ? 4.5 : MAX_BALL_SPEED;
    if (speed > currentMaxSpeed) {
      const factor = currentMaxSpeed / speed;
      this.ball.vx *= factor;
      this.ball.vy *= factor;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    Court.render(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

    const netY = COURT.y + COURT.height / 2;

    // Renderiza as marcas de queda em ambas as metades, excluindo rigorosamente a faixa da rede (±40px)
    this.bounceMarks.forEach((mark) => {
      if (Math.abs(mark.y - netY) < 40) return;

      const color = mark.type === 'player-point' ? 'rgba(34, 197, 94' : 'rgba(239, 68, 68';

      ctx.beginPath();
      ctx.fillStyle = `${color}, ${mark.alpha * 0.9})`;
      ctx.arc(mark.x, mark.y, 10 * mark.alpha, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 255, 255, ${mark.alpha})`;
      ctx.lineWidth = 2.5;
      ctx.arc(mark.x, mark.y, 13 * mark.alpha, 0, Math.PI * 2);
      ctx.stroke();
    });

    let aiRow = 0;
    let playerRow = 0;

    if (this.isGameStarted) {
      const isBallAtServe = Math.abs(this.ball.vx) < 0.1 && Math.abs(this.ball.vy) < 0.1;
      const aiIsServing = isBallAtServe && this.ball.y < CANVAS_HEIGHT / 2;
      const playerIsServing = isBallAtServe && this.ball.y >= CANVAS_HEIGHT / 2;

      if (aiIsServing) {
        aiRow = 1;
        playerRow = 0;
      } else if (playerIsServing) {
        aiRow = 0;
        playerRow = 1;
      } else {
        aiRow = Math.floor(Math.abs(this.ai.x) % 2) + 2;
        playerRow = Math.floor(Math.abs(this.player.x) % 2) + 2;
      }
    } else {
      aiRow = 0;
      playerRow = 0;
    }

    if (this.atlas.isLoaded) {
      this.atlas.draw(ctx, 0, aiRow, this.ai.x, this.ai.y, this.ai.width, this.ai.height);
      this.atlas.draw(
        ctx,
        1,
        playerRow,
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height,
      );
    } else {
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(this.ai.x, this.ai.y, this.ai.width, this.ai.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.ai.x, this.ai.y + this.ai.height - 3, this.ai.width, 6);

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.player.x, this.player.y - 3, this.player.width, 6);
    }

    if (this.isGameStarted) {
      // Desenha o rasto da bola em ambas as metades, excluindo a zona da rede (±40px)
      if ((this.ball as any).history && Array.isArray((this.ball as any).history)) {
        (this.ball as any).history.forEach((pos: { x: number; y: number }, index: number) => {
          if (Math.abs(pos.y - netY) >= 40) {
            const alpha = (index + 1) / ((this.ball as any).history.length * 1.5);
            ctx.fillStyle = `rgba(250, 204, 21, ${alpha})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, this.ball.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y + 10, this.ball.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.isCharging && this.powerCharge > 0) {
      const barWidth = 40;
      const barHeight = 6;
      const barX = this.player.x + this.player.width / 2 - barWidth / 2;
      const barY = this.player.y - 12;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(barX, barY, barWidth * this.powerCharge, barHeight);

      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    if (this.gameMode === 'pvp' && this.p2IsCharging && this.p2PowerCharge > 0) {
      const barWidth = 40;
      const barHeight = 6;
      const barX = this.ai.x + this.ai.width / 2 - barWidth / 2;
      const barY = this.ai.y + this.ai.height + 6;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(barX, barY, barWidth * this.p2PowerCharge, barHeight);

      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    const boardHeight = 28;
    const boardY = COURT.y - boardHeight - 8;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(COURT.x, boardY, COURT.width, boardHeight);

    ctx.font = 'bold 12px sans-serif';

    ctx.textAlign = 'left';
    ctx.fillStyle = '#f87171';
    ctx.fillText(
      `${this.gameMode === 'pvp' ? 'Jogador 2' : 'Oponente'}: ${this.getScoreDisplay(this.ai.score, true)} (Games: ${this.ai.sets})`,
      COURT.x + 15,
      boardY + 18,
    );

    ctx.textAlign = 'right';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(
      `Jogador 1: ${this.getScoreDisplay(this.player.score, false)} (Games: ${this.player.sets})`,
      COURT.x + COURT.width - 15,
      boardY + 18,
    );
  }
}
