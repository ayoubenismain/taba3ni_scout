import * as Phaser from 'phaser';

export default class SelectionScene extends Phaser.Scene {
    constructor() {
        super('SelectionScene');
    }

    create() {
        const { width, height } = this.scale;

        // Background
        const bg = this.add.image(width / 2, height / 2, 'space_bg');
        bg.displayWidth = width;
        bg.displayHeight = height;
        bg.setTint(0x333333); // Dim the background

        this.add.text(width / 2, Math.max(80, height * 0.15), 'SELECT YOUR PIONEER', {
            fontFamily: '"Press Start 2P"',
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Square A: Girl
        const girlIcon = this.add.image(width / 2 - 200, height / 2, 'icon_girl').setInteractive({ useHandCursor: true });
        girlIcon.setScale(0.4);
        const girlOutline = this.add.graphics();
        this.add.text(width / 2 - 200, height / 2 + 160, 'GIRL', { fontFamily: '"Press Start 2P"', fontSize: '18px', fill: '#ffffff' }).setOrigin(0.5);

        // Square B: Boy
        const boyIcon = this.add.image(width / 2 + 200, height / 2, 'icon_boy').setInteractive({ useHandCursor: true });
        boyIcon.setScale(0.4);
        const boyOutline = this.add.graphics();
        this.add.text(width / 2 + 200, height / 2 + 160, 'BOY', { fontFamily: '"Press Start 2P"', fontSize: '18px', fill: '#ffffff' }).setOrigin(0.5);

        let selected = null;
        let beginBtn = null;

        const selectCharacter = (type, iconRef, otherOutline, thisOutline) => {
            selected = type;
            
            // Highlight
            otherOutline.clear();
            thisOutline.clear();
            thisOutline.lineStyle(6, 0xffff00, 1);
            thisOutline.strokeRect(iconRef.x - (iconRef.displayWidth/2) - 10, iconRef.y - (iconRef.displayHeight/2) - 10, iconRef.displayWidth + 20, iconRef.displayHeight + 20);

            if (!beginBtn) {
                // Show begin button
                beginBtn = this.add.container(width / 2, height - Math.max(80, height * 0.15));
                
                const btnBg = this.add.graphics();
                btnBg.fillStyle(0x4a81ba, 1); // Blue
                btnBg.fillRect(-150, -25, 300, 50);
                
                const btnText = this.add.text(0, 0, 'BEGIN ADVENTURE', { fontFamily: '"Press Start 2P"', fontSize: '16px', fill: '#ffffff' }).setOrigin(0.5);
                
                beginBtn.add([btnBg, btnText]);
                beginBtn.setSize(300, 50);
                beginBtn.setInteractive({ useHandCursor: true });
                
                beginBtn.on('pointerover', () => {
                    beginBtn.setScale(1.05);
                    this.playHoverSound();
                });
                beginBtn.on('pointerout', () => beginBtn.setScale(1));
                
                beginBtn.on('pointerdown', () => {
                    this.playClickSound();
                    this.registry.set('playerGender', selected);
                    this.scene.start('NameScene');
                });
            }
        };

        const applyHover = (obj, baseScale, hoverScale) => {
            obj.on('pointerover', () => {
                obj.setScale(hoverScale);
                this.playHoverSound();
            });
            obj.on('pointerout', () => obj.setScale(baseScale));
        };

        applyHover(girlIcon, 0.4, 0.45);
        applyHover(boyIcon, 0.4, 0.45);

        girlIcon.on('pointerdown', () => { this.playClickSound(); selectCharacter('girl', girlIcon, boyOutline, girlOutline); });
        boyIcon.on('pointerdown', () => { this.playClickSound(); selectCharacter('boy', boyIcon, girlOutline, boyOutline); });
    }

    playHoverSound() {
        if (!this.sound.context) return;
        const ctx = this.sound.context;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
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
