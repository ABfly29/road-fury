export type Action = 'accelerate' | 'brake' | 'left' | 'right' | 'attack';

const keyMap: Record<string, Action> = {
  ArrowUp: 'accelerate', KeyW: 'accelerate',
  ArrowDown: 'brake', KeyS: 'brake',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Space: 'attack', KeyX: 'attack',
};

export class Input {
  private down = new Set<Action>();

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => {
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

  isDown(a: Action): boolean {
    return this.down.has(a);
  }
}
