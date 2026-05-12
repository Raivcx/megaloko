const AudioManager = (() => {
    let ctx = null;
    let initialized = false;
    let energyWarnOsc = null;
    let energyWarnGain = null;
    let isWarning = false;

    function init() {
        if (initialized) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        initialized = true;
    }

    function ensureContext() {
        if (!ctx) init();
        if (ctx.state === 'suspended') ctx.resume();
    }

    function playLaser() {
        ensureContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.05);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
    }

    function playExplosion() {
        ensureContext();
        const bufferSize = ctx.sampleRate * 0.25;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        source.start(ctx.currentTime);
        source.stop(ctx.currentTime + 0.25);
    }

    function playLevelUp() {
        ensureContext();
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.15);
            osc.start(ctx.currentTime + i * 0.1);
            osc.stop(ctx.currentTime + i * 0.1 + 0.15);
        });
    }

    function playDeath() {
        ensureContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
    }

    function playGameOver() {
        ensureContext();
        const notes = [392, 349, 330, 262];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.3);
            gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.3 + 0.28);
            osc.start(ctx.currentTime + i * 0.3);
            osc.stop(ctx.currentTime + i * 0.3 + 0.28);
        });
    }

    function playBonusTick() {
        ensureContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.04);
    }

    function playExtraLife() {
        ensureContext();
        const notes = [660, 880, 1100, 1320, 1100, 1320];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
            gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.1);
            osc.start(ctx.currentTime + i * 0.08);
            osc.stop(ctx.currentTime + i * 0.08 + 0.1);
        });
    }

    // Alerta contínuo de energia baixa
    function startEnergyWarning(energyRatio) {
        ensureContext();
        if (!isWarning) {
            energyWarnOsc = ctx.createOscillator();
            energyWarnGain = ctx.createGain();
            energyWarnOsc.connect(energyWarnGain);
            energyWarnGain.connect(ctx.destination);
            energyWarnOsc.type = 'square';
            energyWarnOsc.frequency.setValueAtTime(200, ctx.currentTime);
            energyWarnGain.gain.setValueAtTime(0, ctx.currentTime);
            energyWarnOsc.start(ctx.currentTime);
            isWarning = true;
        }
        // Quanto menor a energia, mais agudo e alto o som
        const urgency = 1 - energyRatio / 0.25;
        const freq = 200 + urgency * 600;
        const vol = 0.03 + urgency * 0.06;
        energyWarnOsc.frequency.setValueAtTime(freq, ctx.currentTime);
        // Pulsar o volume para efeito de "bipe"
        const pulse = (Math.sin(ctx.currentTime * 12) > 0) ? vol : 0;
        energyWarnGain.gain.setValueAtTime(pulse, ctx.currentTime);
    }

    function stopEnergyWarning() {
        if (isWarning && energyWarnOsc) {
            try {
                energyWarnGain.gain.setValueAtTime(0, ctx.currentTime);
                energyWarnOsc.stop(ctx.currentTime + 0.05);
            } catch (e) { /* already stopped */ }
            isWarning = false;
            energyWarnOsc = null;
            energyWarnGain = null;
        }
    }

    return {
        init, playLaser, playExplosion, playLevelUp,
        playDeath, playGameOver, playBonusTick, playExtraLife,
        startEnergyWarning, stopEnergyWarning
    };
})();
