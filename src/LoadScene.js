import * as Phaser from 'phaser';

export default class LoadScene extends Phaser.Scene {
    constructor() {
        super('LoadScene');
    }

    preload() {
        // Load the rest of the game assets here
        this.load.image('icon_girl', '/assets/icon_girl_1776565676377.png');
        this.load.image('icon_boy', '/assets/icon_boy_1776565706273.png');
        
        // Map avatars without backgrounds
        this.load.image('map_icon_girl', '/assets/girl_without_bg.png');
        this.load.image('map_icon_boy', '/assets/boy_wihout_bg.png');
        this.load.image('map_bg', '/assets/map_this.png');
        this.load.image('new_map_bg', '/assets/new_map_bg.png');
    }

    create() {
        const { width, height } = this.scale;

        // Starry Background
        const bg = this.add.image(width / 2, height / 2, 'space_bg');
        // Scale it if it is smaller than the screen
        bg.displayWidth = width;
        bg.displayHeight = height;

        // Add the Title Text
        const titleText = this.add.text(width / 2, height / 2 - 100, 'SCOUT RULES', {
            fontFamily: '"Press Start 2P"',
            fontSize: '72px',
            fill: '#f9dc36',
            align: 'center'
        }).setOrigin(0.5);
        titleText.setStroke('#3e3e3e', 8);
        titleText.setShadow(6, 6, '#000000', 0, true, false);

        // Add "Glitch" or Shimmer effect using a quick tween
        this.tweens.add({
            targets: titleText,
            alpha: { from: 0.7, to: 1 },
            duration: 100,
            yoyo: true,
            repeat: 5,
        });

        // Add a pixelated progress bar
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 200, height / 2 + 100, 400, 30);
        
        // Simulate loading time (2 seconds)
        let percent = 0;
        this.time.addEvent({
            delay: 40,
            repeat: 49, // 50 * 40ms = 2000ms
            callback: () => {
                percent += 0.02;
                progressBar.clear();
                progressBar.fillStyle(0x6dc5b1, 1);
                progressBar.fillRect(width / 2 - 197, height / 2 + 103, 394 * percent, 24);
                
                if (percent >= 1) {
                    this.time.delayedCall(200, () => {
                        this.showMenu();
                    });
                }
            }
        });
    }

    showMenu() {
        const { width, height } = this.scale;
        // Emulate the "Pixels" reference with "START"
        const playBtn = this.createButton(width / 2, height / 2 + 180, '#f9dc36', '#3e3e3e', 'START');
        
        playBtn.setInteractive({ useHandCursor: true });
        
        playBtn.on('pointerover', () => {
            playBtn.setScale(1.05);
            this.playHoverSound();
        });
        playBtn.on('pointerout', () => playBtn.setScale(1));
        playBtn.on('pointerdown', () => {
             this.playClickSound();
             this.time.delayedCall(200, () => {
                  this.scene.start('SelectionScene');
             });
        });
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

    createButton(x, y, bgColor, textColor, textContent) {
        const container = this.add.container(x, y);

        // Graphics for a simple retro button background
        const bg = this.add.graphics();
        bg.fillStyle(Phaser.Display.Color.HexStringToColor(bgColor).color, 1);
        bg.fillRect(-150, -25, 300, 50); // width 300, height 50
        container.add(bg);

        // Text inside the button
        const text = this.add.text(0, 0, textContent, {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            fill: textColor
        }).setOrigin(0.5, 0.5);
        container.add(text);

        // Required to make container interactive based on background bounds
        container.setSize(300, 50);

        return container;
    }
}
