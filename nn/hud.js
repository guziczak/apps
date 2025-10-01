// HUD Management System

class HUD {
    constructor() {
        this.distanceElement = document.getElementById('distance');
        this.speedElement = document.getElementById('speed');
        this.healthFillElement = document.getElementById('health-fill');
        this.powerupIndicator = document.getElementById('powerup-indicator');
        this.powerupText = document.getElementById('powerup-text');
        this.powerupTimerFill = document.getElementById('powerup-timer-fill');

        this.distance = 0;
        this.speed = 0;
        this.health = 100;
    }

    updateDistance(value) {
        this.distance = Math.floor(value);
        this.distanceElement.textContent = `${this.distance}m`;
    }

    updateSpeed(value) {
        this.speed = Math.floor(value);
        this.speedElement.textContent = this.speed;
    }

    updateHealth(value) {
        this.health = Math.max(0, Math.min(100, value));
        this.healthFillElement.style.width = `${this.health}%`;

        // Change color based on health
        if (this.health < 30) {
            this.healthFillElement.style.background = 'linear-gradient(to right, #FF0000, #FF6B6B)';
        } else if (this.health < 60) {
            this.healthFillElement.style.background = 'linear-gradient(to right, #FFA500, #FFD700)';
        } else {
            this.healthFillElement.style.background = 'linear-gradient(to right, #FF6B6B, #FF8E53)';
        }
    }

    damageHealth(amount) {
        this.updateHealth(this.health - amount);

        // Shake effect on damage
        const hud = document.getElementById('hud');
        hud.style.animation = 'none';
        setTimeout(() => {
            hud.style.animation = 'shake 0.3s';
        }, 10);

        return this.health;
    }

    reset() {
        this.updateDistance(0);
        this.updateSpeed(0);
        this.updateHealth(100);
    }

    getDistance() {
        return this.distance;
    }

    getHealth() {
        return this.health;
    }

    showPowerUp(type) {
        const names = {
            'ecstasy': '🌈 TRIP MODE! 🌈',
            'coffee': '☕ TURBO! ☕',
            'beer': '🍺 PIJANY! 🍺'
        };

        this.powerupText.textContent = names[type] || 'POWER UP!';
        this.powerupIndicator.classList.remove('hidden');

        // Set color based on type
        if (type === 'ecstasy') {
            this.powerupIndicator.style.background = 'linear-gradient(135deg, #FF00FF, #00FFFF, #FFFF00)';
        } else if (type === 'coffee') {
            this.powerupIndicator.style.background = 'rgba(139, 69, 19, 0.9)';
        } else if (type === 'beer') {
            this.powerupIndicator.style.background = 'rgba(255, 215, 0, 0.9)';
        }
    }

    updatePowerUpTimer(percentage) {
        this.powerupTimerFill.style.width = `${percentage}%`;
    }

    hidePowerUp() {
        this.powerupIndicator.classList.add('hidden');
    }
}

// Add shake animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translate(0, 0); }
        25% { transform: translate(-5px, 0); }
        75% { transform: translate(5px, 0); }
    }
`;
document.head.appendChild(style);
