import { Game } from './core/game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
new Game(canvas).start();
