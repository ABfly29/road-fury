import { config } from '../config';
import type { Player } from '../entities/player';
import type { RoadSprite } from './roadRenderer';

/** Drawn in a local space where the handlebars span 100 units; the origin is the rear tyre's ground contact. */
const BAR_SPAN = 100;

/** Rear-view bike and rider from canvas shapes. Reads the player only. */
export class BikeRenderer implements RoadSprite {
  constructor(private readonly player: Player) {}

  get position(): number {
    return this.player.z;
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
    const { player } = this;
    const b = config.bike;
    const col = b.colors;
    const unit = (scale * b.width) / BAR_SPAN; // pixels per local unit

    const speedPercent = player.speed / config.physics.maxSpeed;
    const bounce = Math.abs(Math.sin((player.z / b.bounceWavelength) * Math.PI)) * b.bounceAmplitude * speedPercent;

    ctx.save();
    ctx.translate(x, y - b.bottomMargin);
    ctx.scale(unit, unit);

    // Shadow stays flat on the road while the bike leans.
    ctx.fillStyle = col.shadow;
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, -bounce / unit);
    ctx.rotate(player.lean * b.maxLeanAngle);

    // Rear tyre with a few tread marks.
    ctx.fillStyle = col.tyre;
    ctx.beginPath();
    ctx.roundRect(-7, -44, 14, 44, 5);
    ctx.fill();
    ctx.fillStyle = col.tread;
    for (let ty = -40; ty < -4; ty += 7) ctx.fillRect(-7, ty, 14, 2);

    // Exhaust on the right.
    ctx.fillStyle = col.exhaust;
    ctx.beginPath();
    ctx.roundRect(11, -40, 8, 24, 3);
    ctx.fill();

    // Tail fairing and tail light.
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

    // Legs and boots.
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

    // Jacket with a reflective stripe.
    ctx.fillStyle = col.jacket;
    ctx.beginPath();
    ctx.roundRect(-23, -112, 46, 52, 12);
    ctx.fill();
    ctx.fillStyle = col.jacketStripe;
    ctx.fillRect(-23, -86, 46, 4);

    // Arms down to the grips, handlebars and mirrors.
    ctx.lineCap = 'round';
    ctx.strokeStyle = col.sleeve;
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(-20, -102);
    ctx.lineTo(-44, -84);
    ctx.moveTo(20, -102);
    ctx.lineTo(44, -84);
    ctx.stroke();
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

    // Helmet with a centre stripe.
    ctx.fillStyle = col.helmet;
    ctx.beginPath();
    ctx.arc(0, -124, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col.helmetStripe;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, -139);
    ctx.lineTo(0, -109);
    ctx.stroke();

    ctx.restore();
  }
}
