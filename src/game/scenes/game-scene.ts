import Phaser from 'phaser';
import {Store} from '@/store';
import {Scenes} from './scenes';
import type {Box} from '@/game/actors/box';
import type {Hero} from '@/game/actors/hero';
import {Actions} from '../constants/actions';
import type {Target} from '@/game/actors/target';
import {configuration} from '../constants/configuration';
import type {SolutionOutput} from '@/game/solver/sokoban-solver';
import {MovementAnalyser} from '@/game/solver/movement-analyser';
import type {Movement, MovementCoordinatorOutput} from '../solver/movement-coordinator';
import {MovementCoordinator} from '../solver/movement-coordinator';
import {FeatureMapExtractor} from '../tiles/feature-map-extractor';
import type {StaticMap} from '@/game/tiles/standard-sokoban-annotation-mapper';
import {StandardSokobanAnnotationMapper} from '@/game/tiles/standard-sokoban-annotation-mapper';
import {ScreenPropertiesCalculator} from '@/game/math/screen-properties-calculator';
import {ManhattanDistanceCalculator} from '@/game/math/manhattan-distance-calculator';

export type GameSceneConfiguration = {
    map: string,
    moves?: Actions[]
    currentLevel: number,
    bestMoves?: number,
    router: any
};

//TODO create memento-recorder-class com a habilidade de 'undo' entre cada action do hero que não seja standing
export class GameScene extends Phaser.Scene {
    private movementCoordinator?: MovementCoordinator;
    private levelComplete?: boolean;
    private allowHeroMovement?: boolean;
    private playerMovesSoFar?: Actions[];

    private hero?: Hero;
    private boxes: Box[] = [];
    private targets: Target[] = [];
    private featurelessMap?: StaticMap;
    private solution?: SolutionOutput;
    private movementAnalyser?: MovementAnalyser;

    constructor() {
        super(Scenes[Scenes.GAME]);
    }

    public init() {
        this.levelComplete = false;
        this.playerMovesSoFar = [];
    }

    public preload() {
        //Note needed only when loading from file

        // this.load.html(configuration.html.gameScene.key, configuration.html.gameScene.file);
        // this.load.tilemapTiledJSON(configuration.tiles.tilemapKey, configuration.tiles.tilesheets[0]);
        // this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
        //     this.cache.tilemap.remove(configuration.tiles.tilemapKey);
        // });

        this.load.image('blur', configuration.blurMask);

        this.load.spritesheet({
            key: configuration.tiles.spriteSheetKey,
            url: configuration.tiles.sheetAsset,
            normalMap: configuration.tiles.sheetAssetNormal,
            frameConfig: {
                frameWidth: configuration.tiles.horizontalSize,
                frameHeight: configuration.tiles.verticalSize
            }
        });
    }

    public async create() {
        const codedMap: string = Store.getInstance().map;
        this.solution = Store.getInstance().solution;

        //TODO move this section to scene before this one
        const map = new StandardSokobanAnnotationMapper().map(codedMap);
        const output = new ScreenPropertiesCalculator().calculate(map);
        configuration.world.tileSize.horizontal = Math.trunc(configuration.world.tileSize.horizontal * output.scale);
        configuration.world.tileSize.vertical = Math.trunc(configuration.world.tileSize.vertical * output.scale);
        //TODO end of section

        const mapfeatureMapExtractorsExtractor = new FeatureMapExtractor(this, output.scale, map);
        const featureMap = mapfeatureMapExtractorsExtractor.extract();
        this.hero = featureMap.hero;
        this.boxes = featureMap.boxes;
        this.targets = featureMap.targets;
        this.featurelessMap = featureMap.featurelessMap;

        this.lights.enable();
        this.lights.enable().setAmbientColor(0x555555);

        this.movementAnalyser = new MovementAnalyser({map: this.featurelessMap, distanceCalculator: new ManhattanDistanceCalculator()});
        this.movementCoordinator = new MovementCoordinator(this.featurelessMap);

        this.allowHeroMovement = true;
    }

    public async update(time: number, delta: number) {
        if (this.levelComplete) {
            return;
        }

        if (this.allowHeroMovement) {
            let heroAction: Actions = this.hero!.checkAction();
            if (this.solution?.actions?.length! > 0) {
                heroAction = this.solution?.actions?.shift()!;
            }
            this.playerMovesSoFar!.push(heroAction);

            const movement = this.movementCoordinator!.update({
                heroAction: heroAction,
                map: this.featurelessMap!,
                hero: this.hero!.getTilePosition(),
                boxes: this.boxes!.map(box => box.getTilePosition())
            });

            if (movement.mapChanged) {
                this.movementAnalyser?.analyse(movement);
                this.allowHeroMovement = false;
                await this.moveMapFeatures(movement);
                this.onMovementsComplete();
            }
        }
    }

    private async moveMapFeatures(movementCoordinatorOutput: MovementCoordinatorOutput) {
        const promises: Promise<any>[] = [];
        promises.push(...movementCoordinatorOutput.boxes
            //TODO filter by box id
            .filter(box => !box.previousPosition.isEqualTo(box.currentPosition))
            .map(async movedBox => {
                const tileBoxToMove = this.boxes
                    .find(tileBox => movedBox.previousPosition.isEqualTo(tileBox.getTilePosition()));

                await tileBoxToMove!.move(movedBox.direction!);
                tileBoxToMove!.setIsOnTarget(movedBox.isCurrentlyOnTarget);

                this.updateTargetCoverSituation(movedBox);
            }));

        const heroPromise = async () => {
            await this.hero!.move(movementCoordinatorOutput.hero.direction!);
            this.updateTargetCoverSituation(movementCoordinatorOutput.hero);

        };
        promises.push(heroPromise());
        await Promise.all(promises);
        this.allowHeroMovement = true;
    }

    private updateTargetCoverSituation(move: Movement) {
        this.targets
            .filter(target => !target.isCovered())
            .find(target => target.getTilePosition().isEqualTo(move.currentPosition))
            ?.cover();

        this.targets
            .filter(target => target.isCovered())
            .find(target => target.getTilePosition().isEqualTo(move.previousPosition))
            ?.uncover();
    }

    private onMovementsComplete(): void {
        this.checkLevelComplete();
    }

    private checkLevelComplete() {
        if (this.boxes
            .every(box => box.getIsOnTarget())) {
            // this.levelComplete = true;
            console.log('currentLevel complete', this.playerMovesSoFar?.filter(action => action !== Actions.STAND));
            setTimeout(async () => {
                // this.lights.destroy();

                // Store.getInstance().router.push('/next-level');
            }, 1500);
            // }
        }
    }

}
