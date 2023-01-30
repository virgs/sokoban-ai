import type {Point} from '../math/point';
import type {Tiles} from '../levels/tiles';
import type {Directions} from '../constants/directions';
import type {OrientedTile} from '../levels/standard-sokoban-annotation-tokennizer';

export type AnimateData = {
    spritePosition: Point,
    orientation?: Directions,
    animationPushedBox?: boolean
};

export type GameActorConfig = {
    code: Tiles;
    playable: boolean;
    orientation: Directions;
    tilePosition: Point;
    worldPosition: Point;
    contentAround: OrientedTile[][][]; //3x3 matrix where 1x1 is the center. The other dimension is the tile layer
    scene: Phaser.Scene,
    id: number
};

export interface GameActor {
    getTilePosition(): Point;

    setTilePosition(tilePosition: Point): void;

    getTileCode(): Tiles;

    getId(): number;

    getOrientation(): Directions | undefined;

    isCovered(): boolean;

    cover(tiles: GameActor[]): void;

    animate(data: AnimateData): Promise<any>;
}