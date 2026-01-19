import { Game } from './src/Game.js';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    
    // Set canvas size (can be dynamic later, fixed for MVP)
    canvas.width = 1280;
    canvas.height = 720;

    const game = new Game(canvas);
    game.start();
    
    // Expose game instance for debugging
    window.game = game;
});
