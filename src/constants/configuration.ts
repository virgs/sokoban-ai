export const configuration = {
    frameRate: 10,
    spriteSheetKey: 'tiles',
    updateCycleInMs: 250,
    verticalTileSize: 40,
    horizontalTileSize: 40,
    tilemapKey: 'tilemap',
    tileSheetAsset: 'assets/sokoban_tilesheet.png',
    levelAssetPrefix: 'levels/level-',
    layerName: 'Level',
    tilesetName: 'sokoban',
    gameWidth: 1000,
    gameHeight: 750,
    colors: {
        highlight: '#d4fa00',
        background: '#dddddd'
    },
    html: {
        gameScene: {
            key: 'gameSceneKey',
            file: 'assets/html/game-scene.html'
        }
    }

};