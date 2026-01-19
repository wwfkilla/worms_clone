export class Worm {
    constructor(x, y, teamColor = '#ff0000', isAI = false) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 10;
        this.width = 10; // For AABB if needed
        this.height = 20;
        this.teamColor = teamColor;
        this.isAI = isAI;
        this.isOnGround = false;
        this.facing = 1; // 1 = right, -1 = left
        this.speed = 60; // Walk speed
        this.jumpForce = -300; 
        this.health = 100;
        this.isDead = false;
    }

    takeDamage(amount) {
        this.health -= amount;
        console.log(`Worm took ${amount} damage! HP: ${this.health}`);
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            // Handle death (animation, removal from list, etc.) later
        }
    }
    
    applyForce(fx, fy) {
        this.vx += fx;
        this.vy += fy;
        this.isOnGround = false; // Lift off ground so physics can move us
    }

    handleInput(input, audio) {
        // Reset horizontal velocity component from input (friction will handle the rest)
        // Actually, for worms control, we want direct velocity control when walking
        // But let's keep it momentum based slightly
        
        if (input.isDown('ArrowLeft') || input.isDown('KeyA')) {
            this.vx = -this.speed;
            this.facing = -1;
        } else if (input.isDown('ArrowRight') || input.isDown('KeyD')) {
            this.vx = this.speed;
            this.facing = 1;
        } else {
            // Stop instantly if no key pressed (classic worms walking is snappy)
            // But we have friction in update, so let's just not add force? 
            // No, worms stop pretty much instantly when you release the key.
            if (this.isOnGround) {
                this.vx = 0;
            }
        }

        // Jump
        // Space for Jump
        if (input.isDown('Space') && this.isOnGround) {
            this.vy = this.jumpForce;
            this.isOnGround = false; 
            if (audio) audio.playJump();
        }
    }

    update(deltaTime) {
        // Apply gravity
        this.vy += 980 * deltaTime; // Gravity constant (pixels/s^2) - increased for snappier feel

        // Apply velocity
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Friction (air resistance / ground friction)
        // We handle ground stopping in handleInput for snappiness, 
        // but air resistance is good.
        if (!this.isOnGround) {
            this.vx *= 0.98; // Air drag
        } 

        // Reset ground state (will be re-checked by physics engine)
        this.isOnGround = false;
    }

    render(ctx) {
        if (this.isDead) return; // Don't render if dead (or render grave later)

        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Placeholder worm visual (capsule shape)
        ctx.fillStyle = this.teamColor;
        ctx.beginPath();
        ctx.arc(0, -5, 5, 0, Math.PI * 2); // Head
        ctx.fill();
        
        ctx.fillRect(-5, -5, 10, 10); // Body

        ctx.beginPath();
        ctx.arc(0, 5, 5, 0, Math.PI * 2); // Bottom
        ctx.fill();

        // Eye to show facing direction
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(3 * this.facing, -5, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(3 * this.facing + 1 * this.facing, -5, 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Health Bar
        ctx.fillStyle = 'red';
        ctx.fillRect(-10, -20, 20, 4);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(-10, -20, 20 * (this.health / 100), 4);
        
        // Name/HP text (optional)
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(Math.ceil(this.health), 0, -25);

        ctx.restore();
    }
}
