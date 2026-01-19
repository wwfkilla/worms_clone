import { Projectile } from './Projectile.js';

export class Weapons {
    constructor(game) {
        this.game = game;
        this.projectiles = [];
        this.currentWeapon = 'bazooka'; // bazooka, grenade
        this.aimAngle = -Math.PI / 4; 
        this.power = 0;
        this.isCharging = false;
        this.maxPower = 800;
        
        // Weapon Stats
        this.weaponStats = {
            'bazooka': { name: 'Bazooka', wind: true, damage: 25, radius: 40 },
            'grenade': { name: 'Grenade', wind: false, damage: 35, radius: 50, timer: 3 }
        };
    }

    handleInput(input, activeWorm) {
        // Weapon Switch
        if (input.isDown('Digit1')) this.currentWeapon = 'bazooka';
        if (input.isDown('Digit2')) this.currentWeapon = 'grenade';

        // Aiming with Mouse
        const dx = input.mouse.x - activeWorm.x;
        const dy = input.mouse.y - activeWorm.y;
        this.aimAngle = Math.atan2(dy, dx);

        // Update worm facing based on aim
        activeWorm.facing = dx >= 0 ? 1 : -1;

        // Firing
        if (input.mouse.isDown && !this.isCharging) {
             this.isCharging = true;
             this.power = 0;
        }
        
        if (this.isCharging) {
            if (input.mouse.isDown) {
                this.power += 500 * this.game.stepSize;
                if (this.power > this.maxPower) this.power = this.maxPower;
            } else {
                // Release to fire
                this.fire(activeWorm);
                this.isCharging = false;
                this.power = 0;
            }
        }
    }

    fire(worm) {
        const stats = this.weaponStats[this.currentWeapon];
        const vx = Math.cos(this.aimAngle) * this.power;
        const vy = Math.sin(this.aimAngle) * this.power;

        const p = new Projectile(
            worm.x + (Math.cos(this.aimAngle) * 20), 
            worm.y + (Math.sin(this.aimAngle) * 20), 
            vx, 
            vy, 
            { 
                type: this.currentWeapon,
                windAffected: stats.wind,
                damage: stats.damage,
                explosionRadius: stats.radius,
                timer: stats.timer,
                color: this.currentWeapon === 'grenade' ? '#006400' : '#333'
            }
        );
        this.projectiles.push(p);
        this.game.audio.playFire();
    }

    update(deltaTime) {
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(deltaTime, this.game.wind || 0);
            
            let exploded = false;
            
            // Check timer
            if (p.shouldExplode) {
                this.explode(p.x, p.y, p.explosionRadius, p.damage);
                exploded = true;
            }

            // 1. Check Collision with Worms (Direct Hit)
            if (!exploded) {
                for (const worm of this.game.worms) {
                    if (worm.isDead) continue;
                    p.age = (p.age || 0) + deltaTime;
                    
                    if (p.age > 0.1) { 
                        const dx = worm.x - p.x;
                        const dy = worm.y - p.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist < p.radius + worm.radius) {
                            if (p.type === 'bazooka') {
                                this.explode(p.x, p.y, p.explosionRadius, p.damage);
                                exploded = true;
                                break; 
                            } else {
                                // Grenade hits worm: Bounce
                                const nx = dx / dist;
                                const ny = dy / dist;
                                
                                // Reflect vector
                                const dot = p.vx * nx + p.vy * ny;
                                p.vx = (p.vx - 2 * dot * nx) * 0.5; // Dampen
                                p.vy = (p.vy - 2 * dot * ny) * 0.5;
                                
                                // Push out
                                p.x -= nx * 2;
                                p.y -= ny * 2;
                                
                                if (Math.abs(p.vx) > 10 || Math.abs(p.vy) > 10) this.game.audio.playBounce();
                            }
                        }
                    }
                }
            }
            
            if (exploded) {
                p.active = false;
                this.projectiles.splice(i, 1);
                continue;
            }

            // 2. Terrain Collision
            // Check bounding box or point
            if (this.game.terrain.isPixelSolid(p.x, p.y) || 
                p.x < 0 || p.x > this.game.width || p.y > this.game.height) { 
                
                if (p.type === 'bazooka') {
                    this.explode(p.x, p.y, p.explosionRadius, p.damage);
                    p.active = false;
                    this.projectiles.splice(i, 1);
                } else if (p.type === 'grenade') {
                     // Bounce logic
                     const prevX = p.x - p.vx * deltaTime;
                     const prevY = p.y - p.vy * deltaTime;
                     
                     let hitX = false;
                     let hitY = false;
                     
                     // Check Horizontal Wall
                     if (this.game.terrain.isPixelSolid(p.x, prevY)) hitX = true;
                     // Check Vertical Floor/Ceiling
                     if (this.game.terrain.isPixelSolid(prevX, p.y)) hitY = true;
                     
                     // Fallback if corner hit
                     if (!hitX && !hitY) { hitX = true; hitY = true; }
                     
                     if (hitX) p.vx = -p.vx * p.restitution;
                     if (hitY) p.vy = -p.vy * p.restitution;
                     
                     // Friction
                     p.vx *= 0.95;
                     
                     // Push out of terrain
                     p.x = prevX;
                     p.y = prevY;
                     
                     if (Math.abs(p.vx) > 10 || Math.abs(p.vy) > 10) this.game.audio.playBounce();

                     // Stop if too slow
                     if (Math.abs(p.vx) < 10 && Math.abs(p.vy) < 10 && hitY) {
                         p.vx = 0;
                         p.vy = 0;
                     }
                }
            }
        }
    }

    explode(x, y, radius, maxDamage) {
        this.game.audio.playExplosion();
        // 1. Destroy Terrain
        this.game.terrain.explode(x, y, radius);

        // 2. Damage & Knockback Worms
        this.game.worms.forEach(worm => {
            if (worm.isDead) return;

            const dx = worm.x - x;
            const dy = worm.y - y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < radius + 15) { // Radius + wiggle room/worm radius
                // Calculate damage factor (1.0 at center, 0.0 at edge)
                const damageRadius = radius * 1.5; 
                if (dist < damageRadius) {
                     const damageFactor = 1 - (dist / damageRadius);
                     const damage = Math.floor(maxDamage * damageFactor);
                     if (damage > 0) worm.takeDamage(damage);

                     // Knockback
                     const nx = dx / dist;
                     const ny = dy / dist;
                     
                     const impulseForce = 500 * damageFactor; 
                     worm.applyForce(nx * impulseForce, ny * impulseForce);
                }
            }
        });
    }

    render(ctx, activeWorm) {
        // Render projectiles
        this.projectiles.forEach(p => p.render(ctx));

        // Render crosshair / aim line
        if (activeWorm) {
            ctx.save();
            ctx.translate(activeWorm.x, activeWorm.y); // Center of worm roughly
            
            const aimLen = 30;
            const ax = Math.cos(this.aimAngle) * aimLen;
            const ay = Math.sin(this.aimAngle) * aimLen;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(ax, ay);
            ctx.stroke();
            
            // Draw current weapon icon/text
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.fillText(this.weaponStats[this.currentWeapon].name, 0, -40);

            // Draw Power Bar if charging
            if (this.isCharging) {
                // Draw above worm
                ctx.fillStyle = 'red';
                const powerPct = this.power / this.maxPower;
                ctx.fillRect(-15, -30, 30 * powerPct, 5);
                ctx.strokeStyle = 'black';
                ctx.strokeRect(-15, -30, 30, 5);
            }

            ctx.restore();
        }
    }
}