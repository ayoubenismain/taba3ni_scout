import * as Phaser from 'phaser';

export default class MissionScene extends Phaser.Scene {
    constructor() {
        super('MissionScene');
    }

    create() {
        const { width, height } = this.scale;

        // Display the new map background
        const bg = this.add.image(0, 0, 'new_map_bg').setOrigin(0, 0);
        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        const bgScale = Math.max(scaleX, scaleY); // Cover screen
        bg.setScale(bgScale);

        // Bounds for movement (based on background size)
        // Set top limit at 12.7% (Y=130/1024) to lock feet to street
        const horizonY = bg.displayHeight * 0.127;
        this.physics.world.setBounds(0, horizonY, bg.displayWidth, bg.displayHeight - horizonY);

        // Characters near the sign (approx. bottom center of the map context)
        const signX = (435 / 1024) * bg.displayWidth;
        const signY = (910 / 1024) * bg.displayHeight;

        // Grandpa (NPC)
        this.grandpa = this.physics.add.sprite(signX + 60, signY, 'grandpa');
        this.grandpa.setScale(0.5).setImmovable(true);

        // Amine (NPC) - Relocated to Left of Lake (X=610, Y=220 on 1024 base)
        const amineX = (610 / 1024) * bg.displayWidth;
        const amineY = (220 / 1024) * bg.displayHeight;
        this.amine = this.physics.add.sprite(amineX, amineY, 'amine_injured');
        this.amine.setScale(0.5).setImmovable(true).setInteractive({ useHandCursor: true });

        this.amine.on('pointerdown', () => this.handleAmineInteraction());

        // Player (Kid)
        this.player = this.physics.add.sprite(signX - 60, signY, 'scout_front');
        this.player.setScale(0.5);
        this.player.setCollideWorldBounds(true);

        // Input Setup
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            z: Phaser.Input.Keyboard.KeyCodes.Z,
            q: Phaser.Input.Keyboard.KeyCodes.Q
        });

        // Mobile Joystick
        this.createJoystick();

        // Dialogue UI (Visual Novel Style)
        this.createDialogueUI();

        // Intro State
        this.introTriggered = false;

        // Mission State
        this.missionPhase = 'FIRST_AID';
        this.firstAidState = {
            waterUsed: false,
            bandageUsed: false
        };

        // Camera Follow
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, bg.displayWidth, bg.displayHeight);
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        // Back UI
        const backBtn = this.add.text(20, 20, 'الخريطة >', {
            fontFamily: '"Noto Kufi Arabic"',
            fontSize: '16px',
            fill: '#ffffff',
            backgroundColor: '#00000088',
            padding: { x: 10, y: 5 }
        }).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(2000);

        backBtn.on('pointerdown', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MapScene');
            });
        });
    }

    createDialogueUI() {
        const { width, height } = this.scale;

        // Positioning the container at the bottom
        this.dialogueContainer = this.add.container(0, height).setScrollFactor(0).setDepth(1500).setAlpha(0);
        this.dialogueActive = false;
        this.choiceActive = false;
        this.dialogueQueue = [];

        // Background Box (Quarter of screen, touching the bottom)
        const boxHeight = height * 0.25;
        const box = this.add.graphics();
        box.fillStyle(0x000000, 0.9);
        box.lineStyle(4, 0x6dc5b1, 1);

        // The box sits from (0, -boxHeight) to (width, 0)
        box.fillRect(0, -boxHeight, width, boxHeight);
        box.strokeRect(0, -boxHeight, width, boxHeight);
        this.dialogueContainer.add(box);

        // Name Box
        const nameBg = this.add.graphics();
        nameBg.fillStyle(0x6dc5b1, 1);
        // Positioned just above the dialogue box
        nameBg.fillRect(20, -boxHeight - 40, 200, 40);
        this.dialogueContainer.add(nameBg);

        this.nameText = this.add.text(120, -boxHeight - 20, 'الاسم', {
            fontFamily: '"Noto Kufi Arabic"',
            fontSize: '18px',
            fill: '#000000'
        }).setOrigin(0.5);
        this.dialogueContainer.add(this.nameText);

        // Portrait Container (Visual Novel Style: Half visible above the name box)
        // Positioned 20px lower than before to ensure 'half' is above and half is submerged in the box
        this.portrait = this.add.image(120, -boxHeight - 20, 'grandpa').setOrigin(0.5, 0.5).setScale(1.4);
        this.dialogueContainer.add(this.portrait);

        this.dialogueText = this.add.text(width - 50, -boxHeight + 40, '', {
            fontFamily: '"Noto Kufi Arabic"',
            fontSize: '22px',
            fill: '#ffffff',
            align: 'right',
            wordWrap: { width: width - 100 }
        }).setOrigin(1, 0);
        this.dialogueContainer.add(this.dialogueText);

        // Click to continue hint
        const hint = this.add.text(width - 20, -20, 'اضغط للمتابعة', {
            fontFamily: '"Noto Kufi Arabic"',
            fontSize: '14px',
            fill: '#6dc5b1'
        }).setOrigin(1, 1);
        this.dialogueContainer.add(hint);

        // Input listeners for advancing
        const advance = () => {
            if (this.dialogueActive && !this.choiceActive) {
                this.nextDialogue();
            }
        };

        this.input.on('pointerdown', advance);
        this.input.keyboard.on('keydown-ENTER', advance);
    }

    startDialogueSequence(sequence) {
        this.dialogueQueue = sequence;
        this.dialogueActive = true;
        this.player.setVelocity(0, 0);
        this.nextDialogue();
    }

    nextDialogue() {
        if (this.dialogueQueue.length === 0) {
            this.hideDialogue();
            return;
        }

        const data = this.dialogueQueue.shift();
        this.nameText.setText(data.name);
        this.dialogueText.setText(data.text);

        // Portrait handling
        if (data.portrait) {
            this.portrait.setTexture(data.portrait);
            this.portrait.setVisible(true);
            // Height of the dialogue box is 25% of screen. Name box is 40px above that.
            // Center the sprite so half is above the name box top edge.
            this.portrait.setY(-this.scale.height * 0.25 - 40);
        } else {
            this.portrait.setVisible(false);
        }

        // Camera Panning Logic
        if (data.camTarget) {
            this.cameras.main.stopFollow();
            let tx = this.player.x;
            let ty = this.player.y;

            if (data.camTarget === 'amine') {
                tx = this.amine.x;
                ty = this.amine.y;
            } else if (data.camTarget === 'grandpa') {
                tx = this.grandpa.x;
                ty = this.grandpa.y;
            }

            this.cameras.main.pan(tx, ty, 1000, 'Power2');
        }

        // Play sound if associated with this line
        if (data.sound === 'slip') {
            this.playSlipSound();
        }

        if (this.dialogueContainer.alpha === 0) {
            this.tweens.add({
                targets: this.dialogueContainer,
                alpha: 1,
                duration: 300,
                ease: 'Power2'
            });
        }
    }

    hideDialogue() {
        this.dialogueActive = false;

        // Pan back to player before resuming follow
        this.cameras.main.pan(this.player.x, this.player.y, 800, 'Power1', false, (cam, progress) => {
            if (progress === 1) {
                cam.startFollow(this.player, true, 0.1, 0.1);
            }
        });

        this.tweens.add({
            targets: this.dialogueContainer,
            alpha: 0,
            duration: 250,
            ease: 'Power2'
        });
    }

    showDialogue(name, text, portraitKey) {
        // Compatibility method for single lines
        this.startDialogueSequence([{ name, text, portrait: portraitKey }]);
    }

    handleAmineInteraction() {
        // Only trigger if no dialogue is active
        if (this.dialogueActive || this.choiceActive) return;

        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.amine.x, this.amine.y);

        if (dist > 150) {
            // Show hint to get closer
            const hint = this.add.text(this.amine.x, this.amine.y - 50, '!اقترب أكثر للمساعدة', {
                fontFamily: '"Noto Kufi Arabic"',
                fontSize: '16px',
                fill: '#ff0000',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5).setDepth(2000);

            this.tweens.add({
                targets: hint,
                y: hint.y - 30,
                alpha: 0,
                duration: 1000,
                onComplete: () => hint.destroy()
            });
            return;
        }

        if (this.missionPhase === 'FIRST_AID') {
            this.showChoiceUI();
        } else if (this.missionPhase === 'DEHYDRATION_PHASE') {
            this.showBackpackMenu();
        }
    }

    showChoiceUI() {
        this.choiceActive = true;
        this.player.setVelocity(0, 0);
        const { width, height } = this.scale;

        this.choiceContainer = this.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(2000);

        // Modal Background
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.9);
        bg.lineStyle(4, 0x6dc5b1, 1);
        bg.fillRoundedRect(-250, -150, 500, 300, 15);
        bg.strokeRoundedRect(-250, -150, 500, 300, 15);
        this.choiceContainer.add(bg);

        // Backpack Icon (Top Left of the bloc)
        const backpackIcon = this.add.image(-220, -120, 'scout_backpack').setScale(0.8).setOrigin(0.5);
        this.choiceContainer.add(backpackIcon);

        // Header Text (Titled as Backpack)
        const title = this.add.text(0, -110, 'حقيبة الظهر', {
            fontFamily: '"Noto Kufi Arabic"',
            fontSize: '20px',
            fill: '#f9dc36'
        }).setOrigin(0.5);
        this.choiceContainer.add(title);

        const subTitle = this.add.text(0, -80, 'شنوا نعملوا الأول؟', {
            fontFamily: '"Noto Kufi Arabic"',
            fontSize: '14px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        this.choiceContainer.add(subTitle);

        // Item 1: Sterilizing Water
        const waterBtn = this.add.container(-120, 20);
        const waterIcon = this.add.image(0, -30, 'water_bottle').setScale(1).setInteractive({ useHandCursor: true });
        const waterLabel = this.add.text(0, 40, 'ماء\nمعقم', {
            fontFamily: '"Noto Kufi Arabic"', fontSize: '16px', fill: '#6dc5b1', align: 'center'
        }).setOrigin(0.5);
        waterBtn.add([waterIcon, waterLabel]);

        waterIcon.on('pointerdown', () => this.handleChoice('water'));
        waterIcon.on('pointerover', () => waterIcon.setScale(1.1));
        waterIcon.on('pointerout', () => waterIcon.setScale(1));

        // Item 2: Bandages
        const bandageBtn = this.add.container(120, 20);
        const bandageIcon = this.add.image(0, -30, 'sterile_bandage').setScale(1).setInteractive({ useHandCursor: true });
        const bandageLabel = this.add.text(0, 40, 'ضمادات\nنظيفة', {
            fontFamily: '"Noto Kufi Arabic"', fontSize: '16px', fill: '#6dc5b1', align: 'center'
        }).setOrigin(0.5);
        bandageBtn.add([bandageIcon, bandageLabel]);

        bandageIcon.on('pointerdown', () => this.handleChoice('bandage'));
        bandageIcon.on('pointerover', () => bandageIcon.setScale(1.1));
        bandageIcon.on('pointerout', () => bandageIcon.setScale(1));

        this.choiceContainer.add([waterBtn, bandageBtn]);

        // Entrance animation
        this.choiceContainer.setScale(0);
        this.tweens.add({
            targets: this.choiceContainer,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
    }

    handleChoice(choice) {
        this.choiceActive = false;
        this.tweens.add({
            targets: this.choiceContainer,
            scale: 0,
            duration: 200,
            onComplete: () => {
                this.choiceContainer.destroy();

                if (choice === 'water') {
                    this.firstAidState.waterUsed = true;
                    this.startDialogueSequence([
                        { name: 'أمين', text: "شكراً... هكا أحسن بارشا...", portrait: 'amine_injured' },
                        { name: 'الجد', text: "برافو. الأول لازم ننظفوا الجرح بالماء قبل ما نديروا حاجة أخرى.", portrait: 'grandpa' }
                    ]);
                } else if (choice === 'bandage') {
                    if (this.firstAidState.waterUsed) {
                        this.firstAidState.bandageUsed = true;
                        this.startDialogueSequence([
                            { name: 'أمين', text: "شكراً... هكا أحسن بزاف...", portrait: 'amine_injured' },
                            { name: 'أمين', text: "يا ربي... راسي كيدور... حاس مانيش بخير...", portrait: 'amine_injured' },
                            { name: 'الجد', text: "يظهر عطشان بزاف. لازم نديوه للظل.", portrait: 'grandpa' }
                        ]);

                        // Displacement after this sequence
                        this.time.delayedCall(100, () => {
                            const checkFinished = setInterval(() => {
                                if (!this.dialogueActive) {
                                    clearInterval(checkFinished);
                                    this.spawnNearTree();
                                }
                            }, 100);
                        });
                    } else {
                        this.showDialogue('الجد', "وقف! ما تلفش قبل ما تنظف. المكروبات راح تتحبس تحت الضماد! السلامة أولاً!", 'grandpa');
                    }
                }
            }
        });
    }

    triggerDehydrationEvent() {
        this.startDialogueSequence([
            { name: 'أمين', text: "شكراً يا صاحبي. ما ننساهالكش", portrait: 'amine_injured' },
            { name: 'أمين', text: "يا ربي... راسي كيدور", portrait: 'amine_injured' },
            { name: 'الجد', text: "يظهر عطشان بزاف", portrait: 'grandpa' }
        ]);

        // Wait for dialogue to finish before spawning
        this.time.delayedCall(100, () => {
            const checkFinished = setInterval(() => {
                if (!this.dialogueActive) {
                    clearInterval(checkFinished);
                    this.spawnNearTree();
                }
            }, 100);
        });
    }

    spawnNearTree() {
        const { width, height } = this.scale;

        // Fade out
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            // New coordinates (240, 491 on 1024 base - closer to the left shadow)
            const treeX = (240 / 1024) * this.cameras.main.getBounds().width;
            const treeY = (495 / 1024) * this.cameras.main.getBounds().height;

            this.player.setPosition(treeX - 40, treeY);
            this.amine.setPosition(treeX + 40, treeY);
            this.grandpa.setPosition(treeX + 100, treeY);

            this.missionPhase = 'DEHYDRATION_PHASE';

            // Fade in
            this.cameras.main.fadeIn(500, 0, 0, 0);
        });
    }

    showBackpackMenu() {
        this.choiceActive = true;
        const { width, height } = this.scale;

        this.backpackContainer = this.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(3000);

        // Modal Background
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.95);
        bg.lineStyle(4, 0x6dc5b1, 1);
        bg.fillRoundedRect(-250, -150, 500, 300, 15);
        bg.strokeRoundedRect(-250, -150, 500, 300, 15);
        this.backpackContainer.add(bg);

        // Backpack Icon (Top Left of the bloc)
        const backpackIcon = this.add.image(-220, -120, 'scout_backpack').setScale(0.8).setOrigin(0.5);
        this.backpackContainer.add(backpackIcon);

        // Title
        const title = this.add.text(0, -100, 'حقيبة الظهر', {
            fontFamily: '"Noto Kufi Arabic"',
            fontSize: '20px',
            fill: '#f9dc36'
        }).setOrigin(0.5);
        this.backpackContainer.add(title);

        // Hit area for the bottle to make it very easy to click
        const waterHitArea = this.add.rectangle(0, 40, 200, 200, 0xffffff, 0).setInteractive({ useHandCursor: true });
        
        // Water Bottle Option - added directly to main container (no nested container)
        const waterIcon = this.add.image(0, 0, 'water_bottle').setScale(2);
        const waterLabel = this.add.text(0, 80, 'أعطيه الماء', {
            fontFamily: '"Noto Kufi Arabic"', fontSize: '20px', fill: '#6dc5b1'
        }).setOrigin(0.5);
        
        this.backpackContainer.add([waterHitArea, waterIcon, waterLabel]);

        const triggerAchievement = () => {
            if (!this.choiceActive) return;
            this.choiceActive = false;
            this.tweens.add({
                targets: this.backpackContainer,
                scale: 0,
                duration: 200,
                onComplete: () => {
                    this.backpackContainer.destroy();
                    this.showAchievement();
                }
            });
        };

        waterHitArea.on('pointerdown', triggerAchievement);
        waterIcon.setInteractive({ useHandCursor: true }).on('pointerdown', triggerAchievement);

        // Entrance animation
        this.backpackContainer.setScale(0);
        this.tweens.add({
            targets: this.backpackContainer,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
    }

    showAchievement() {
        const { width, height } = this.scale;

        // Lock input during achievement display
        this.choiceActive = true;
        this.player.setVelocity(0, 0);

        // Full-screen dark overlay
        const overlay = this.add.graphics().setScrollFactor(0).setDepth(2500);
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, width, height);
        overlay.setAlpha(0);

        // Achievement container
        const achContainer = this.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(2600);

        // Glow circle behind the medal
        const glow = this.add.graphics();
        glow.fillStyle(0xf9dc36, 0.15);
        glow.fillCircle(0, -30, 120);
        glow.fillStyle(0xf9dc36, 0.08);
        glow.fillCircle(0, -30, 160);
        achContainer.add(glow);

        // Medal image
        const medal = this.add.image(0, -30, 'medal').setScale(0.4);
        achContainer.add(medal);

        // "New Achievement!" header
        const headerText = this.add.text(0, 70, '🏆 إنجاز جديد!', {
            fontFamily: '"Noto Kufi Arabic"',
            fontSize: '28px',
            fill: '#f9dc36',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        achContainer.add(headerText);

        // Achievement name
        const achName = this.add.text(0, 110, 'مسعف صغير', {
            fontFamily: '"Noto Kufi Arabic"',
            fontSize: '20px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        achContainer.add(achName);

        // Description
        const achDesc = this.add.text(0, 145, 'ساعدت صاحبك وأنقذته!', {
            fontFamily: '"Noto Kufi Arabic"',
            fontSize: '14px',
            fill: '#6dc5b1'
        }).setOrigin(0.5);
        achContainer.add(achDesc);

        // Start invisible and scaled down
        achContainer.setScale(0).setAlpha(0);

        // Animate overlay in
        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 300
        });

        // Animate achievement popup in with bounce
        this.tweens.add({
            targets: achContainer,
            scale: 1,
            alpha: 1,
            duration: 600,
            ease: 'Back.easeOut',
            delay: 200
        });

        // Medal shine rotation
        this.tweens.add({
            targets: medal,
            angle: { from: -5, to: 5 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });

        // Pulsing glow
        this.tweens.add({
            targets: glow,
            alpha: { from: 1, to: 0.5 },
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // Play achievement sound
        this.playAchievementSound();

        // Sparkle particles around the medal
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const sparkle = this.add.text(
                Math.cos(angle) * 100,
                -30 + Math.sin(angle) * 100,
                '✦', { fontSize: '20px', fill: '#f9dc36' }
            ).setOrigin(0.5);
            achContainer.add(sparkle);

            this.tweens.add({
                targets: sparkle,
                alpha: { from: 1, to: 0.2 },
                scale: { from: 1, to: 0.5 },
                duration: 600,
                yoyo: true,
                repeat: -1,
                delay: i * 100
            });
        }

        // Auto-dismiss after 4 seconds
        this.time.delayedCall(4000, () => {
            this.tweens.add({
                targets: [achContainer, overlay],
                alpha: 0,
                scale: 0.8,
                duration: 400,
                onComplete: () => {
                    achContainer.destroy();
                    overlay.destroy();
                    this.choiceActive = false;
                }
            });
        });

        // Also allow click to dismiss (after a delay to prevent instant dismiss)
        this.time.delayedCall(1000, () => {
            this.input.once('pointerdown', () => {
                this.tweens.killTweensOf(achContainer);
                this.tweens.killTweensOf(overlay);
                this.tweens.killTweensOf(medal);
                this.tweens.killTweensOf(glow);
                this.tweens.add({
                    targets: [achContainer, overlay],
                    alpha: 0,
                    duration: 300,
                    onComplete: () => {
                        achContainer.destroy();
                        overlay.destroy();
                        this.choiceActive = false;
                    }
                });
            });
        });
    }

    playAchievementSound() {
        if (!this.sound.context) return;
        const ctx = this.sound.context;
        if (ctx.state === 'suspended') ctx.resume();

        // Triumphant ascending chime
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
            gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.4);
        });
    }

    playSlipSound() {
        if (!this.sound.context) return;
        const ctx = this.sound.context;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sawtooth';
        // A "whoop" and then a "thud" noise
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        osc.start();
        osc.stop(ctx.currentTime + 0.4);
    }


    createJoystick() {
        const { width, height } = this.scale;
        const x = 120;
        const y = height - 120;
        const radius = 60;

        this.joystickBase = this.add.circle(x, y, radius, 0x888888, 0.5)
            .setScrollFactor(0)
            .setDepth(100);
        this.joystickThumb = this.add.circle(x, y, radius / 2, 0xcccccc, 0.8)
            .setScrollFactor(0)
            .setDepth(101);

        this.joyState = { x: 0, y: 0, active: false };

        this.input.on('pointerdown', (pointer) => {
            if (pointer.x < width / 2 && pointer.y > height / 2) {
                this.joyState.active = true;
                this.updateJoystick(pointer);
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (this.joyState.active) {
                this.updateJoystick(pointer);
            }
        });

        this.input.on('pointerup', () => {
            this.joyState.active = false;
            this.joyState.x = 0;
            this.joyState.y = 0;
            this.joystickThumb.setPosition(this.joystickBase.x, this.joystickBase.y);
        });
    }

    updateJoystick(pointer) {
        const base = this.joystickBase;
        const dist = Phaser.Math.Distance.Between(base.x, base.y, pointer.x, pointer.y);
        const angle = Phaser.Math.Angle.Between(base.x, base.y, pointer.x, pointer.y);
        const radius = base.radius;

        const moveDist = Math.min(dist, radius);
        const tx = base.x + Math.cos(angle) * moveDist;
        const ty = base.y + Math.sin(angle) * moveDist;

        this.joystickThumb.setPosition(tx, ty);

        this.joyState.x = Math.cos(angle) * (moveDist / radius);
        this.joyState.y = Math.sin(angle) * (moveDist / radius);
    }

    update() {
        if (this.dialogueActive || this.choiceActive) {
            this.player.setVelocity(0, 0);
            return;
        }

        const speed = 200;
        let vx = 0;
        let vy = 0;

        // Keyboard Input (WASD or ZQSD)
        if (this.keys.up.isDown || this.keys.z.isDown) vy = -1;
        else if (this.keys.down.isDown) vy = 1;

        if (this.keys.left.isDown || this.keys.q.isDown) vx = -1;
        else if (this.keys.right.isDown) vx = 1;

        // Joystick Input
        if (this.joyState.active) {
            vx = this.joyState.x;
            vy = this.joyState.y;
        }

        this.player.setVelocity(vx * speed, vy * speed);

        // Trigger dialogue on first step
        if (!this.introTriggered && (vx !== 0 || vy !== 0)) {
            this.introTriggered = true;
            this.startDialogueSequence([
                {
                    name: 'الجد',
                    text: "دير بالك وين تحط رجليك يا ولدي. الطحلب في بني مطير يخلي الحجر يزلق كيف الجليد. الرطوبة هنا تدخل في عضامك.",
                    portrait: 'grandpa',
                    camTarget: 'grandpa'
                },
                {
                    name: 'أمين',
                    text: "[صوت انزلاق]",
                    portrait: 'amine_injured',
                    sound: 'slip',
                    camTarget: 'amine'
                },
                {
                    name: 'أمين',
                    text: "زلقت على الطحلب! ركبتي تجرحات و بديت نرتعش. الضباب كثيف بزاف...",
                    portrait: 'amine_injured'
                }
            ]);
        }

        // Animation / Direction flipping
        if (vx < 0) {
            this.player.setTexture('scout_side');
            this.player.setFlipX(false); // FIXED: Swap flip logic
        } else if (vx > 0) {
            this.player.setTexture('scout_side');
            this.player.setFlipX(true); // FIXED: Swap flip logic
        } else if (vy !== 0) {
            this.player.setTexture(vy < 0 ? 'scout_back' : 'scout_front');
            this.player.setFlipX(false);
        }
    }
}
