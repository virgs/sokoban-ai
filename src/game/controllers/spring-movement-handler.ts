import {Tiles} from '@/game/tiles/tiles';
import type {Point} from '@/game/math/point';
import {Directions, getOpositeDirectionOf} from '@/game/constants/directions';
import type {FeatureMovementHandler} from '@/game/controllers/feature-movement-handler';
import type {MovementOrchestrator, OrientedPoint} from '@/game/controllers/movement-orchestrator';

export class SpringMovementHandler implements FeatureMovementHandler {
    private readonly position: Point;
    private readonly orientation: Directions;
    private readonly coordinator: MovementOrchestrator;

    constructor(config: { spring: OrientedPoint, coordinator: MovementOrchestrator }) {
        this.position = config.spring.point;
        this.orientation = config.spring.orientation;
        this.coordinator = config.coordinator;
    }

    public async act(): Promise<boolean> {
        let mapChanged = false;
        this.coordinator.getBoxes()
            .filter(box => box.currentPosition.isEqualTo(this.position))
            .forEach(box => {
                const nextTilePosition = box.currentPosition.calculateOffset(this.orientation);
                if (this.coordinator.canFeatureEnterPosition({point: nextTilePosition, orientation: this.orientation})) {
                    this.coordinator.moveFeature(box, this.orientation);
                    mapChanged = true;
                }
            });
        return mapChanged;
    }

    public allowEnteringMovement(direction: Directions): boolean {
        return this.orientation === getOpositeDirectionOf(direction);
    }

    public allowLeavingMovement(direction: Directions): boolean {
        return this.orientation !== getOpositeDirectionOf(direction);
    }

    public getTile(): Tiles {
        return Tiles.spring;
    }

    public getPosition(): Point {
        return this.position;
    }

}