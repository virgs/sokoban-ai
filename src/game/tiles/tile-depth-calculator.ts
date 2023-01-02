import {Tiles} from '@/game/tiles/tiles';

export class TileDepthCalculator {

    public calculate(code: Tiles, y: number): number {
        let modifier = 10;
        switch (code) {
            case Tiles.floor:
                return -100000;
            case Tiles.target:
                return -90000;
            case Tiles.oily:
                return -80000;
        }
        return (y * 100) + modifier;
    };

}