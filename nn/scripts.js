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
    speed: 0,
    expression: 'happy', // happy, surprised, trippy, scared, crazy, bugged
    expressionTimer: 0,
    powerUp: null, // 'ecstasy', 'coffee', 'beer'
    powerUpTimer: 0,
    rainbowOffset: 0,
    bankCollisionTimer: 0 // To avoid constant damage from banks
};

// River - winding river system
const river = {
    speed: 2,
    lanes: [],
    obstacles: [],
    waterY: 0,
    path: [], // River path segments
    width: 220, // River width (wider for mobile)
    centerX: 0, // Current center position
    pathOffset: 0 // Global offset for path generation
};

// River path segment
class RiverSegment {
    constructor(y, centerX, width) {
        this.y = y;
        this.centerX = centerX;
        this.width = width;
    }
}

// Initialize river path
function initRiverPath() {
    river.path = [];

    // Calculate how many segments we need
    const numSegments = Math.ceil((canvas.height + 600) / 20);

    // Start pathOffset at top (most negative)
    river.pathOffset = -100;

    let centerX = canvas.width / 2;

    // Build from top to bottom
    for (let i = 0; i < numSegments; i++) {
        const y = -100 + i * 20;

        // Create winding pattern with multiple waves for variety
        const wiggle = Math.sin(river.pathOffset * 0.004) * 90 +
                      Math.cos(river.pathOffset * 0.007) * 50 +
                      Math.sin(river.pathOffset * 0.002) * 30;
        centerX = canvas.width / 2 + wiggle;

        // Keep river on screen
        centerX = Math.max(river.width / 2 + 50, Math.min(canvas.width - river.width / 2 - 50, centerX));

        river.path.push(new RiverSegment(y, centerX, river.width));
        river.pathOffset += 20;
    }

    // Reset pathOffset to the top position for continuous generation
    river.pathOffset = -100;
}

// Get river center at specific Y position
function getRiverCenterAt(y) {
    // Find closest segments
    for (let i = 0; i < river.path.length - 1; i++) {
        if (river.path[i].y <= y && river.path[i + 1].y >= y) {
            // Interpolate between segments
            const t = (y - river.path[i].y) / (river.path[i + 1].y - river.path[i].y);
            return river.path[i].centerX + (river.path[i + 1].centerX - river.path[i].centerX) * t;
        }
    }
    return canvas.width / 2;
}

// Check if point is in river
function isInRiver(x, y) {
    const centerX = getRiverCenterAt(y);
    const halfWidth = river.width / 2;
    return x >= centerX - halfWidth && x <= centerX + halfWidth;
}

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

// Generate obstacles and power-ups
function generateObstacle() {
    if (Math.random() < 0.02) {
        const types = ['rock', 'log', 'duck'];
        const type = types[Math.floor(Math.random() * types.length)];

        // Place in river
        const y = -50;
        const centerX = getRiverCenterAt(y);
        const offsetX = (Math.random() - 0.5) * (river.width * 0.6);

        const obstacle = {
            x: centerX + offsetX,
            y: y,
            width: type === 'duck' ? 40 : 50,
            height: type === 'duck' ? 40 : 50,
            type: type
        };
        river.obstacles.push(obstacle);
    }

    // Generate power-ups
    if (Math.random() < 0.008) {
        const powerUpTypes = ['ecstasy', 'coffee', 'beer', 'health', 'health']; // health more common
        const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];

        // Place in river
        const y = -50;
        const centerX = getRiverCenterAt(y);
        const offsetX = (Math.random() - 0.5) * (river.width * 0.5);

        const powerUp = {
            x: centerX + offsetX,
            y: y,
            width: 30,
            height: 30,
            type: 'powerup',
            powerUpType: type,
            rotation: 0
        };
        river.obstacles.push(powerUp);
    }
}

// Draw Player (person with pink hat in bucket)
function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.rotation);

    // Rainbow aura for ecstasy mode
    if (player.powerUp === 'ecstasy') {
        for (let i = 0; i < 5; i++) {
            const hue = (player.rainbowOffset + i * 60) % 360;
            ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${0.5 - i * 0.08})`;
            ctx.lineWidth = 15 - i * 2;
            ctx.beginPath();
            ctx.arc(0, -10, 50 + i * 8, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // KUBEK (prawdziwy kubek z uchem!)
    // Main cup body
    ctx.fillStyle = player.powerUp === 'ecstasy' ?
        `hsl(${player.rainbowOffset}, 80%, 60%)` : '#FF6347';

    // Front of cup
    ctx.beginPath();
    ctx.moveTo(-28, 25);
    ctx.lineTo(-25, -8);
    ctx.bezierCurveTo(-25, -12, 25, -12, 25, -8);
    ctx.lineTo(28, 25);
    ctx.bezierCurveTo(28, 28, -28, 28, -28, 25);
    ctx.closePath();
    ctx.fill();

    // Cup shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(-10, 0, 8, 20, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Cup rim
    ctx.fillStyle = player.powerUp === 'ecstasy' ?
        `hsl(${(player.rainbowOffset + 60) % 360}, 80%, 50%)` : '#DC143C';
    ctx.beginPath();
    ctx.ellipse(0, -8, 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // "HERMATA" text on cup
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('HERMATA', 0, 12);

    // Cup handle
    ctx.strokeStyle = player.powerUp === 'ecstasy' ?
        `hsl(${(player.rainbowOffset + 120) % 360}, 80%, 60%)` : '#FF6347';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(30, 8, 12, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // Inner handle shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(30, 8, 10, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // Water/liquid in cup
    const liquidColor = player.powerUp === 'ecstasy' ?
        `hsla(${player.rainbowOffset}, 100%, 70%, 0.6)` : 'rgba(64, 164, 223, 0.5)';
    ctx.fillStyle = liquidColor;
    ctx.beginPath();
    ctx.ellipse(0, -5, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Person body
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(0, -18, 13, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms - animated if trippy
    const armWave = player.powerUp === 'ecstasy' ? Math.sin(Date.now() * 0.01) * 5 : 0;
    ctx.strokeStyle = '#FFE4C4';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-8, -15);
    ctx.lineTo(-18 + armWave, -8);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(8, -15);
    ctx.lineTo(18 - armWave, -8);
    ctx.stroke();

    // Head
    ctx.fillStyle = '#FFDAB9';
    ctx.beginPath();
    ctx.arc(0, -33, 13, 0, Math.PI * 2);
    ctx.fill();

    // Pink Hat
    const hatHue = player.powerUp === 'ecstasy' ? player.rainbowOffset : 330;
    ctx.fillStyle = player.powerUp === 'ecstasy' ?
        `hsl(${hatHue}, 100%, 70%)` : '#FF69B4';

    // Hat brim
    ctx.beginPath();
    ctx.ellipse(0, -40, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hat top
    ctx.fillRect(-13, -56, 26, 16);
    ctx.beginPath();
    ctx.arc(0, -56, 13, Math.PI, 0);
    ctx.fill();

    // Hat decoration
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(-13, -42, 26, 3);

    // FACIAL EXPRESSIONS
    drawFace(player.expression);

    ctx.restore();
}

function drawFace(expression) {
    ctx.fillStyle = '#000';

    switch(expression) {
        case 'happy':
            // Eyes
            ctx.beginPath();
            ctx.arc(-5, -33, 2, 0, Math.PI * 2);
            ctx.arc(5, -33, 2, 0, Math.PI * 2);
            ctx.fill();
            // Big smile
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -30, 6, 0, Math.PI);
            ctx.stroke();
            break;

        case 'trippy':
            // Spiral eyes
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 2; i++) {
                const x = i === 0 ? -5 : 5;
                ctx.beginPath();
                for (let a = 0; a < Math.PI * 4; a += 0.2) {
                    const r = a * 0.5;
                    ctx.lineTo(x + Math.cos(a) * r, -33 + Math.sin(a) * r);
                }
                ctx.stroke();
            }
            // Wavy mouth
            ctx.beginPath();
            for (let x = -6; x <= 6; x += 1) {
                const y = -28 + Math.sin(x * 0.5 + Date.now() * 0.01) * 2;
                if (x === -6) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            break;

        case 'surprised':
            // Wide eyes
            ctx.beginPath();
            ctx.arc(-5, -33, 3, 0, Math.PI * 2);
            ctx.arc(5, -33, 3, 0, Math.PI * 2);
            ctx.fill();
            // O mouth
            ctx.beginPath();
            ctx.arc(0, -28, 3, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'scared':
            // Small eyes
            ctx.beginPath();
            ctx.arc(-5, -33, 1.5, 0, Math.PI * 2);
            ctx.arc(5, -33, 1.5, 0, Math.PI * 2);
            ctx.fill();
            // Worried mouth
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -26, 4, Math.PI, 0);
            ctx.stroke();
            break;

        case 'crazy':
            // Different sized eyes
            ctx.beginPath();
            ctx.arc(-5, -33, 3, 0, Math.PI * 2);
            ctx.arc(5, -35, 1.5, 0, Math.PI * 2);
            ctx.fill();
            // Crooked smile
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-6, -28);
            ctx.quadraticCurveTo(0, -24, 6, -30);
            ctx.stroke();
            // Tongue out
            ctx.fillStyle = '#FF69B4';
            ctx.beginPath();
            ctx.ellipse(3, -26, 3, 4, 0.5, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'bugged':
            // HUGE bugged out eyes
            ctx.fillStyle = '#FFF';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;

            // Left eye - huge and popping
            ctx.beginPath();
            ctx.arc(-5, -33, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Left pupil - small and scared
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(-4, -33, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Right eye - even bigger!
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(6, -34, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Right pupil
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(7, -34, 3, 0, Math.PI * 2);
            ctx.fill();

            // Wide open mouth O
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -27, 4, 0, Math.PI * 2);
            ctx.stroke();

            // Sweat drops
            ctx.fillStyle = '#4dd2ff';
            ctx.beginPath();
            ctx.arc(-12, -30, 2, 0, Math.PI * 2);
            ctx.arc(10, -28, 2.5, 0, Math.PI * 2);
            ctx.fill();
            break;
    }
}

// Draw River
function drawRiver() {
    // Draw background (grass/land)
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw river path with banks
    ctx.save();

    // Update river path (scroll)
    river.path.forEach(segment => {
        segment.y += river.speed;
    });

    // Remove old segments that scrolled off bottom of screen
    while (river.path.length > 0 && river.path[river.path.length - 1].y > canvas.height + 100) {
        river.path.pop();
    }

    // Add new segments at the top
    while (river.path.length === 0 || river.path[0].y > -100) {
        const firstSegment = river.path[0];
        const newY = firstSegment ? firstSegment.y - 20 : -100;

        // Use pathOffset for continuous winding
        river.pathOffset -= 20; // Move backwards for new segments at top
        const wiggle = Math.sin(river.pathOffset * 0.004) * 90 +
                      Math.cos(river.pathOffset * 0.007) * 50 +
                      Math.sin(river.pathOffset * 0.002) * 30;
        let centerX = canvas.width / 2 + wiggle;
        centerX = Math.max(river.width / 2 + 50, Math.min(canvas.width - river.width / 2 - 50, centerX));
        river.path.unshift(new RiverSegment(newY, centerX, river.width));
    }

    // Draw water
    if (player.powerUp === 'ecstasy') {
        // Rainbow water
        for (let i = 0; i < river.path.length - 1; i++) {
            const segment = river.path[i];
            const nextSegment = river.path[i + 1];

            const hue = (player.rainbowOffset + i * 10) % 360;
            ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;

            ctx.beginPath();
            ctx.moveTo(segment.centerX - segment.width / 2, segment.y);
            ctx.lineTo(segment.centerX + segment.width / 2, segment.y);
            ctx.lineTo(nextSegment.centerX + nextSegment.width / 2, nextSegment.y);
            ctx.lineTo(nextSegment.centerX - nextSegment.width / 2, nextSegment.y);
            ctx.closePath();
            ctx.fill();
        }
    } else {
        // Normal water
        for (let i = 0; i < river.path.length - 1; i++) {
            const segment = river.path[i];
            const nextSegment = river.path[i + 1];

            const gradient = ctx.createLinearGradient(
                segment.centerX - segment.width / 2, segment.y,
                segment.centerX + segment.width / 2, segment.y
            );
            gradient.addColorStop(0, '#2b6ca3');
            gradient.addColorStop(0.5, '#3a8fc2');
            gradient.addColorStop(1, '#2b6ca3');
            ctx.fillStyle = gradient;

            ctx.beginPath();
            ctx.moveTo(segment.centerX - segment.width / 2, segment.y);
            ctx.lineTo(segment.centerX + segment.width / 2, segment.y);
            ctx.lineTo(nextSegment.centerX + nextSegment.width / 2, nextSegment.y);
            ctx.lineTo(nextSegment.centerX - nextSegment.width / 2, nextSegment.y);
            ctx.closePath();
            ctx.fill();
        }
    }

    // Draw river banks with grass
    // Dark grass edge
    ctx.strokeStyle = '#1a3d0f';
    ctx.lineWidth = 12;

    // Left bank
    ctx.beginPath();
    for (let i = 0; i < river.path.length; i++) {
        const segment = river.path[i];
        const x = segment.centerX - segment.width / 2;
        if (i === 0) ctx.moveTo(x, segment.y);
        else ctx.lineTo(x, segment.y);
    }
    ctx.stroke();

    // Right bank
    ctx.beginPath();
    for (let i = 0; i < river.path.length; i++) {
        const segment = river.path[i];
        const x = segment.centerX + segment.width / 2;
        if (i === 0) ctx.moveTo(x, segment.y);
        else ctx.lineTo(x, segment.y);
    }
    ctx.stroke();

    // Light grass edge (inner)
    ctx.strokeStyle = '#3d7a1f';
    ctx.lineWidth = 6;

    // Left bank inner
    ctx.beginPath();
    for (let i = 0; i < river.path.length; i++) {
        const segment = river.path[i];
        const x = segment.centerX - segment.width / 2;
        if (i === 0) ctx.moveTo(x, segment.y);
        else ctx.lineTo(x, segment.y);
    }
    ctx.stroke();

    // Right bank inner
    ctx.beginPath();
    for (let i = 0; i < river.path.length; i++) {
        const segment = river.path[i];
        const x = segment.centerX + segment.width / 2;
        if (i === 0) ctx.moveTo(x, segment.y);
        else ctx.lineTo(x, segment.y);
    }
    ctx.stroke();

    // Small grass tufts on banks
    ctx.fillStyle = '#2d5016';
    for (let i = 0; i < river.path.length; i += 5) {
        const segment = river.path[i];

        // Left side
        const leftX = segment.centerX - segment.width / 2;
        for (let j = 0; j < 2; j++) {
            ctx.beginPath();
            ctx.arc(leftX - 10 - j * 8, segment.y + (i % 3) * 5, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Right side
        const rightX = segment.centerX + segment.width / 2;
        for (let j = 0; j < 2; j++) {
            ctx.beginPath();
            ctx.arc(rightX + 10 + j * 8, segment.y + (i % 3) * 5, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Water waves
    ctx.strokeStyle = player.powerUp === 'ecstasy' ?
        `hsla(${player.rainbowOffset}, 100%, 70%, 0.5)` :
        'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;

    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const offset = (river.waterY + i * 100) % canvas.height;

        for (let j = 0; j < river.path.length; j++) {
            const segment = river.path[j];
            if (Math.abs(segment.y - offset) < 50) {
                const x = segment.centerX + Math.sin((segment.y + river.waterY) * 0.02) * (segment.width * 0.3);
                if (j === 0) ctx.moveTo(x, segment.y);
                else ctx.lineTo(x, segment.y);
            }
        }
        ctx.stroke();
    }

    ctx.restore();
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
        } else if (obstacle.type === 'powerup') {
            // Power-ups
            obstacle.rotation += 0.05;
            ctx.rotate(obstacle.rotation);

            if (obstacle.powerUpType === 'ecstasy') {
                // Rainbow pill
                const gradient = ctx.createLinearGradient(-15, -15, 15, 15);
                gradient.addColorStop(0, '#FF00FF');
                gradient.addColorStop(0.5, '#00FFFF');
                gradient.addColorStop(1, '#FFFF00');
                ctx.fillStyle = gradient;

                // Pill shape
                ctx.beginPath();
                ctx.arc(-8, 0, 8, Math.PI / 2, -Math.PI / 2);
                ctx.arc(8, 0, 8, -Math.PI / 2, Math.PI / 2);
                ctx.closePath();
                ctx.fill();

                // Shine
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.beginPath();
                ctx.arc(-5, -3, 3, 0, Math.PI * 2);
                ctx.fill();

                // Sparkles
                ctx.fillStyle = '#FFF';
                for (let i = 0; i < 3; i++) {
                    const angle = (Date.now() * 0.005 + i * Math.PI * 2 / 3);
                    const x = Math.cos(angle) * 18;
                    const y = Math.sin(angle) * 18;
                    ctx.fillRect(x - 1, y - 1, 2, 2);
                }
            } else if (obstacle.powerUpType === 'coffee') {
                // Coffee cup
                ctx.fillStyle = '#6F4E37';
                ctx.fillRect(-10, -8, 20, 16);
                ctx.fillStyle = '#8B6F47';
                ctx.beginPath();
                ctx.ellipse(0, -8, 10, 4, 0, 0, Math.PI * 2);
                ctx.fill();

                // Steam
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 2;
                for (let i = 0; i < 2; i++) {
                    ctx.beginPath();
                    const offset = i * 6 - 3;
                    ctx.moveTo(offset, -10);
                    ctx.bezierCurveTo(offset - 3, -15, offset + 3, -18, offset, -22);
                    ctx.stroke();
                }
            } else if (obstacle.powerUpType === 'beer') {
                // Beer mug
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(-10, -10, 20, 20);

                // Foam
                ctx.fillStyle = '#FFFACD';
                ctx.beginPath();
                ctx.arc(-7, -10, 5, 0, Math.PI * 2);
                ctx.arc(0, -12, 5, 0, Math.PI * 2);
                ctx.arc(7, -10, 5, 0, Math.PI * 2);
                ctx.fill();

                // Handle
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(13, 0, 6, -Math.PI / 2, Math.PI / 2);
                ctx.stroke();
            } else if (obstacle.powerUpType === 'health') {
                // Health kit - red cross with heart
                // Red background circle
                ctx.fillStyle = '#FF4444';
                ctx.beginPath();
                ctx.arc(0, 0, 14, 0, Math.PI * 2);
                ctx.fill();

                // White border
                ctx.strokeStyle = '#FFF';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 14, 0, Math.PI * 2);
                ctx.stroke();

                // White cross
                ctx.fillStyle = '#FFF';
                // Vertical bar
                ctx.fillRect(-3, -10, 6, 20);
                // Horizontal bar
                ctx.fillRect(-10, -3, 20, 6);

                // Pulse effect
                const pulseScale = 1 + Math.sin(Date.now() * 0.008) * 0.1;
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = '#FFB3B3';
                ctx.beginPath();
                ctx.arc(0, 0, 14 * pulseScale, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;

                // Plus sparkles
                ctx.fillStyle = '#FFF';
                for (let i = 0; i < 4; i++) {
                    const angle = (Date.now() * 0.003 + i * Math.PI / 2);
                    const x = Math.cos(angle) * 18;
                    const y = Math.sin(angle) * 18;
                    ctx.fillRect(x - 1, y - 1, 2, 2);
                }
            }
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

    // Keep player in river bounds
    const riverCenter = getRiverCenterAt(player.y);
    const riverLeft = riverCenter - river.width / 2 + 30;
    const riverRight = riverCenter + river.width / 2 - 30;

    player.x = Math.max(riverLeft, Math.min(riverRight, player.x));

    // Hit river bank (damage over time)
    if (player.x <= riverLeft + 5 || player.x >= riverRight - 5) {
        player.bankCollisionTimer += gameState.deltaTime;

        if (player.bankCollisionTimer >= 0.3) {
            const damage = 8;
            const health = hud.damageHealth(damage);
            player.expression = 'scared';
            player.expressionTimer = 0.5;
            soundSystem.playSplash();
            createSplash(player.x, player.y, 10);

            player.bankCollisionTimer = 0;

            if (health <= 0) {
                endGame();
            }
        }
    } else {
        player.bankCollisionTimer = 0;
    }

    // Update power-up effects
    if (player.powerUp) {
        player.powerUpTimer -= gameState.deltaTime;
        player.rainbowOffset = (player.rainbowOffset + 5) % 360;

        // Update HUD timer
        const percentage = (player.powerUpTimer / 10) * 100;
        hud.updatePowerUpTimer(percentage);

        if (player.powerUpTimer <= 0) {
            player.powerUp = null;
            player.expression = 'happy';
            soundSystem.stopTripMusic();
            hud.hidePowerUp();
        }
    }

    // Random expression changes
    player.expressionTimer -= gameState.deltaTime;
    if (player.expressionTimer <= 0 && !player.powerUp) {
        const expressions = ['happy', 'happy', 'surprised', 'crazy'];
        player.expression = expressions[Math.floor(Math.random() * expressions.length)];
        player.expressionTimer = Math.random() * 3 + 2;
    }

    // Update river speed (increases over time)
    const speedMultiplier = player.powerUp === 'coffee' ? 1.5 : 1;
    river.speed = Math.min(8, 2 + hud.distance * 0.001) * speedMultiplier;
    player.speed = river.speed * 50;

    // Beer effect - wobbly movement
    if (player.powerUp === 'beer') {
        player.x += Math.sin(Date.now() * 0.005) * 2;
    }

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
                player.expression = 'happy';
                player.expressionTimer = 2;
            } else if (obstacle.type === 'powerup') {
                // Power-up collected!
                createSplash(obstacle.x, obstacle.y, 25);

                if (obstacle.powerUpType === 'health') {
                    // Health regeneration - instant effect!
                    const healAmount = 40;
                    hud.updateHealth(Math.min(100, hud.getHealth() + healAmount));
                    soundSystem.playHeal();
                    player.expression = 'happy';
                    player.expressionTimer = 2;

                    // Visual feedback particles
                    for (let i = 0; i < 20; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = Math.random() * 4 + 2;
                        const vx = Math.cos(angle) * speed;
                        const vy = Math.sin(angle) * speed - 3;
                        particles.push(new Particle(obstacle.x, obstacle.y, vx, vy, '#FF4444'));
                    }
                } else {
                    // Other power-ups
                    soundSystem.playPowerUp();

                    player.powerUp = obstacle.powerUpType;
                    player.powerUpTimer = 10; // 10 seconds

                    hud.showPowerUp(obstacle.powerUpType);

                    if (obstacle.powerUpType === 'ecstasy') {
                        player.expression = 'trippy';
                        soundSystem.playTripMusic();
                    } else if (obstacle.powerUpType === 'coffee') {
                        player.expression = 'crazy';
                    } else if (obstacle.powerUpType === 'beer') {
                        player.expression = 'happy';
                    }
                }
            } else {
                // Hit obstacle
                createSplash(obstacle.x, obstacle.y, 20);
                soundSystem.playHit();
                soundSystem.playSplash();

                // Different expressions based on obstacle
                if (obstacle.type === 'rock') {
                    player.expression = 'bugged'; // Bugged out eyes for rock!
                    player.expressionTimer = 1.5;
                } else {
                    player.expression = 'scared';
                    player.expressionTimer = 1;
                }

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

    // Start player in center of river at their Y position
    player.y = canvas.height * 0.7;
    player.x = getRiverCenterAt(player.y);
    player.velocityX = 0;
    player.rotation = 0;
    player.expression = 'happy';
    player.expressionTimer = 3;
    player.powerUp = null;
    player.powerUpTimer = 0;
    player.rainbowOffset = 0;
    player.bankCollisionTimer = 0;

    river.speed = 2;
    river.obstacles = [];
    river.waterY = 0;
    particles.length = 0;

    // Initialize winding river (sets pathOffset internally)
    initRiverPath();

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
    soundSystem.stopTripMusic();
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

// Initialize river on load
initRiverPath();
