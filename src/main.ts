import { Game } from './core/game';
import { fitCanvas } from './core/display';

const canvas = document.getElementById('game') as HTMLCanvasElement;
fitCanvas(canvas);
new Game(canvas).start();
