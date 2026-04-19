import * as Phaser from 'phaser';

export default class NameScene extends Phaser.Scene {
    constructor() {
        super('NameScene');
    }

    create() {
        const { width, height } = this.scale;

        // Background
        const bg = this.add.image(width / 2, height / 2, 'space_bg');
        bg.displayWidth = width;
        bg.displayHeight = height;
        bg.setTint(0x222222);

        // Show HTML Input Overlay
        const overlay = document.getElementById('name-input-overlay');
        overlay.classList.remove('hidden');
        const inputField = document.getElementById('player-name-input');
        inputField.focus();
        
        document.getElementById('submit-name-btn').onclick = () => {
            this.playClickSound();
            const name = inputField.value.trim() || '\u0643\u0634\u0627\u0641';
            this.registry.set('playerName', name);
            overlay.classList.add('hidden');
            
            // Show Welcome text and "Loading" animation
            this.add.text(width / 2, height / 2 - 50, `أهلاً يا ${name}!`, {
                fontFamily: '"Noto Kufi Arabic"',
                fontSize: '32px',
                fill: '#ffcc00'
            }).setOrigin(0.5);
            
            const loadText = this.add.text(width / 2, height / 2 + 50, 'جاري تحضير الخريطة...', {
                fontFamily: '"Noto Kufi Arabic"',
                fontSize: '18px',
                fill: '#ffffff'
            }).setOrigin(0.5);
            
            this.tweens.add({
                targets: loadText,
                alpha: 0,
                duration: 400,
                ease: 'Power2',
                yoyo: true,
                repeat: -1
            });

            this.time.delayedCall(2500, () => {
                this.scene.start('MapScene');
            });
        };
    }

    playClickSound() {
        if (!this.sound.context) return;
        const ctx = this.sound.context;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    }
}
