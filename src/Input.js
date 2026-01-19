export class Input {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, isDown: false };
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        window.addEventListener('mousemove', (e) => {
            // We'll need to offset this by canvas position if canvas isn't full screen top-left
            // For now, assuming relatively standard positioning
            // Ideally, pass the canvas element to constructor to getBoundingClientRect
            // But main.js handles the canvas, let's just use client coordinates for now 
            // and correct them in Game.js if needed or pass the canvas here.
        });
        
        // Let's actually bind to the canvas for mouse events to be precise
    }
    
    bindCanvas(canvas) {
        this.canvas = canvas;
        canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        canvas.addEventListener('mousedown', () => {
            this.mouse.isDown = true;
        });
        
        canvas.addEventListener('mouseup', () => {
            this.mouse.isDown = false;
        });
    }

    isDown(code) {
        return !!this.keys[code];
    }
}
