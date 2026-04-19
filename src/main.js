import * as Phaser from 'phaser';

import BootScene from './BootScene.js';
import LoadScene from './LoadScene.js';
import SelectionScene from './SelectionScene.js';
import NameScene from './NameScene.js';
import MapScene from './MapScene.js';
import MissionScene from './MissionScene.js';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    pixelArt: true, // Prevents blurring
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [BootScene, LoadScene, SelectionScene, NameScene, MapScene, MissionScene]
};

const game = new Phaser.Game(config);
