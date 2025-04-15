class BreathingExercise {
    constructor() {
        this.circle = document.querySelector('.circle');
        this.instruction = document.querySelector('.instruction');
        this.timer = document.querySelector('.timer');
        this.startButton = document.getElementById('startButton');
        this.durationSelect = document.getElementById('duration');
        this.patternSelect = document.getElementById('pattern');
        this.soundToggle = document.getElementById('sound');
        this.breathingMethod = document.querySelector('.breathing-method');
        this.noseIcon = document.querySelector('.nose-icon');
        this.mouthIcon = document.querySelector('.mouth-icon');
        this.flower = document.querySelector('.lotus-flower');
        
        this.isRunning = false;
        this.currentPhase = 0;
        this.timeLeft = 0;
        this.sessionTimer = null;
        this.phaseTimer = null;
        
        this.audioContext = null;
        this.oscillator = null;
        
        this.lastPhase = null;
        
        this.startButton.addEventListener('click', () => this.toggleExercise());
        this.setupAudio();
        this.setupDurationInput();
        this.setupPatternSelect();
    }

    setupAudio() {
        this.soundToggle.addEventListener('change', () => {
            if (this.soundToggle.checked && !this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (!this.soundToggle.checked && this.oscillator) {
                this.oscillator.stop();
            }
        });
    }

    setupDurationInput() {
        this.durationSelect.addEventListener('input', () => {
            let value = parseInt(this.durationSelect.value);
            if (value < 1) this.durationSelect.value = 1;
            if (value > 99) this.durationSelect.value = 99;
        });
    }

    setupPatternSelect() {
        this.patternSelect.addEventListener('change', () => {
            const durationLabel = document.querySelector('label[for="duration"]');
            const isWimHof = this.patternSelect.value === 'wim-hof';
            
            durationLabel.textContent = isWimHof ? 'Number of Rounds:' : 'Session Duration (minutes):';
            this.durationSelect.value = isWimHof ? '3' : '5';
            this.durationSelect.min = isWimHof ? '1' : '1';
            this.durationSelect.max = isWimHof ? '10' : '99';
        });
    }

    playTone(frequency, duration) {
        if (!this.soundToggle.checked || !this.audioContext) return;

        this.oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        this.oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
        
        this.oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        this.oscillator.start();
        this.oscillator.stop(this.audioContext.currentTime + duration);
    }

    getBreathingPattern() {
        if (this.patternSelect.value === 'wim-hof') {
            return {
                inhale: 1,    // One second in
                inHold: 0,    // No hold after inhale
                exhale: 1,    // One second out
                outHold: 0,   // No hold after exhale
                isWimHof: true,
                roundCount: 0,
                maxRounds: parseInt(this.durationSelect.value),
                breathsPerRound: 30,
                retentionTime: 90,  // 1.5 minutes retention
                recoveryInhale: 5,  // 5 second inhale
                recoveryHold: 15    // 15 second recovery hold
            };
        }
        
        const pattern = this.patternSelect.value.split('-').map(Number);
        return {
            inhale: pattern[0],
            inHold: pattern[1] || 0,
            exhale: pattern[2] || pattern[0],
            outHold: pattern[3] || 0,
            isWimHof: false
        };
    }

    updateCircleAnimation(phase, duration) {
        this.circle.style.animation = 'none';
        this.circle.offsetHeight; // Trigger reflow
        
        let scale = 1;
        let timing = 'ease-in-out';
        
        switch(phase) {
            case 'inhale':
                scale = this.patternSelect.value === 'wim-hof' ? 1.8 : 1.4;
                // More fluid animation for Wim Hof
                timing = this.patternSelect.value === 'wim-hof' ? 
                    'cubic-bezier(0.4, 0, 0.6, 1)' : 'ease-in-out';
                break;
            case 'inHold':
            case 'outHold':
            case 'retention':
                scale = this.circle.style.transform ? 
                    parseFloat(this.circle.style.transform.replace('scale(', '').replace(')', '')) : 1;
                timing = 'linear';
                break;
            case 'exhale':
                scale = 1;
                // More fluid animation for Wim Hof
                timing = this.patternSelect.value === 'wim-hof' ? 
                    'cubic-bezier(0.4, 0, 0.6, 1)' : 'ease-in-out';
                break;
        }
        
        this.circle.style.transition = `transform ${duration}s ${timing}`;
        this.circle.style.transform = `scale(${scale})`;
    }

    updateBreathingMethod(phase) {
        if (!this.isRunning || phase === 'retention' || phase === 'recovery') {
            this.breathingMethod.classList.remove('show');
            return;
        }

        this.breathingMethod.classList.add('show');
        
        // Reset both icons
        this.noseIcon.classList.remove('active');
        this.mouthIcon.classList.remove('active');

        // Set active icon based on phase and pattern
        switch(phase) {
            case 'inhale':
            case 'recoveryInhale':
                this.noseIcon.classList.add('active');
                break;
            case 'exhale':
                // For box breathing, 4-7-8, and Wim Hof, exhale through mouth
                if (this.patternSelect.value === '4-4-4-4' || 
                    this.patternSelect.value === '4-7-8' ||
                    this.patternSelect.value === 'wim-hof') {
                    this.mouthIcon.classList.add('active');
                } else {
                    this.noseIcon.classList.add('active');
                }
                break;
        }
    }

    updateInstruction(phase, count = '') {
        const instructions = {
            inhale: 'In',
            inHold: 'Hold',
            exhale: 'Out',
            outHold: 'Hold',
            retention: 'Hold',
            recovery: 'Recovery Hold',
            recoveryInhale: 'Deep Inhale'
        };
        
        // For Wim Hof retention and recovery, show only the timer in large format
        if (this.patternSelect.value === 'wim-hof' && (phase === 'retention' || phase === 'recovery' || phase === 'recoveryInhale')) {
            this.instruction.style.fontSize = '4rem';
            this.instruction.textContent = count;
        } else {
            this.instruction.style.fontSize = '';
            this.instruction.textContent = count ? `${instructions[phase]} (${count})` : instructions[phase];
        }
        this.updateBreathingMethod(phase);
    }

    async runPhase(phase, duration) {
        return new Promise(resolve => {
            let timeLeft = duration;
            
            // For Wim Hof retention and recovery, show timer in instruction
            if (this.patternSelect.value === 'wim-hof' && (phase === 'retention' || phase === 'recovery' || phase === 'recoveryInhale')) {
                this.updateInstruction(phase, timeLeft);
                this.timer.textContent = '';
            } else {
                this.timer.textContent = timeLeft;
                this.updateInstruction(phase);
            }
            
            // Remove all animation classes first
            this.flower.classList.remove('inhale', 'exhale', 'hold-expanded', 'hold-contracted');
            
            // Handle flower animation based on phase
            switch(phase) {
                case 'inhale':
                case 'recoveryInhale':
                    this.flower.classList.add('inhale');
                    this.lastPhase = 'inhale';
                    if (this.soundToggle.checked) {
                        this.playTone(396, 0.1); // G4 note
                    }
                    break;
                case 'exhale':
                    this.flower.classList.add('exhale');
                    this.lastPhase = 'exhale';
                    if (this.soundToggle.checked) {
                        this.playTone(264, 0.1); // C4 note
                    }
                    break;
                case 'inHold':
                case 'retention':
                case 'recovery':
                    // If we're holding after an inhale, stay expanded
                    this.flower.classList.add(this.lastPhase === 'inhale' ? 'hold-expanded' : 'hold-contracted');
                    break;
                case 'outHold':
                    // Always contracted for out-hold
                    this.flower.classList.add('hold-contracted');
                    break;
            }
            
            this.phaseTimer = setInterval(() => {
                timeLeft--;
                if (this.patternSelect.value === 'wim-hof' && (phase === 'retention' || phase === 'recovery' || phase === 'recoveryInhale')) {
                    this.updateInstruction(phase, timeLeft);
                } else {
                    this.timer.textContent = timeLeft;
                }
                
                if (timeLeft <= 0) {
                    clearInterval(this.phaseTimer);
                    if (this.oscillator) {
                        this.oscillator.stop();
                    }
                    resolve();
                }
            }, 1000);
        });
    }

    async runBreathingCycle() {
        const pattern = this.getBreathingPattern();
        
        if (pattern.isWimHof) {
            while (this.isRunning && pattern.roundCount < pattern.maxRounds) {
                // 30 power breaths
                for (let i = 0; i < pattern.breathsPerRound && this.isRunning; i++) {
                    this.updateInstruction('inhale', `${i + 1}/${pattern.breathsPerRound}`);
                    await this.runPhase('inhale', pattern.inhale);
                    if (!this.isRunning) break;
                    
                    await this.runPhase('exhale', pattern.exhale);
                    if (!this.isRunning) break;
                }
                
                if (!this.isRunning) break;
                
                // Final exhale and retention
                this.updateInstruction('exhale', 'Final');
                await this.runPhase('exhale', 2);
                if (!this.isRunning) break;
                
                // Retention phase with large timer
                await this.runPhase('retention', pattern.retentionTime);
                if (!this.isRunning) break;
                
                // Recovery breath with 5-second inhale and 15-second hold
                await this.runPhase('recoveryInhale', pattern.recoveryInhale);
                if (!this.isRunning) break;
                await this.runPhase('recovery', pattern.recoveryHold);
                if (!this.isRunning) break;
                
                pattern.roundCount++;
                
                // Short pause between rounds
                if (pattern.roundCount < pattern.maxRounds) {
                    this.updateInstruction('inHold', `Round ${pattern.roundCount + 1}`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
            
            if (this.isRunning) {
                this.stopExercise();
            }
        } else {
            while (this.isRunning) {
                await this.runPhase('inhale', pattern.inhale);
                if (!this.isRunning) break;
                
                if (pattern.inHold) {
                    await this.runPhase('inHold', pattern.inHold);
                    if (!this.isRunning) break;
                }
                
                await this.runPhase('exhale', pattern.exhale);
                if (!this.isRunning) break;
                
                if (pattern.outHold) {
                    await this.runPhase('outHold', pattern.outHold);
                    if (!this.isRunning) break;
                }
            }
        }
    }

    startExercise() {
        this.isRunning = true;
        this.startButton.textContent = 'Stop';
        
        if (this.patternSelect.value !== 'wim-hof') {
            const durationInMinutes = parseInt(this.durationSelect.value);
            this.timeLeft = durationInMinutes * 60;
            
            this.sessionTimer = setInterval(() => {
                this.timeLeft--;
                if (this.timeLeft <= 0) {
                    this.stopExercise();
                }
            }, 1000);
        }
        
        this.runBreathingCycle();
    }

    stopExercise() {
        this.isRunning = false;
        this.startButton.textContent = 'Start Exercise';
        this.instruction.textContent = 'Get Ready';
        this.timer.textContent = '';
        this.flower.classList.remove('inhale', 'exhale', 'hold-expanded', 'hold-contracted');
        this.breathingMethod.classList.remove('show');
        this.lastPhase = null;
        
        if (this.phaseTimer) {
            clearInterval(this.phaseTimer);
        }
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
        }
        if (this.oscillator) {
            this.oscillator.stop();
        }
    }

    toggleExercise() {
        if (this.isRunning) {
            this.stopExercise();
        } else {
            this.startExercise();
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new BreathingExercise();
}); 