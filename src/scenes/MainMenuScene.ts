import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Title
    const title = this.add.text(width / 2, height * 0.2, 'WORLD CONQUER', {
      fontFamily: 'Arial Black',
      fontSize: '48px',
      color: '#4287f5',
      stroke: '#000000',
      strokeThickness: 4,
    });
    title.setOrigin(0.5, 0.5);

    // Subtitle
    const subtitle = this.add.text(width / 2, height * 0.28, 'Expand. Build. Conquer.', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#aaaacc',
    });
    subtitle.setOrigin(0.5, 0.5);

    // Menu buttons
    const buttonStyle = {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#4287f5',
      padding: { x: 40, y: 12 },
    };

    const hoverStyle = { color: '#ffffff', backgroundColor: '#5a9cf5' };
    const normalStyle = { color: '#ffffff', backgroundColor: '#4287f5' };

    // New Game
    const newGameBtn = this.add.text(width / 2, height * 0.45, 'New Game', buttonStyle);
    newGameBtn.setOrigin(0.5, 0.5);
    newGameBtn.setInteractive({ useHandCursor: true });
    newGameBtn.on('pointerover', () => newGameBtn.setStyle(hoverStyle));
    newGameBtn.on('pointerout', () => newGameBtn.setStyle(normalStyle));
    newGameBtn.on('pointerdown', () => {
      this.scene.start('LobbyScene');
    });

    // Load Game
    const loadGameBtn = this.add.text(width / 2, height * 0.55, 'Load Game', buttonStyle);
    loadGameBtn.setOrigin(0.5, 0.5);
    loadGameBtn.setInteractive({ useHandCursor: true });
    loadGameBtn.on('pointerover', () => loadGameBtn.setStyle(hoverStyle));
    loadGameBtn.on('pointerout', () => loadGameBtn.setStyle(normalStyle));
    loadGameBtn.on('pointerdown', () => {
      // TODO: Open save/load menu
      console.log('Load Game - not yet implemented');
    });

    // Settings
    const settingsBtn = this.add.text(width / 2, height * 0.65, 'Settings', buttonStyle);
    settingsBtn.setOrigin(0.5, 0.5);
    settingsBtn.setInteractive({ useHandCursor: true });
    settingsBtn.on('pointerover', () => settingsBtn.setStyle(hoverStyle));
    settingsBtn.on('pointerout', () => settingsBtn.setStyle(normalStyle));
    settingsBtn.on('pointerdown', () => {
      // TODO: Open settings menu
      console.log('Settings - not yet implemented');
    });

    // Version
    this.add.text(10, height - 25, 'v0.1.0 - Pre-Alpha', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#555577',
    });
  }
}
