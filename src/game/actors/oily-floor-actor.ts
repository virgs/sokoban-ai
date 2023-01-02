import type {Point} from '@/game/math/point';
import type Phaser from 'phaser';
import {Tiles} from '@/game/tiles/tiles';
import type {GameActor} from '@/game/actors/game-actor';
import type {Directions} from '@/game/constants/directions';

export class OilyFloorActor implements GameActor {
    private readonly scene: Phaser.Scene;
    private readonly tilePosition: Point;
    private readonly sprite: Phaser.GameObjects.Sprite;
    private readonly id: number;
    private covered: boolean;

    constructor(config: { tilePosition: Point; sprite: Phaser.GameObjects.Sprite; scene: Phaser.Scene, id: number }) {
        this.id = config.id;
        this.scene = config.scene;
        this.tilePosition = config.tilePosition;
        this.sprite = config.sprite;
        this.covered = false;
    }

    public isCovered(): boolean {
        return this.covered;
    }

    public onUncover(): void {
        this.covered = false;
    }

    public onCover(): void {
        this.covered = true;
    }

    public getId(): number {
        return this.id;
    }

    public getSprite(): Phaser.GameObjects.Sprite {
        return this.sprite;
    }

    public getTileCode(): Tiles {
        return Tiles.spring;
    }

    public getTilePosition(): Point {
        return this.tilePosition;
    }

    public getOrientation(): Directions | undefined {
        return undefined;
    }

}
