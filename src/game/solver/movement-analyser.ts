import {Point} from '@/game/math/point';
import {Tiles} from '@/game/tiles/tiles';
import type {DistanceCalculator} from '@/game/math/distance-calculator';
import type {StaticMap} from '@/game/tiles/standard-sokoban-annotation-translator';
import type {Movement, MovementCoordinatorOutput} from './movement-coordinator';
import {Directions, getOpositeDirectionOf, rotateDirectionClockwise} from '@/game/constants/directions';

export type MovementAnalysis = {
    events: MovementEvents[],
    boxesMoved: Movement[],
    shortestDistanceFromEveryBoxToTheClosestTarget: number,
    isDeadLocked: boolean
}

export enum MovementEvents {
    HERO_MOVED,
    BOX_MOVED,
    HERO_MOVED_BOX_ONTO_TARGET,
    HERO_MOVED_BOX_OUT_OF_TARGET,
    BOX_MOVED_ONTO_TARGET,
    BOX_MOVED_OUT_OF_TARGET
}

type SegmentAnalysis = { differentBoxes: number; empties: number; targets: number };

export class MovementAnalyser {
    private readonly targets: Point[];
    private readonly distanceCalculator: DistanceCalculator;
    private readonly staticMap: StaticMap;

    public constructor(data: {
        map: StaticMap,
        distanceCalculator: DistanceCalculator
    }) {
        this.staticMap = data.map;
        this.distanceCalculator = data.distanceCalculator;
        this.targets = [];
        for (let y = 0; y < data.map.height; ++y) {
            for (let x = 0; x < data.map.width; ++x) {
                if (data.map.tiles[y][x].code === Tiles.target) {
                    this.targets.push(new Point(x, y));
                }
            }
        }
    }

    public analyse(movement: MovementCoordinatorOutput): MovementAnalysis {
        const events = this.checkEvents(movement);
        let isDeadLocked = events.boxesMoved
            .some(movedBox => this.isDeadLocked(movedBox, movement.boxes));
        return {
            shortestDistanceFromEveryBoxToTheClosestTarget: this.sumOfEveryBoxToTheClosestTarget(movement),
            ...events,
            isDeadLocked
        };
    }

    private checkEvents(movement: MovementCoordinatorOutput) {
        const events: MovementEvents[] = [];
        if (movement.hero.currentPosition.isDifferentOf(movement.hero.previousPosition)) {
            events.push(MovementEvents.HERO_MOVED);
        }
        const boxesMoved = movement.boxes
            .filter(box => box.previousPosition.isDifferentOf(box.currentPosition));

        boxesMoved
            .forEach(_ => events.push(MovementEvents.BOX_MOVED));

        boxesMoved
            .filter(box => box.isCurrentlyOnTarget)
            .forEach(_ => events.push(MovementEvents.BOX_MOVED_ONTO_TARGET));
        boxesMoved
            .filter(box => !box.isCurrentlyOnTarget && movement.hero.isCurrentlyOnTarget)
            .forEach(_ => events.push(MovementEvents.BOX_MOVED_OUT_OF_TARGET));

        boxesMoved
            .filter(box => movement.hero.currentPosition.isEqualTo(box.previousPosition) &&
                movement.hero.direction === box.direction)
            .find(box => {
                if (!box.isCurrentlyOnTarget && movement.hero.isCurrentlyOnTarget) {
                    events.push(MovementEvents.HERO_MOVED_BOX_OUT_OF_TARGET);
                } else if (box.isCurrentlyOnTarget) {
                    events.push(MovementEvents.HERO_MOVED_BOX_ONTO_TARGET);
                }
            });
        return {events, boxesMoved};
    }

    private sumOfEveryBoxToTheClosestTarget(movement: MovementCoordinatorOutput): number {
        return movement.boxes
            .reduce((acc, box) => {
                const shortestDistanceToAnyTarget: number = this.targets
                    .reduce((acc, target) => Math.min(this.distanceCalculator.distance(target, box.currentPosition), acc), Infinity);
                return acc + shortestDistanceToAnyTarget;
            }, 0);
    }

    //TODO create deadlock detection class
    private isDeadLocked(movedBox: Movement, boxes: Movement[]): boolean {
        const direction = movedBox.direction!;
        const nextTilePosition = movedBox.currentPosition.calculateOffset(direction);
        if (this.staticMap.tiles[nextTilePosition.y][nextTilePosition.x].code === Tiles.wall) {
            if (this.wallAheadCheck(direction, movedBox, nextTilePosition, boxes)) {
                return true;
            }

            if (!movedBox.isCurrentlyOnTarget) {
                return this.checkTrappedBoxInCorner(movedBox, direction);
            }

        }
        return false;
    }

    private wallAheadCheck(direction: Directions, movedBox: Movement, nextTilePosition: Point, boxes: Movement[]) {
        let segment: SegmentAnalysis;
        if (direction === Directions.DOWN || direction === Directions.UP) {
            segment = this.verticalLineSegment(movedBox.currentPosition, nextTilePosition, boxes);
        } else {
            segment = this.horizontalLineSegment(movedBox.currentPosition, nextTilePosition, boxes);
        }
        console.log(segment.differentBoxes, segment.targets, segment.empties);
        if (segment.differentBoxes > segment.targets && segment.empties < 2) {
            console.log('deadlocked: no way to get it back and no available targets');
            return true;
        }
        return false;
    }

    private checkTrappedBoxInCorner(movedBox: Movement, direction: Directions): boolean {
        //  ######
        //  #$@  player pushed left
        //  #
        //  #

        const clockwiseSide = rotateDirectionClockwise(direction);
        const clockwiseTilePosition = movedBox.currentPosition.calculateOffset(clockwiseSide);
        const otherSide = getOpositeDirectionOf(clockwiseSide);
        const counterClowiseTilePosition = movedBox.currentPosition.calculateOffset(otherSide);
        const cwTile = this.staticMap.tiles[clockwiseTilePosition.y][clockwiseTilePosition.x].code;
        const ccwTile = this.staticMap.tiles[counterClowiseTilePosition.y][counterClowiseTilePosition.x].code;
        if (ccwTile === Tiles.wall || cwTile === Tiles.wall) {
            console.log(Directions[direction], Directions[clockwiseSide], clockwiseTilePosition, Directions[otherSide], counterClowiseTilePosition);
            console.log('deadlocked: trapped in between walls');
            return true;
        }
        return false;
    }

    private verticalLineSegment(tilePosition: Point, nextTilePosition: Point, boxes: Movement[]): SegmentAnalysis {
        //  ###      player pushed left
        //  #
        //  #$@
        //  #
        //  # ##

        let empties = 0;
        let targets = 0;
        for (let x = 0; x < this.staticMap.width; ++x) {
            const currentLineTile = this.staticMap.tiles[tilePosition.y][x].code;
            if (currentLineTile === Tiles.target) {
                ++targets;
            }
            const nextLineTile = this.staticMap.tiles[nextTilePosition.y][x].code;
            if (nextLineTile !== Tiles.wall && nextLineTile !== Tiles.empty) {
                ++empties;
            }
        }
        const differentBoxes = boxes
            .filter(box => box.currentPosition.y === tilePosition.y)
            .reduce((acc, _) => acc + 1, 0);
        return {empties, targets, differentBoxes};
    }

    private horizontalLineSegment(tilePosition: Point, nextTilePosition: Point, boxes: Movement[]): SegmentAnalysis {
        //        player pushed down
        //  #     @     #
        //  #     $     #
        //  #############
        let empties = 0;
        let targets = 0;
        for (let y = 0; y < this.staticMap.height; ++y) {
            const currentColumnTile = this.staticMap.tiles[y][tilePosition.x].code;
            if (currentColumnTile === Tiles.target) {
                ++targets;
            }

            const nextColumnTile = this.staticMap.tiles[y][nextTilePosition.x].code;
            if (nextColumnTile !== Tiles.wall && nextColumnTile !== Tiles.empty) {
                ++empties;
            }
        }

        const differentBoxes = boxes
            .filter(box => box.currentPosition.x === tilePosition.x)
            .reduce((acc, _) => acc + 1, 0);
        return {empties, targets, differentBoxes};
    }
}