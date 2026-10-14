import { config } from '../config';
import type { InputAxes } from '../core/input';
import type { CameraState } from '../entities/camera';
import type { Player } from '../entities/player';

/** F3 overlay: live bars for the input axes (plus the lean spring and camera) for tuning by eye. */
export function drawDebugOverlay(
  ctx: CanvasRenderingContext2D,
  axes: InputAxes,
  player: Player,
  cam: CameraState,
): void {
  const d = config.input.debug;
  const rows: { label: string; value: number; min: number; color: string }[] = [
    { label: 'steer', value: axes.steer, min: -1, color: d.steer },
    { label: 'throttle', value: axes.throttle, min: 0, color: d.throttle },
    { label: 'brake', value: axes.brake, min: 0, color: d.brake },
    { label: 'lean', value: player.lean, min: -config.input.leanMax, color: d.lean },
  ];

  const labelW = 54;
  const panelW = labelW + d.width + 44;
  const panelH = rows.length * d.gap + 22;
  ctx.fillStyle = d.back;
  ctx.fillRect(d.x - 4, d.y - 4, panelW, panelH);

  ctx.font = d.font;
  ctx.textBaseline = 'middle';
  rows.forEach((row, i) => {
    const y = d.y + i * d.gap + d.barHeight / 2;
    const x = d.x + labelW;
    const span = row.min < 0 ? -row.min * 2 : 1;
    const zeroX = row.min < 0 ? x + d.width / 2 : x;

    ctx.fillStyle = d.text;
    ctx.textAlign = 'left';
    ctx.fillText(row.label, d.x, y);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x, y - d.barHeight / 2, d.width, d.barHeight);

    const fill = (row.value / span) * d.width;
    ctx.fillStyle = row.color;
    ctx.fillRect(Math.min(zeroX, zeroX + fill), y - d.barHeight / 2, Math.abs(fill), d.barHeight);
    if (row.min < 0) {
      ctx.fillStyle = d.border;
      ctx.fillRect(zeroX - 0.5, y - d.barHeight / 2 - 1, 1, d.barHeight + 2);
    }

    ctx.fillStyle = d.text;
    ctx.textAlign = 'left';
    ctx.fillText(row.value.toFixed(2), x + d.width + 6, y);
  });

  const roll = ((cam.roll * 180) / Math.PI).toFixed(2);
  ctx.fillStyle = d.text;
  ctx.textAlign = 'left';
  ctx.fillText(`roll ${roll}°  fov ${cam.fov.toFixed(1)}  camx ${(cam.x - player.x).toFixed(3)}`, d.x, d.y + rows.length * d.gap + 6);
}
