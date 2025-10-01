// Main Game Logic

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Setup canvas for mobile
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game State
const gameState = {
    running: false,
    gameOver: false,
    lastTime: 0,
    deltaTime: 0
};

// Initialize HUD
const hud = new HUD();

// Player (person in bucket with pink hat)
const player = {
    x: canvas.width / 2,
    y: canvas.height * 0.7,
    width: 60,
    height: 80,
    velocityX: 0,
    velocityY: 0,
    rotation: 0,
    speed: 0
};

// River
const river = {
    speed: 2,
    lanes: [],
    obstacles: [],
    waterY: 0
};

// Particle system for water splashes
const particles = [];

class Particle {
    constructor(x, y, vx, vy, color = 'rgba(255, 255, 255, 0.8)') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = 1.0;
        this.size = Math.random() * 4 + 2;
        this.color = color;
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;
        this.vy += 0.2; // Gravity
        this.life -= deltaTime * 2;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function createSplash(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 2;
        particles.push(new Particle(x, y, vx, vy, 'rgba(255, 255, 255, 0.9)'));
    }
}

// Touch/Mouse Controls
let touchX = null;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchX = e.touches[0].clientX;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (gameState.running) {
        touchX = e.touches[0].clientX;
    }
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    touchX = null;
});

// Mouse controls for desktop
canvas.addEventListener('mousedown', (e) => {
    touchX = e.clientX;
});

canvas.addEventListener('mousemove', (e) => {
    if (touchX !== null && gameState.running) {
        touchX = e.clientX;
    }
});

canvas.addEventListener('mouseup', () => {
    touchX = null;
});

// Generate obstacles
function generateObstacle() {
    if (Math.random() < 0.02) {
        const types = ['rock', 'log', 'duck'];
        const type = types[Math.floor(Math.random() * types.length)];
        const obstacle = {
            x: Math.random() * (canvas.width - 50) + 25,
            y: -50,
            width: type === 'duck' ? 40 : 50,
            height: type === 'duck' ? 40 : 50,
            type: type
        };
        river.obstacles.push(obstacle);
    }
}

// Draw Player (person with pink hat in bucket)
function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.rotation);

    // Bucket (hermaty)
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(-30, 20);
    ctx.lineTo(-25, -10);
    ctx.lineTo(25, -10);
    ctx.lineTo(30, 20);
    ctx.closePath();
    ctx.fill();

    // Bucket rim
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(-30, -15, 60, 8);

    // Water in bucket
    ctx.fillStyle = 'rgba(64, 164, 223, 0.5)';
    ctx.fillRect(-25, -8, 50, 18);

    // Person body
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(0, -20, 15, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    ctx.strokeStyle = '#FFE4C4';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-10, -15);
    ctx.lineTo(-20, -5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(10, -15);
    ctx.lineTo(20, -5);
    ctx.stroke();

    // Head
    ctx.fillStyle = '#FFDAB9';
    ctx.beginPath();
    ctx.arc(0, -35, 12, 0, Math.PI * 2);
    ctx.fill();

    // Pink Hat
    ctx.fillStyle = '#FF69B4';
    // Hat brim
    ctx.beginPath();
    ctx.ellipse(0, -42, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hat top
    ctx.fillRect(-12, -55, 24, 15);
    ctx.beginPath();
    ctx.arc(0, -55, 12, Math.PI, 0);
    ctx.fill();

    // Face details
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-5, -35, 2, 0, Math.PI * 2);
    ctx.arc(5, -35, 2, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -32, 5, 0, Math.PI);
    ctx.stroke();

    ctx.restore();
}

// Draw River
function drawRiver() {
    // Animated water
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#40A4DF');
    gradient.addColorStop(0.5, '#5AB8E8');
    gradient.addColorStop(1, '#40A4DF');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Water waves
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const offset = (river.waterY + i * 100) % canvas.height;
        for (let x = 0; x < canvas.width; x += 20) {
            const y = offset + Math.sin((x + river.waterY) * 0.02) * 10;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    river.waterY += river.speed;
}

// Draw Obstacles
function drawObstacles() {
    river.obstacles.forEach(obstacle => {
        ctx.save();
        ctx.translate(obstacle.x, obstacle.y);

        if (obstacle.type === 'rock') {
            // Rock
            ctx.fillStyle = '#696969';
            ctx.beginPath();
            ctx.ellipse(0, 0, obstacle.width/2, obstacle.height/2, Math.PI/4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#505050';
            ctx.beginPath();
            ctx.ellipse(-10, -5, 8, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (obstacle.type === 'log') {
            // Log
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(-obstacle.width/2, -obstacle.height/2, obstacle.width, obstacle.height);
            ctx.fillStyle = '#654321';
            for (let i = -15; i < obstacle.width/2; i += 10) {
                ctx.fillRect(i - obstacle.width/2, -obstacle.height/2, 3, obstacle.height);
            }
        } else if (obstacle.type === 'duck') {
            // Duck (friendly)
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(-5, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(8, -3, 10, 0, Math.PI * 2);
            ctx.fill();

            // Beak
            ctx.fillStyle = '#FFA500';
            ctx.beginPath();
            ctx.moveTo(15, -3);
            ctx.lineTo(22, -5);
            ctx.lineTo(22, -1);
            ctx.closePath();
            ctx.fill();

            // Eye
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(12, -5, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });
}

// Update Game
function update(currentTime) {
    if (!gameState.running) return;

    // Calculate delta time (in seconds)
    if (gameState.lastTime === 0) {
        gameState.lastTime = currentTime;
    }
    gameState.deltaTime = (currentTime - gameState.lastTime) / 1000;
    gameState.lastTime = currentTime;

    // Clamp deltaTime to avoid huge jumps
    if (gameState.deltaTime > 0.1) {
        gameState.deltaTime = 0.016; // ~60fps
    }

    // Player movement
    if (touchX !== null) {
        const targetX = touchX;
        const diff = targetX - player.x;
        player.velocityX = diff * 0.1;
        player.rotation = diff * 0.001;

        // Create wake splashes when moving fast
        if (Math.abs(player.velocityX) > 2 && Math.random() < 0.3) {
            createSplash(player.x - Math.sign(player.velocityX) * 30, player.y + 10, 3);
        }
    } else {
        player.velocityX *= 0.95;
        player.rotation *= 0.95;
    }

    player.x += player.velocityX;
    player.rotation = Math.max(-0.3, Math.min(0.3, player.rotation));

    // Keep player in bounds
    player.x = Math.max(30, Math.min(canvas.width - 30, player.x));

    // Update river speed (increases over time)
    river.speed = Math.min(8, 2 + hud.distance * 0.001);
    player.speed = river.speed * 50;

    // Generate obstacles
    generateObstacle();

    // Move obstacles
    river.obstacles.forEach((obstacle, index) => {
        obstacle.y += river.speed;

        // Check collision
        const dist = Math.hypot(player.x - obstacle.x, player.y - obstacle.y);
        if (dist < 40) {
            if (obstacle.type === 'duck') {
                // Duck is friendly - small bonus
                createSplash(obstacle.x, obstacle.y, 15);
                soundSystem.playPickup();
            } else {
                // Hit obstacle
                createSplash(obstacle.x, obstacle.y, 20);
                soundSystem.playHit();
                soundSystem.playSplash();

                const damage = obstacle.type === 'rock' ? 20 : 10;
                const health = hud.damageHealth(damage);

                if (health <= 0) {
                    endGame();
                }
            }
            river.obstacles.splice(index, 1);
        }

        // Remove off-screen obstacles
        if (obstacle.y > canvas.height + 50) {
            river.obstacles.splice(index, 1);
        }
    });

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        if (!particles[i].update(gameState.deltaTime)) {
            particles.splice(i, 1);
        }
    }

    // Update HUD
    hud.updateDistance(hud.distance + river.speed * 0.5);
    hud.updateSpeed(player.speed);
}

// Render Game
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawRiver();
    drawObstacles();
    drawPlayer();

    // Draw particles
    particles.forEach(particle => particle.draw(ctx));
}

// Game Loop
function gameLoop(currentTime) {
    update(currentTime);
    render();

    if (gameState.running) {
        requestAnimationFrame(gameLoop);
    }
}

// Start Game
function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');

    // Reset game state
    gameState.running = true;
    gameState.gameOver = false;
    gameState.lastTime = 0;

    player.x = canvas.width / 2;
    player.y = canvas.height * 0.7;
    player.velocityX = 0;
    player.rotation = 0;

    river.speed = 2;
    river.obstacles = [];
    river.waterY = 0;
    particles.length = 0;

    hud.reset();

    soundSystem.playStart();
    soundSystem.startAmbient();

    requestAnimationFrame(gameLoop);
}

// End Game
function endGame() {
    gameState.running = false;
    gameState.gameOver = true;

    soundSystem.stopAmbient();
    soundSystem.playGameOver();

    document.getElementById('finalDistance').textContent = hud.distance;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

// Event Listeners
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

// Prevent zoom on double tap
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);
