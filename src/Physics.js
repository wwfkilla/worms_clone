export class Physics {
    constructor() {
    }

    update(worms, terrain, deltaTime) {
        worms.forEach(worm => {
            if (worm.isDead) return;

            // Apply terminal velocity to prevent tunneling
            if (worm.vy > 600) worm.vy = 600;

            // --- X Axis Collision ---
            // Predict next X position
            let nextX = worm.x + worm.vx * deltaTime;
            let nextY = worm.y + worm.vy * deltaTime;

            // Check horizontal collision (Walls)
            // We check a few points along the height of the worm in the direction of movement
            if (Math.abs(worm.vx) > 0) {
                const dir = Math.sign(worm.vx);
                const checkDist = 6; // Radius
                
                // Check 3 points: Head, Waist, Feet-ish
                const checkX = worm.x + (dir * checkDist);
                
                let hitWall = false;
                if (terrain.isPixelSolid(checkX, worm.y - 5) || // Head
                    terrain.isPixelSolid(checkX, worm.y + 5)) { // Waist
                    hitWall = true;
                }

                if (hitWall) {
                    // Stop horizontal movement
                    worm.vx = 0;
                    // Dont apply X movement
                } else {
                    // Apply X
                    // Note: We handled X in Worm.js, but maybe we should handle it here?
                    // Currently Worm.js updates x/y. We need to correct it.
                    // Let's assume Worm.js ALREADY moved it. We need to push it back.
                    // But wait, Worm.js update() is called BEFORE Physics.update().
                    // So worm.x is already the *new* position.
                    
                    // Let's re-check the *current* position (which is the new potential position)
                    // If we are inside a wall, push back.
                    if (terrain.isPixelSolid(worm.x + (dir * 5), worm.y - 5)) {
                        worm.x -= worm.vx * deltaTime; // Step back
                        worm.vx = 0;
                    }
                }
            }

            // --- Y Axis Collision (Ground) ---
            const feetX = Math.floor(worm.x);
            const feetY = Math.floor(worm.y + 10); // Bottom of worm

            if (terrain.isPixelSolid(feetX, feetY)) {
                // Grounded?
                if (worm.vy >= 0) { // Only if falling or standing
                    worm.vy = 0;
                    worm.isOnGround = true;

                    // Snap to surface (Anti-penetration)
                    // Search up for empty space
                    let offset = 0;
                    const maxSearch = 30; // Search up to 30px up (generous for slopes/explosions)
                    
                    while (terrain.isPixelSolid(feetX, feetY - offset) && offset < maxSearch) {
                        offset++;
                    }

                    if (offset < maxSearch) {
                        worm.y -= offset;
                    } else {
                        // We are DEEP inside terrain (e.g. knocked into a mountain)
                        // This is the "glitch" fix: forceful ejection or just stop falling.
                        // If we can't find surface up, maybe we shouldn't move Y?
                        // Or maybe we should slowly rise?
                        worm.y -= 1; // Slow rise to surface
                    }
                }
            } else {
                worm.isOnGround = false;
            }

            // --- World Bounds ---
            if (worm.y > terrain.height + 50) {
                 // Fell off world
                 worm.health = 0;
                 worm.isDead = true;
                 worm.vx = 0;
                 worm.vy = 0;
                 console.log("Worm died (Void)");
            }
            
            if (worm.x < 0) { worm.x = 0; worm.vx = 0; }
            if (worm.x > terrain.width) { worm.x = terrain.width; worm.vx = 0; }
        });
    }
}
