import { Terrain } from './Terrain.js';
import { Worm } from './Worm.js';
import { Physics } from './Physics.js';
import { Input } from './Input.js';
import { Weapons } from './Weapons.js';
import { AudioSystem } from './Audio.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        this.lastTime = 0;
        this.accumulatedTime = 0;
        this.stepSize = 1 / 60; // Fixed time step for physics

        this.terrain = new Terrain(this.width, this.height);
        this.physics = new Physics();
        this.input = new Input();
        this.input.bindCanvas(this.canvas);
        this.audio = new AudioSystem();
        
        this.worms = [];
        this.weapons = new Weapons(this);
        this.wind = (Math.random() * 200) - 100; // Random wind -100 to 100
        
        this.currentWormIndex = 0;
        this.turnState = 'INPUT'; // INPUT, FIRING, SETTLING, RETREAT
        this.turnTimer = 45; // 45 seconds per turn
        this.retreatTimer = 3; // 3 seconds retreat
        this.settleTimer = 0; // Time to wait after physics settles
        
        // AI State
        this.aiStep = 0; // 0: Think, 1: Aim, 2: Charge, 3: Fire
        this.aiTimer = 0;

        // Bind the loop to preserve 'this' context
        this.loop = this.loop.bind(this);
        
        // Resume audio on interaction
        window.addEventListener('mousedown', () => this.audio.resume(), { once: true });
        window.addEventListener('keydown', () => this.audio.resume(), { once: true });
    }

    start() {
        console.log("Game started");
        this.terrain.generate(); // Generate initial terrain
        
        // Reset worms - Spawn 2 per team
        this.worms = [];
        // Player 1 (Red)
        this.worms.push(new Worm(200, 50, '#ff0000', false)); 
        this.worms.push(new Worm(400, 50, '#ff0000', false));
        // Player 2 (Blue) - AI
        this.worms.push(new Worm(this.width - 200, 50, '#0000ff', true)); 
        this.worms.push(new Worm(this.width - 400, 50, '#0000ff', true));

        // Reset UI
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) {
            gameOverScreen.classList.add('hidden');
            document.getElementById('restart-btn').onclick = () => {
                 location.reload(); 
            };
        }

        requestAnimationFrame(this.loop);
    }

    loop(timestamp) {
        let deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Cap deltaTime to prevent spiral of death if frame rate drops
        if (deltaTime > 0.25) deltaTime = 0.25;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame(this.loop);
    }

    nextTurn() {
        console.log("Next Turn");
        
        // Check win condition first
        const aliveTeams = new Set(this.worms.filter(w => !w.isDead).map(w => w.teamColor));
        if (aliveTeams.size <= 1) {
            console.log("Game Over");
            const winner = aliveTeams.size === 1 ? `Team ${aliveTeams.values().next().value} Wins!` : "Draw!";
            document.getElementById('winner-text').innerText = winner;
            document.getElementById('game-over-screen').classList.remove('hidden');
            this.turnState = 'GAMEOVER';
            return;
        }

        this.currentWormIndex = (this.currentWormIndex + 1) % this.worms.length;
        // Skip dead worms
        let checked = 0;
        while (this.worms[this.currentWormIndex].isDead && checked < this.worms.length) {
            this.currentWormIndex = (this.currentWormIndex + 1) % this.worms.length;
            checked++;
        }
        
        this.turnState = 'INPUT';
        this.turnTimer = 45;
        this.retreatTimer = 2; // Reduced to 2s
        this.wind = (Math.random() * 200) - 100; // Change wind
        
        // Reset AI state
        this.aiStep = 0;
        this.aiTimer = 0;
        this.aiMoveDuration = 0;
        
        // Reset weapons
        this.weapons.isCharging = false;
        this.weapons.power = 0;
    }

    update(deltaTime) {
        const activeWorm = this.worms[this.currentWormIndex];
        
        // Game Over Check is handled in nextTurn, but let's check for sudden death or input death
        
        // --- State Machine ---

        if (this.turnState === 'INPUT') {
            // Check if active worm died during input (e.g. fell in water)
            if (activeWorm.isDead) {
                this.nextTurn();
                return;
            }

            this.turnTimer -= deltaTime;
            if (this.turnTimer <= 0) {
                this.nextTurn();
                return;
            }

            if (activeWorm.isAI) {
                this.updateAI(activeWorm, deltaTime);
            } else {
                // Human Input
                activeWorm.handleInput(this.input, this.audio);
                this.weapons.handleInput(this.input, activeWorm);
            }
            
            // Check if fired
            if (this.weapons.projectiles.length > 0) {
                console.log("Shot fired -> State: FIRING");
                this.turnState = 'FIRING';
            }
            
        } else if (this.turnState === 'FIRING') {
            // Wait for projectiles to disappear (explode or go out of bounds)
            if (this.weapons.projectiles.length === 0) {
                console.log("Projectiles gone -> State: SETTLING");
                this.turnState = 'SETTLING';
                this.settleTimer = 0;
                this.silenceTimer = 0;
            }
            
        } else if (this.turnState === 'SETTLING') {
            this.settleTimer += deltaTime; // Count up
            
            // Wait for physics to stop (worms falling/sliding)
            let isMoving = false;
            this.worms.forEach(w => {
                if ((Math.abs(w.vx) > 5 || Math.abs(w.vy) > 5) && !w.isDead) isMoving = true;
            });

            if (isMoving) {
                this.silenceTimer = 0;
            } else {
                this.silenceTimer = (this.silenceTimer || 0) + deltaTime;
            }
            
            if (this.silenceTimer > 0.5 || this.settleTimer > 3.0) {
                console.log("Stable (or Timeout) -> State: RETREAT");
                this.turnState = 'RETREAT';
            }

        } else if (this.turnState === 'RETREAT') {
            this.retreatTimer -= deltaTime;
            
            // Allow movement only (no shooting)
            if (!activeWorm.isAI && !activeWorm.isDead) {
                 activeWorm.handleInput(this.input, this.audio);
            }

            if (this.retreatTimer <= 0) {
                this.nextTurn();
            }
        } else if (this.turnState === 'GAMEOVER') {
            return;
        }

        // --- Common Updates ---
        
        // Update worms
        this.worms.forEach(worm => worm.update(deltaTime));
        
        // Update physics (collision resolution)
        this.physics.update(this.worms, this.terrain, deltaTime);
        
        // Update weapons (projectiles)
        this.weapons.update(deltaTime);
    }
    
    updateAI(worm, deltaTime) {
        this.aiTimer += deltaTime;
        
        // Simple AI State Machine
        // 0. Think (Decide what to do)
        if (this.aiStep === 0) {
            if (this.aiTimer > 1.0) {
                const target = this.worms.find(w => !w.isAI && !w.isDead);
                if (target) {
                    const dx = target.x - worm.x;
                    const dist = Math.abs(dx);
                    
                    // If far away, move closer
                    if (dist > 300) {
                         console.log("AI: Moving closer");
                         this.aiStep = 0.5; // Move state
                         this.aiMoveDuration = 2.0; // Move for 2 seconds (or less if close enough)
                         this.aiTargetX = target.x;
                    } else {
                        console.log("AI: Good range, Aiming");
                        this.aiStep = 1;
                    }
                } else {
                     this.nextTurn();
                }
                this.aiTimer = 0;
            }
        }
        // 0.5 Move
        else if (this.aiStep === 0.5) {
             const dx = this.aiTargetX - worm.x;
             const dist = Math.abs(dx);
             
             // Move towards target
             if (Math.abs(dx) > 50 && this.aiMoveDuration > 0) {
                 this.aiMoveDuration -= deltaTime;
                 
                 // Simulate input
                 if (dx > 0) {
                     worm.vx = worm.speed;
                     worm.facing = 1;
                 } else {
                     worm.vx = -worm.speed;
                     worm.facing = -1;
                 }
                 
                 // Jump if blocked (simple check: if vx is small but we want to move)
                 // Or just random jump
                 if (Math.random() < 0.02 && worm.isOnGround) {
                     worm.vy = worm.jumpForce;
                     worm.isOnGround = false;
                     this.audio.playJump();
                 }
             } else {
                 // Stop moving
                 worm.vx = 0;
                 console.log("AI: Finished moving, Aiming");
                 this.aiStep = 1;
                 this.aiTimer = 0;
             }
        }
        // 1. Aim
        else if (this.aiStep === 1) {
            // Find target (Human)
            const target = this.worms.find(w => !w.isAI && !w.isDead);
            if (target) {
                const dx = target.x - worm.x;
                const dy = target.y - worm.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                // Aiming Logic (Arc)
                const arcHeight = dist * 0.5; // Aim at a point above the target
                const targetY = target.y - arcHeight; 
                
                let angle = Math.atan2(targetY - worm.y, dx);
                
                this.weapons.aimAngle = angle;
                worm.facing = dx >= 0 ? 1 : -1;
                
                this.aiStep = 2;
                this.aiTimer = 0;
                console.log(`AI: Aiming at angle ${angle.toFixed(2)}`);
            } else {
                 this.nextTurn();
            }
        }
        // 2. Charge
        else if (this.aiStep === 2) {
             const target = this.worms.find(w => !w.isAI && !w.isDead);
             if (target) {
                 const dx = target.x - worm.x;
                 const dy = target.y - worm.y;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 
                 // Required power estimation
                 // If we aim higher, we need more power.
                 // Simple linear relation for now, tweaked for the new "Fake Y" aiming
                 const requiredPower = Math.min(dist * 2.2, this.weapons.maxPower);
                 
                 this.weapons.isCharging = true;
                 this.weapons.power += 600 * deltaTime; 
                 
                 if (this.weapons.power >= requiredPower) {
                     console.log("AI: Fire!");
                     this.weapons.fire(worm);
                     this.weapons.isCharging = false;
                     this.weapons.power = 0;
                     this.aiStep = 3; 
                 }
             } else {
                 this.weapons.isCharging = false;
                 this.nextTurn();
             }
        }
    }

    render() {
        // Clear screen
        this.ctx.fillStyle = "#87CEEB"; // Sky color
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Render terrain
        this.terrain.render(this.ctx);

        // Render worms
        this.worms.forEach(worm => worm.render(this.ctx));
        
        // Render weapons (projectiles & visuals)
        this.weapons.render(this.ctx, this.worms[this.currentWormIndex]);
        
        // Update DOM UI
        const activeWorm = this.worms[this.currentWormIndex];
        const turnLabel = document.getElementById('turn-label');
        const timerLabel = document.getElementById('hud-timer');
        const weaponLabel = document.getElementById('weapon-display');
        const windBar = document.getElementById('wind-bar');
        
        if (turnLabel) {
            let stateText = "";
            if (this.turnState === 'RETREAT') stateText = " (Retreat)";
            if (this.turnState === 'FIRING') stateText = " (Firing)";
            
            const teamName = activeWorm.teamColor === '#ff0000' ? "Red Team" : "Blue Team (AI)";
            turnLabel.innerText = `${teamName}${stateText}`;
            turnLabel.style.color = activeWorm.teamColor;
        }

        if (timerLabel) {
            if (this.turnState === 'INPUT') {
                timerLabel.innerText = Math.ceil(this.turnTimer);
                timerLabel.style.color = 'white';
            } else if (this.turnState === 'RETREAT') {
                timerLabel.innerText = Math.ceil(this.retreatTimer);
                timerLabel.style.color = 'red';
            } else {
                timerLabel.innerText = "--";
            }
        }
        
        if (weaponLabel) {
            weaponLabel.innerText = this.weapons.weaponStats[this.weapons.currentWeapon].name;
        }
        
        if (windBar) {
            // Visualize wind. Max wind 100.
            // Center is 50%.
            const windPct = (this.wind / 100) * 50; // -50% to +50%
            windBar.style.left = '50%';
            windBar.style.width = `${Math.abs(windPct)}%`;
            if (windPct < 0) {
                windBar.style.left = `${50 + windPct}%`; // Move left
            }
        }
    }
}