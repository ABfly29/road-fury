import { config } from '../config';

export type Action = 'accelerate' | 'brake' | 'left' | 'right' | 'attack';

/** What the simulation reads: smoothed analog axes, never raw key state. */
export interface InputAxes {
  /** -1 (full left) .. +1 (full right). */
  steer: number;
  /** 0..1 */
  throttle: number;
  /** 0..1 */
  brake: number;
}

export const ZERO_AXES: Readonly<InputAxes> = { steer: 0, throttle: 0, brake: 0 };

/** Raw key state the axes are driven from. */
export interface Keys {
  left: boolean;
  right: boolean;
  accelerate: boolean;
  brake: boolean;
}

const move = (value: number, target: number, rate: number, dt: number) => {
  const step = rate * dt;
  return Math.abs(target - value) <= step ? target : value + Math.sign(target - value) * step;
};

/** Advance the axes one fixed step toward what the keys ask for. Pure, so it can be tested without a browser. */
export function stepAxes(axes: InputAxes, keys: Keys, dt: number): void {
  const c = config.input;

  const wanted = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (wanted === 0) {
    axes.steer = move(axes.steer, 0, c.steerFall, dt);
  } else if (axes.steer * wanted < 0) {
    // Reversing: cross zero quickly, then ramp up in the new direction with whatever time is left.
    const toZero = Math.abs(axes.steer) / c.steerCross;
    if (dt <= toZero) axes.steer = move(axes.steer, 0, c.steerCross, dt);
    else axes.steer = move(0, wanted, c.steerRise, dt - toZero);
  } else {
    axes.steer = move(axes.steer, wanted, c.steerRise, dt);
  }

  axes.throttle = move(axes.throttle, keys.accelerate ? 1 : 0, keys.accelerate ? c.throttleRise : c.throttleFall, dt);
  axes.brake = move(axes.brake, keys.brake ? 1 : 0, keys.brake ? c.brakeRise : c.brakeFall, dt);
}

const keyMap: Record<string, Action> = {
  ArrowUp: 'accelerate', KeyW: 'accelerate',
  ArrowDown: 'brake', KeyS: 'brake',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Space: 'attack', KeyX: 'attack',
};

export class Input implements InputAxes {
  steer = 0;
  throttle = 0;
  brake = 0;
  /** F3 toggles the axis debug overlay. */
  debugOverlay = false;

  private down = new Set<Action>();

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        if (!e.repeat) this.debugOverlay = !this.debugOverlay;
        return;
      }
      const a = keyMap[e.code];
      if (!a) return;
      e.preventDefault();
      this.down.add(a);
    });
    target.addEventListener('keyup', (e) => {
      const a = keyMap[e.code];
      if (a) this.down.delete(a);
    });
    target.addEventListener('blur', () => this.down.clear());
  }

  /** Call once per fixed update. */
  update(dt: number): void {
    stepAxes(this, {
      left: this.down.has('left'),
      right: this.down.has('right'),
      accelerate: this.down.has('accelerate'),
      brake: this.down.has('brake'),
    }, dt);
  }

  isDown(a: Action): boolean {
    return this.down.has(a);
  }
}
