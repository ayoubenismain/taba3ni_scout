import * as Phaser from 'phaser';

export default class MissionScene extends Phaser.Scene {
    constructor() {
        super('MissionScene');
    }

    create() {
        const { width, height } = this.scale;

        // Display the new map background
        const bg = this.add.image(width / 2, height / 2, 'new_map_bg');
        // Uniformly scale to cover screen
        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        bg.setScale(Math.min(scaleX, scaleY));
        
        bg.alpha = 1;
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        // Add a back button for testing or logic
        const backBtn = this.add.text(40, 40, '< BACK', {
            fontFamily: '"Press Start 2P"',
            fontSize: '24px',
            fill: '#ffffff'
        }).setInteractive({ useHandCursor: true });

        backBtn.on('pointerdown', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                 this.scene.start('MapScene');
            });
        });
    }
}
