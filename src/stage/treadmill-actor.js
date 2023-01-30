import { Tiles } from '../levels/tiles';
import { sounds } from '../constants/sounds';
import { SpriteCreator } from './sprite-creator';
import { Directions } from '../constants/directions';
export class TreadmillActor {
    scene;
    sprite;
    id;
    orientation;
    covered;
    tilePosition;
    constructor(config) {
        this.orientation = config.orientation;
        this.id = config.id;
        this.scene = config.scene;
        this.tilePosition = config.tilePosition;
        this.sprite = new SpriteCreator(config).createSprite();
        this.covered = false;
        switch (this.orientation) {
            case Directions.LEFT:
                this.sprite.flipX = true;
                break;
            case Directions.UP:
                // this.sprite.flipY = true
                break;
            case Directions.DOWN:
                // this.sprite.flipY = true
                break;
            case Directions.RIGHT:
                break;
        }
    }
    isCovered() {
        return this.covered;
    }
    cover(actors) {
        if (actors
            .some(actor => actor.getTileCode() === Tiles.box)) {
            this.covered = true;
            //TODO add particle effect?
        }
        else {
            if (this.covered) {
                this.covered = false;
                this.scene.sound.play(sounds.treadmil.key, { volume: 0.35 });
            }
        }
    }
    getId() {
        return this.id;
    }
    getSprite() {
        return this.sprite;
    }
    getTileCode() {
        return Tiles.treadmil;
    }
    getTilePosition() {
        return this.tilePosition;
    }
    setTilePosition(tilePosition) {
        this.tilePosition = tilePosition;
    }
    getOrientation() {
        return this.orientation;
    }
    async animate() {
    }
}
