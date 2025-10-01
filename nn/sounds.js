// Sound System using Web Audio API

class SoundSystem {
    constructor() {
        this.audioContext = null;
        this.ambientSound = null;
        this.masterGain = null;
        this.tripMusic = null;
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

    // Power-up collected sound
    playPowerUp() {
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;

        // Magical ascending arpeggio
        const notes = [
            { freq: 523.25, time: 0 },      // C5
            { freq: 659.25, time: 0.08 },   // E5
            { freq: 783.99, time: 0.16 },   // G5
            { freq: 1046.50, time: 0.24 }   // C6
        ];

        notes.forEach(note => {
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

        // Sparkle sound
        for (let i = 0; i < 5; i++) {
            const freq = 2000 + Math.random() * 1000;
            const osc = this.createOscillator(freq, 'sine');
            const gain = this.audioContext.createGain();
            const startTime = now + i * 0.05;

            gain.gain.setValueAtTime(0.1, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + 0.2);
        }
    }

    // Healing sound (health pickup)
    playHeal() {
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;

        // Gentle ascending chimes
        const notes = [
            { freq: 523.25, time: 0 },      // C5
            { freq: 659.25, time: 0.1 },    // E5
            { freq: 783.99, time: 0.2 },    // G5
            { freq: 659.25, time: 0.3 }     // E5 (back down)
        ];

        notes.forEach(note => {
            const osc = this.createOscillator(note.freq, 'sine');
            const gain = this.audioContext.createGain();

            const startTime = now + note.time;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + 0.4);
        });

        // Shimmer effect
        for (let i = 0; i < 8; i++) {
            const freq = 1000 + Math.random() * 1500;
            const osc = this.createOscillator(freq, 'sine');
            const gain = this.audioContext.createGain();
            const startTime = now + i * 0.04;

            gain.gain.setValueAtTime(0.08, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + 0.3);
        }
    }

    // Trippy music for ecstasy mode
    playTripMusic() {
        if (!this.audioContext || this.tripMusic) return;

        const now = this.audioContext.currentTime;

        // Bass line
        const bassOsc = this.createOscillator(65.41, 'sawtooth'); // C2
        const bassGain = this.audioContext.createGain();
        bassGain.gain.value = 0.15;

        const bassLFO = this.createOscillator(0.5, 'sine');
        const bassLFOGain = this.audioContext.createGain();
        bassLFOGain.gain.value = 10;

        bassLFO.connect(bassLFOGain);
        bassLFOGain.connect(bassOsc.frequency);
        bassOsc.connect(bassGain);
        bassGain.connect(this.masterGain);

        // Lead synth with vibrato
        const leadOsc = this.createOscillator(523.25, 'triangle'); // C5
        const leadGain = this.audioContext.createGain();
        leadGain.gain.value = 0.1;

        const vibrato = this.createOscillator(6, 'sine');
        const vibratoGain = this.audioContext.createGain();
        vibratoGain.gain.value = 15;

        vibrato.connect(vibratoGain);
        vibratoGain.connect(leadOsc.frequency);
        leadOsc.connect(leadGain);
        leadGain.connect(this.masterGain);

        // Pad synth
        const padOsc = this.createOscillator(261.63, 'sine'); // C4
        const padGain = this.audioContext.createGain();
        padGain.gain.value = 0.08;

        padOsc.connect(padGain);
        padGain.connect(this.masterGain);

        // Random bleeps
        const bleepInterval = setInterval(() => {
            if (!this.tripMusic) {
                clearInterval(bleepInterval);
                return;
            }

            const freq = 400 + Math.random() * 800;
            const osc = this.createOscillator(freq, 'square');
            const gain = this.audioContext.createGain();
            const now = this.audioContext.currentTime;

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.3);
        }, 500);

        bassOsc.start(now);
        bassLFO.start(now);
        leadOsc.start(now);
        vibrato.start(now);
        padOsc.start(now);

        this.tripMusic = {
            bassOsc, bassLFO, leadOsc, vibrato, padOsc,
            bassGain, leadGain, padGain, bleepInterval
        };
    }

    // Stop trippy music
    stopTripMusic() {
        if (!this.tripMusic) return;

        const now = this.audioContext.currentTime;

        // Fade out
        this.tripMusic.bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        this.tripMusic.leadGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        this.tripMusic.padGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        setTimeout(() => {
            if (this.tripMusic) {
                this.tripMusic.bassOsc.stop();
                this.tripMusic.bassLFO.stop();
                this.tripMusic.leadOsc.stop();
                this.tripMusic.vibrato.stop();
                this.tripMusic.padOsc.stop();
                clearInterval(this.tripMusic.bleepInterval);
                this.tripMusic = null;
            }
        }, 600);
    }
}

// Initialize global sound system
const soundSystem = new SoundSystem();
