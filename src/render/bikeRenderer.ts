import { config } from '../config';
import type { RoadSprite } from './spriteRenderer';

/** Drawn in a local space where the handlebars span 100 units; the origin is the rear tyre's ground contact. */
const BAR_SPAN = 100;
/** Centres the tumble pivots on: the bike's middle and the rider's torso. */
const BIKE_PIVOT_Y = -50;
const RIDER_PIVOT_Y = -85;
/** Height of the rider's torso centre once lying on the road. */
const RIDER_LYING_Y = -22;

const easeOut = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 2;

export type BikeColors = { -readonly [K in keyof typeof config.bike.colors]: string };

/** What a bike drawing needs from whoever is riding it (the player or an AI rival). */
export interface BikeVisual {
  z: number;
  speed: number;
  lean: number;
  /** Rivals never crash or flash, so these are optional. */
  crashTimer?: number;
  crashSpeed?: number;
  crashDir?: number;
  invincibleTimer?: number;
  /** Lateral position in road half-widths (only used when the bike is placed on the road). */
  x?: number;
}

export interface BikeOptions {
  /** Colour overrides layered over config.bike.colors. */
  colors?: Partial<BikeColors>;
  /** Place the bike at its own x on the road. The player's bike stays centred instead. */
  onRoad?: boolean;
  /** Pixels to lift the bike above its ground point (the player's sits above the screen edge). */
  lift?: number;
}

/** Pixels per local unit when the bike is at the player's distance: what bounce amplitude is relative to. */
const REFERENCE_UNIT = ((config.render.width / 2) / config.camera.height) * (config.bike.width / BAR_SPAN);

/** Rear-view bike and rider from canvas shapes. Reads its rider's state only. */
export class BikeRenderer implements RoadSprite {
  private readonly colors: BikeColors;
  private readonly onRoad: boolean;
  private readonly lift: number;

  constructor(
    private readonly player: BikeVisual,
    options: BikeOptions = {},
  ) {
    this.colors = { ...config.bike.colors, ...options.colors };
    this.onRoad = options.onRoad ?? false;
    this.lift = options.lift ?? config.bike.bottomMargin;
  }

  get position(): number {
    return this.player.z;
  }

  get x(): number | undefined {
    return this.onRoad ? this.player.x : undefined;
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
    const { player } = this;
    const b = config.bike;
    const unit = (scale * b.width) / BAR_SPAN; // pixels per local unit

    ctx.save();
    ctx.translate(x, y - this.lift);
    ctx.scale(unit, unit);

    if ((player.crashTimer ?? 0) > 0) {
      this.drawCrash(ctx);
    } else {
      // Flash while invincible after a respawn.
      const invincible = player.invincibleTimer ?? 0;
      const flashing = invincible > 0 && Math.floor(invincible * config.crash.invincibleFlashHz) % 2 === 0;
      if (flashing) ctx.globalAlpha = 0.3;
      this.drawRiding(ctx, unit);
    }

    ctx.restore();
  }

  private drawShadow(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.colors.shadow;
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawRiding(ctx: CanvasRenderingContext2D, unit: number): void {
    const { player } = this;
    const b = config.bike;
    const speedPercent = player.speed / config.physics.maxSpeed;
    // Bounce height is in pixels at the player's distance, so scale it for smaller (farther) bikes.
    const bounce = Math.abs(Math.sin((player.z / b.bounceWavelength) * Math.PI)) * b.bounceAmplitude * speedPercent * (unit / REFERENCE_UNIT);

    // Shadow stays flat on the road while the bike leans.
    this.drawShadow(ctx);
    ctx.translate(0, -bounce / unit);
    ctx.rotate(player.lean * b.maxLeanAngle);

    this.drawTail(ctx);
    this.drawRiderBody(ctx);
    this.drawBars(ctx);
    this.drawHelmet(ctx);
  }

  /** Wipeout: the bike tumbles to rest on its side while the rider is thrown clear. */
  private drawCrash(ctx: CanvasRenderingContext2D): void {
    const { player } = this;
    const c = config.crash;
    const e = c.duration - (player.crashTimer ?? 0); // seconds since impact
    const k = 0.5 + 0.5 * (player.crashSpeed ?? 1);
    const dir = player.crashDir ?? 1;

    this.drawShadow(ctx);
    this.drawDust(ctx, e);

    // Bike: hops, slides away and spins down onto its side.
    const spin = dir * (c.spinTurns * Math.PI * 2 + Math.PI / 2) * easeOut(e / c.spinTime);
    const hop = Math.max(0, Math.sin(Math.min(1, e / (c.spinTime * 0.5)) * Math.PI)) * c.hopHeight * k;
    const slide = easeOut(e / c.duration) * c.slideDistance * k;
    ctx.save();
    ctx.translate(dir * slide * 0.6, -slide * 0.4 - hop);
    ctx.translate(0, BIKE_PIVOT_Y);
    ctx.rotate(spin);
    ctx.translate(0, -BIKE_PIVOT_Y);
    this.drawTail(ctx);
    this.drawBars(ctx);
    ctx.restore();

    // Rider: ballistic arc, then a slide and settle on the road.
    const vx = dir * c.riderVx * k;
    const vy = -c.riderVy * k;
    const g = c.riderGravity;
    const startY = RIDER_PIVOT_Y;
    // Time the torso reaches the road: startY + vy*t + g*t^2/2 = RIDER_LYING_Y
    const A = g / 2;
    const B = vy;
    const C = startY - RIDER_LYING_Y;
    const landing = (-B + Math.sqrt(B * B - 4 * A * C)) / (2 * A);

    let rx: number;
    let ry: number;
    let angle: number;
    const airborneAngle = (t: number) => dir * c.riderSpin * t;
    if (e < landing) {
      rx = vx * e;
      ry = startY + vy * e + A * e * e;
      angle = airborneAngle(e);
    } else {
      const since = e - landing;
      rx = vx * landing + vx * 0.3 * (1 - Math.exp(-since * 3.5));
      ry = RIDER_LYING_Y;
      const landed = airborneAngle(landing);
      const turns = Math.ceil((Math.abs(landed) - Math.PI / 2) / (Math.PI * 2));
      const rest = dir * (Math.PI * 2 * Math.max(0, turns) + Math.PI / 2);
      angle = landed + (rest - landed) * (1 - Math.exp(-since * 5));
    }
    ctx.save();
    ctx.translate(rx, ry - RIDER_PIVOT_Y);
    ctx.translate(0, RIDER_PIVOT_Y);
    ctx.rotate(angle);
    ctx.translate(0, -RIDER_PIVOT_Y);
    this.drawRiderBody(ctx);
    this.drawHelmet(ctx);
    ctx.restore();
  }

  /** Dust puffs thrown up at the impact. */
  private drawDust(ctx: CanvasRenderingContext2D, e: number): void {
    const life = config.crash.dustTime;
    if (e >= life) return;
    const t = e / life;
    ctx.fillStyle = `rgba(216, 207, 192, ${0.55 * (1 - t)})`;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 30 * easeOut(t), -8 + Math.sin(a) * 8 * easeOut(t) - 18 * t, 12 + 26 * easeOut(t), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Rear tyre, exhaust, tail fairing and tail light. */
  private drawTail(ctx: CanvasRenderingContext2D): void {
    const col = this.colors;

    ctx.fillStyle = col.tyre;
    ctx.beginPath();
    ctx.roundRect(-7, -44, 14, 44, 5);
    ctx.fill();
    ctx.fillStyle = col.tread;
    for (let ty = -40; ty < -4; ty += 7) ctx.fillRect(-7, ty, 14, 2);

    ctx.fillStyle = col.exhaust;
    ctx.beginPath();
    ctx.roundRect(11, -40, 8, 24, 3);
    ctx.fill();

    ctx.fillStyle = col.body;
    ctx.beginPath();
    ctx.moveTo(-14, -44);
    ctx.lineTo(14, -44);
    ctx.lineTo(10, -68);
    ctx.lineTo(-10, -68);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = col.tailLight;
    ctx.fillRect(-6, -62, 12, 5);
  }

  /** Legs, boots, jacket and arms. */
  private drawRiderBody(ctx: CanvasRenderingContext2D): void {
    const col = this.colors;

    ctx.fillStyle = col.pants;
    ctx.beginPath();
    ctx.ellipse(-24, -58, 9, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(24, -58, 9, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col.boots;
    ctx.beginPath();
    ctx.ellipse(-24, -38, 6, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(24, -38, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = col.jacket;
    ctx.beginPath();
    ctx.roundRect(-23, -112, 46, 52, 12);
    ctx.fill();
    ctx.fillStyle = col.jacketStripe;
    ctx.fillRect(-23, -86, 46, 4);

    ctx.lineCap = 'round';
    ctx.strokeStyle = col.sleeve;
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(-20, -102);
    ctx.lineTo(-44, -84);
    ctx.moveTo(20, -102);
    ctx.lineTo(44, -84);
    ctx.stroke();
  }

  /** Handlebars, grips and mirrors. */
  private drawBars(ctx: CanvasRenderingContext2D): void {
    const col = this.colors;

    ctx.lineCap = 'round';
    ctx.strokeStyle = col.bars;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-BAR_SPAN / 2, -84);
    ctx.lineTo(BAR_SPAN / 2, -84);
    ctx.moveTo(-46, -86);
    ctx.lineTo(-54, -102);
    ctx.moveTo(46, -86);
    ctx.lineTo(54, -102);
    ctx.stroke();
    ctx.strokeStyle = col.grips;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-BAR_SPAN / 2, -84);
    ctx.lineTo(-42, -84);
    ctx.moveTo(BAR_SPAN / 2, -84);
    ctx.lineTo(42, -84);
    ctx.stroke();
  }

  private drawHelmet(ctx: CanvasRenderingContext2D): void {
    const col = this.colors;

    ctx.fillStyle = col.helmet;
    ctx.beginPath();
    ctx.arc(0, -124, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col.helmetStripe;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -139);
    ctx.lineTo(0, -109);
    ctx.stroke();
  }
}
