import Phaser from 'phaser';
import { BootScene } from '@/scenes/BootScene';
import { MainMenuScene } from '@/scenes/MainMenuScene';
import { LobbyScene } from '@/scenes/LobbyScene';
import { Phase1Scene } from '@/scenes/Phase1Scene';
import { Phase2Scene } from '@/scenes/Phase2Scene';
import { Phase3Scene } from '@/scenes/Phase3Scene';
import { VictoryScene } from '@/scenes/VictoryScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    MainMenuScene,
    LobbyScene,
    Phase1Scene,
    Phase2Scene,
    Phase3Scene,
    VictoryScene,
  ],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  input: {
    activePointers: 3, // Support multi-touch
  },
};

const game = new Phaser.Game(config);

// Handle window resize
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

export default game;
