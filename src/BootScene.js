import * as Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Load basic assets needed for the LoadScene 
        this.load.image('logo', '/assets/game_logo_1776565458822.png');
        this.load.image('space_bg', '/assets/space_bg_1776565399787.png');
        
        // Also pre-load fonts if needed using a plugin or just wait since we loaded via CSS
    }

    create() {
        this.scene.start('LoadScene');
    }
}
