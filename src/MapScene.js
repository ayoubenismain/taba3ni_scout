import * as Phaser from 'phaser';

export default class MapScene extends Phaser.Scene {
    constructor() {
        super('MapScene');
    }

    create() {
        const { width, height } = this.scale;
        const gender = this.registry.get('playerGender');

        // Load map background, uniformly scale it to cover screen without distortion
        const map = this.add.image(width / 2, height / 2, 'map_bg');
        const scaleX = width / map.width;
        const scaleY = height / map.height;
        map.setScale(Math.min(scaleX, scaleY));
        
        // Map coordinate standard zigzag progression
        const levelsInfo = [
            { id: 1, x: 0.70, y: 0.20, status: 'unlocked' },
            { id: 2, x: 0.54, y: 0.26, status: 'locked' },
            { id: 3, x: 0.65, y: 0.49, status: 'locked' },
            { id: 4, x: 0.44, y: 0.58, status: 'locked' },
            { id: 5, x: 0.23, y: 0.75, status: 'locked' }
        ];

        const mapLeft = (width / 2) - (map.displayWidth / 2);
        const mapTop = (height / 2) - (map.displayHeight / 2);

        // Draw dotted lines connecting the levels
        const graphics = this.add.graphics();
        graphics.lineStyle(4, 0xffffff, 0.8);
        
        for (let i = 0; i < levelsInfo.length - 1; i++) {
            const p1 = levelsInfo[i];
            const p2 = levelsInfo[i+1];
            
            const startX = mapLeft + (p1.x * map.displayWidth);
            const startY = mapTop + (p1.y * map.displayHeight);
            const endX = mapLeft + (p2.x * map.displayWidth);
            const endY = mapTop + (p2.y * map.displayHeight);

            const line = new Phaser.Geom.Line(startX, startY, endX, endY);
            const points = line.getPoints(20);
            points.forEach(point => {
                graphics.fillStyle(0xffffff, 0.6);
                graphics.fillCircle(point.x, point.y, 4);
            });
        }

        // Render each node
        levelsInfo.forEach((lvl) => {
            const nodeX = mapLeft + (lvl.x * map.displayWidth);
            const nodeY = mapTop + (lvl.y * map.displayHeight);
            
            const isUnlocked = lvl.status === 'unlocked';
            
            // The base circular button (Yellow for unlocked, dark grey for locked)
            const nodeBtn = this.add.circle(nodeX, nodeY, 30, isUnlocked ? 0xffcc00 : 0x555555)
                                 .setStrokeStyle(4, isUnlocked ? 0xffffff : 0x222222)
                                 .setInteractive({ useHandCursor: isUnlocked });
            
            // Node Text / Icon colored yellow for locks
            this.add.text(nodeX, nodeY, isUnlocked ? lvl.id.toString() : '🔒', {
                fontFamily: '"Press Start 2P"',
                fontSize: isUnlocked ? '24px' : '28px',
                fill: isUnlocked ? '#000000' : '#ffcc00'
            }).setOrigin(0.5);

            if (lvl.status === 'unlocked') {
                // Pulse animation
                this.tweens.add({
                    targets: nodeBtn,
                    scale: 1.1,
                    yoyo: true,
                    repeat: -1,
                    duration: 600
                });

                // Attach player avatar directly over the node
                const playerImage = gender === 'girl' ? 'map_icon_girl' : 'map_icon_boy';
                const playerIcon = this.add.image(nodeX, nodeY - 60, playerImage);
                playerIcon.setScale(0.18); // Slightly increased size due to background removal
                
                // Small bounce for the player icon
                this.tweens.add({
                    targets: playerIcon,
                    y: nodeY - 75,
                    yoyo: true,
                    repeat: -1,
                    duration: 1000,
                    ease: 'Sine.inOut'
                });

                // Add click interaction
                nodeBtn.on('pointerdown', () => {
                    this.playClickSound();
                    console.log('Entering Level ' + lvl.id);
                    
                    // Disable further input
                    this.input.enabled = false;
                    const uiOverlay = document.getElementById('ui-overlay');
                    if (uiOverlay) {
                        uiOverlay.classList.add('hidden');
                    }
                    
                    // Zoom towards the clicked node
                    this.cameras.main.pan(nodeX, nodeY, 1500, 'Power2');
                    this.cameras.main.zoomTo(3, 1500, 'Power2');
                    
                    // Add a fade out that starts slightly after the zoom begins
                    this.time.delayedCall(500, () => {
                        this.cameras.main.fadeOut(1000, 0, 0, 0);
                        this.cameras.main.once('camerafadeoutcomplete', () => {
                            this.scene.start('MissionScene');
                        });
                    });
                });
            } else {
                // Click interaction for locked level
                nodeBtn.on('pointerdown', () => {
                    this.playErrorSound();
                });
            }
        });

        // Enable HTML UI Overlay
        document.getElementById('ui-overlay').classList.remove('hidden');
        
        // Update HTML UI Profile Image and Name
        const profileImg = document.getElementById('hud-profile-img');
        if(profileImg) {
            profileImg.src = gender === 'girl' ? '/assets/icon_girl_1776565676377.png' : '/assets/icon_boy_1776565706273.png';
        }
        
        const nameEl = document.getElementById('hud-player-name');
        if(nameEl) {
            nameEl.innerText = this.registry.get('playerName') || '\u0643\u0634\u0627\u0641';
        }

        this.playStartSound();

        // The map perfectly fills the screen without any zoom, remaining completely flat
        this.cameras.main.setBounds(0, 0, width, height);
    }

    playStartSound() {
        if (!this.sound.context) return;
        const ctx = this.sound.context;
        if (ctx.state === 'suspended') ctx.resume();
        
        // Smooth start chime instead of aggressive arpeggio
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.15); // C6
        
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    }

    playErrorSound() {
        if (!this.sound.context) return;
        const ctx = this.sound.context;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.1);
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
