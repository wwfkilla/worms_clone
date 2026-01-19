export class Terrain {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.canvas = document.createElement('canvas'); // Off-screen canvas for terrain
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d');
    }

    generate() {
        // Clear
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 1. Draw Dirt (Bottom Layer)
        this.ctx.fillStyle = "#8B4513"; // Dirt Brown
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height);
        
        // Generate points
        const points = [];
        const segments = 100;
        const segmentWidth = this.width / segments;
        
        // Simple noise function
        let y = this.height * 0.6;
        for (let i = 0; i <= segments; i++) {
            // Combine sine waves for hills
            const x = i * segmentWidth;
            const noise = Math.sin(x * 0.01) * 80 + Math.sin(x * 0.03) * 40 + Math.sin(x * 0.1) * 10;
            const height = (this.height * 0.6) + noise;
            points.push({x, y: height});
            this.ctx.lineTo(x, height);
        }
        
        this.ctx.lineTo(this.width, this.height);
        this.ctx.fill();
        
        // 2. Draw Grass (Top Layer) - Green outline
        // We do this by stroking the top line with thick green
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = "#228B22"; // Forest Green
        this.ctx.lineWidth = 20;
        this.ctx.beginPath();
        
        if (points.length > 0) {
            this.ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                this.ctx.lineTo(points[i].x, points[i].y);
            }
            this.ctx.stroke();
        }
        
        // Remove grass that bleeds into the sky (optional, but stroke is centered)
        // Actually, the stroke is centered, so half is in sky, half in dirt.
        // It looks fine for Worms style.
    }

    explode(x, y, radius) {
        const ctx = this.ctx;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    render(ctx) {
        ctx.drawImage(this.canvas, 0, 0);
    }

    isPixelSolid(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        // Note: getImageData is slow if called too often.
        // Optimization: Keep a Uint8Array buffer if performance becomes an issue.
        const pixel = this.ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
        return pixel[3] > 0; // Alpha > 0 means solid
    }
}
