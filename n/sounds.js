// Sound System using Web Audio API

class SoundSystem {
    constructor() {
        this.audioContext = null;
        this.ambientSound = null;
        this.masterGain = null;
        this.init();
    }

    init() {
        // Initialize on first user interaction (required by browsers)
        const initAudio = () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.audioContext.createGain();
                this.masterGain.gain.value = 0.3;
                this.masterGain.connect(this.audioContext.destination);
            }
            document.removeEventListener('touchstart', initAudio);
            document.removeEventListener('click', initAudio);
        };

        document.addEventListener('touchstart', initAudio);
        document.addEventListener('click', initAudio);
    }

    // Create oscillator for sound generation
    createOscillator(frequency, type = 'sine') {
        if (!this.audioContext) return null;

        const oscillator = this.audioContext.createOscillator();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        return oscillator;
    }

    // Water ambient sound (flowing river)
    startAmbient() {
        if (!this.audioContext || this.ambientSound) return;

        // Create brown noise for water sound
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; // Amplify
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        // Filter for water-like sound
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        filter.Q.value = 0.5;

        const ambientGain = this.audioContext.createGain();
        ambientGain.gain.value = 0.15;

        noise.connect(filter);
        filter.connect(ambientGain);
        ambientGain.connect(this.masterGain);

        noise.start();
        this.ambientSound = { noise, filter, ambientGain };
    }

    stopAmbient() {
        if (this.ambientSound) {
            this.ambientSound.noise.stop();
            this.ambientSound = null;
        }
    }

    // Hit/collision sound
    playHit() {
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;

        // Create impact sound with noise burst
        const noise = this.audioContext.createBufferSource();
        const bufferSize = this.audioContext.sampleRate * 0.2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        noise.buffer = buffer;

        // Low thump
        const osc = this.createOscillator(80, 'sine');
        const oscGain = this.audioContext.createGain();
        oscGain.gain.setValueAtTime(0.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        // Noise filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;

        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(0.6, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.3);
        noise.start(now);
        noise.stop(now + 0.2);
    }

    // Pickup/duck sound (positive)
    playPickup() {
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;

        // Cheerful ascending tones
        const frequencies = [440, 554.37, 659.25]; // A4, C#5, E5

        frequencies.forEach((freq, index) => {
            const osc = this.createOscillator(freq, 'sine');
            const gain = this.audioContext.createGain();

            const startTime = now + index * 0.08;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + 0.15);
        });
    }

    // Start game sound
    playStart() {
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;

        // Uplifting fanfare
        const melody = [
            { freq: 261.63, time: 0 },      // C4
            { freq: 329.63, time: 0.1 },    // E4
            { freq: 392.00, time: 0.2 },    // G4
            { freq: 523.25, time: 0.3 }     // C5
        ];

        melody.forEach(note => {
            const osc = this.createOscillator(note.freq, 'triangle');
            const gain = this.audioContext.createGain();

            const startTime = now + note.time;
            gain.gain.setValueAtTime(0.25, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    }

    // Game over sound
    playGameOver() {
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;

        // Descending sad tones
        const melody = [
            { freq: 392.00, time: 0 },      // G4
            { freq: 349.23, time: 0.2 },    // F4
            { freq: 293.66, time: 0.4 },    // D4
            { freq: 261.63, time: 0.6 }     // C4
        ];

        melody.forEach(note => {
            const osc = this.createOscillator(note.freq, 'sine');
            const gain = this.audioContext.createGain();

            const startTime = now + note.time;
            gain.gain.setValueAtTime(0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + 0.4);
        });
    }

    // Splash sound (for visual feedback)
    playSplash() {
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;

        // Create splash with filtered white noise
        const bufferSize = this.audioContext.sampleRate * 0.3;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.5));
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        filter.Q.value = 1;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + 0.3);
    }
}

// Initialize global sound system
const soundSystem = new SoundSystem();
