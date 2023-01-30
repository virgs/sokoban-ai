import { Tiles } from '@/levels/tiles';
import { sounds } from '@/constants/sounds';
import { GameObjectCreator } from '@/stage/game-object-creator';
import { configuration } from '@/constants/configuration';
import { TileDepthCalculator } from '@/scenes/tile-depth-calculator';
export class BoxActor {
    tweens;
    image;
    id;
    scene;
    tilePosition;
    isOnTarget;
    currentAnimation;
    constructor(config) {
        this.id = config.id;
        this.scene = config.scene;
        this.tilePosition = config.tilePosition;
        this.tweens = config.scene.tweens;
        this.image = new GameObjectCreator(config).createImage();
        this.isOnTarget = false;
    }
    getTilePosition() {
        return this.tilePosition;
    }
    setTilePosition(tilePosition) {
        this.tilePosition = tilePosition;
    }
    getId() {
        return this.id;
    }
    async animate(data) {
        return new Promise(resolve => {
            if (this.currentAnimation) {
                console.log('abort ', this.id, this.tilePosition);
                this.currentAnimation?.tween.complete();
                this.currentAnimation?.tween.stop();
                this.currentAnimation?.resolve();
                this.currentAnimation = undefined;
            }
            const tween = {
                x: data.spritePosition.x,
                y: data.spritePosition.y,
                duration: configuration.updateCycleInMs,
                targets: this.image,
                onInit: () => {
                },
                onUpdate: () => {
                    this.image.setDepth(new TileDepthCalculator().calculate(Tiles.box, this.image.y));
                },
                onComplete: () => {
                    resolve();
                    this.currentAnimation = undefined;
                }
            };
            this.currentAnimation = {
                tween: this.tweens.add(tween),
                resolve: resolve
            };
        });
    }
    getTileCode() {
        return Tiles.box;
    }
    getOrientation() {
        return undefined;
    }
    isCovered() {
        return false;
    }
    cover(staticActors) {
        if (staticActors
            .some(actor => actor.getTileCode() === Tiles.target)) {
            this.image.setFrame(Tiles.boxOnTarget);
            if (!this.isOnTarget) {
                this.isOnTarget = true;
                this.scene.sound.play(sounds.boxOnTarget.key, { volume: 0.5 });
            }
        }
        else {
            if (this.isOnTarget) {
                this.isOnTarget = false;
                this.image.setFrame(Tiles.box);
            }
        }
    }
    getIsOnTarget() {
        return this.isOnTarget;
    }
}
