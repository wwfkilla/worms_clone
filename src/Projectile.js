export class Projectile {
    constructor(x, y, vx, vy, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = options.radius || 3;
        this.color = options.color || '#333';
        this.damage = options.damage || 25;
        this.explosionRadius = options.explosionRadius || 40;
        this.active = true;
        this.windAffected = options.windAffected !== undefined ? options.windAffected : true;
        this.type = options.type || 'bazooka'; // 'bazooka', 'grenade'
        this.timer = options.timer || 0; // For grenades (e.g. 3s)
        this.restitution = options.restitution || 0.6; // Bounciness
        this.friction = 0.98; // Rolling friction
        this.age = 0;
    }

    update(deltaTime, windX) {
        if (!this.active) return;
        
        this.age += deltaTime;

        // Timer for grenades
        if (this.type === 'grenade') {
            this.timer -= deltaTime;
            if (this.timer <= 0) {
                this.shouldExplode = true; // Signal to explode
            }
        }

        // Gravity
        this.vy += 500 * deltaTime;
        
        // Wind (only if in air)
        // Simple check: if vy is small and we are 'rolling', maybe less wind?
        // For now apply wind always
        if (this.windAffected) {
            this.vx += windX * deltaTime;
        }

        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
    }

    render(ctx) {
        if (!this.active) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
