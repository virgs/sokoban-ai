import Heap from 'heap';
import type {Point} from '../math/point';
import {Actions} from '../constants/actions';
import {TileCodes} from '../tiles/tile-codes';
import {MovementCoordinator} from './movement-coordinator';
import {MovementAnalyser, MovementEvents} from '@/game/solver/movement-analyser';
import {ManhattanDistanceCalculator} from '@/game/math/manhattan-distance-calculator';
import type {DistanceCalculator} from '@/game/math/distance-calculator';

type Solution = {
    actions: Actions[],
    hero: Point,
    boxes: Point[],
    score: number,
    hash?: string,
};

export type SolutionOutput = {
    actions?: Actions[];
    iterations: number;
    totalTime: number;
}

//TODO Create an interface out of this to allow comparisions
//https://isaaccomputerscience.org/concepts/dsa_search_a_star?examBoard=all&stage=all
export class SokobanSolver {

    private static SmartActions = Object.keys(Actions)
        .filter(key => !isNaN(Number(key)))
        .map(key => Number(key) as Actions)
        .filter(action => action !== Actions.STAND)

    private movementCoordinator: MovementCoordinator;
    //a.foo - b.foo; ==> heap.pop(); gets the smallest
    private candidatesToVisit: Heap<Solution> = new Heap((a: Solution, b: Solution) => a.score - b.score);
    private candidatesVisitedHash: { [hash: string]: boolean } = {};
    private readonly staticMap: { width: number; height: number; tiles: TileCodes[][] };
    private readonly movementBonusMap: Map<MovementEvents, number>;
    private readonly movementAnalyser: MovementAnalyser;
    private readonly sleepForInMs: number;
    private readonly sleepingCycle: number;

    public constructor(input: {
        staticMap: { width: number; height: number; tiles: TileCodes[][] },
        cpu: { sleepForInMs: number, sleepingCycle: number }
        distanceCalculator: DistanceCalculator
    }) {
        this.sleepForInMs = input.cpu.sleepForInMs;
        this.sleepingCycle = input.cpu.sleepingCycle;

        this.staticMap = input.staticMap;
        this.movementCoordinator = new MovementCoordinator(this.staticMap);
        this.movementAnalyser = new MovementAnalyser({
            staticMap: this.staticMap,
            distanceCalculator: input.distanceCalculator
        });
        this.movementBonusMap = new Map<MovementEvents, number>;
        this.movementBonusMap.set(MovementEvents.HERO_MOVED, -1);
        this.movementBonusMap.set(MovementEvents.BOX_MOVED, 100);
        this.movementBonusMap.set(MovementEvents.HERO_MOVED_BOX_ONTO_TARGET, 5000);
        this.movementBonusMap.set(MovementEvents.HERO_MOVED_BOX_OUT_OF_TARGET, -150);
    }

    public async solve(hero: Point, boxes: Point[]): Promise<SolutionOutput> {
        const startTime = new Date().getTime();
        const {actions, iterations} = await this.startAlgorithm(hero, boxes);
        const solutionOutput: SolutionOutput = {
            actions: actions,
            iterations: iterations,
            totalTime: new Date().getTime() - startTime
        };

        console.log('solution found. Steps: ' + actions?.length + '. Total time: ' + solutionOutput.totalTime + '; iterations: ' + solutionOutput.iterations);
        return solutionOutput;
    }

    private async startAlgorithm(hero: Point, boxes: Point[]) {
        const initialCandidate: Solution = {
            actions: [],
            hero,
            boxes,
            score: 0
        };
        initialCandidate.hash = this.calculateHashOfSolution(initialCandidate);
        this.candidatesToVisit.push(initialCandidate);

        let iterations = 0;
        let cpuBreath = 0;
        let solution: Solution | undefined = undefined;
        for (let candidate: Solution | undefined = this.candidatesToVisit.pop();
             candidate;
             candidate = this.candidatesToVisit.pop()) {
            ++iterations;
            ++cpuBreath;

            solution = this.checkSolution(candidate);
            if (solution) {
                break;
            }
            if (cpuBreath > this.sleepForInMs) {
                cpuBreath -= this.sleepForInMs;
                await new Promise(r => setTimeout(r, this.sleepForInMs));
            }

        }
        return {actions: solution?.actions, iterations};
    }

    private checkSolution(candidate: Solution): Solution | undefined {
        if (!this.candidateWasVisitedBefore(candidate.hash!)) {
            this.candidatesVisitedHash[candidate.hash!] = true;

            if (this.candidateSolvesMap(candidate.boxes)) {
                return candidate;
            }

            this.applyMoreActions(candidate);
        }
    }

    private applyMoreActions(candidate: Solution) {
        SokobanSolver.SmartActions
            .forEach((action: Actions) => {
                const afterAction = this.movementCoordinator.update({
                    boxes: candidate.boxes,
                    hero: candidate.hero,
                    staticMap: this.staticMap,
                    heroAction: action
                });

                if (afterAction.mapChanged) {
                    const analysis = this.movementAnalyser.analyse(afterAction);
                    // const actionScore = analysis.events.reduce((acc, value) => acc + this.movementBonusMap.get(value)!, 0);
                    const heroMovementCost = 1;
                    const newCandidate: Solution = {
                        boxes: afterAction.boxes.map(box => box.currentPosition),
                        hero: afterAction.hero.currentPosition,
                        actions: candidate.actions.concat(action),
                        score: candidate.score + heroMovementCost + analysis.shortestDistanceFromEveryBoxToTheClosestTarget
                    };
                    newCandidate.hash = this.calculateHashOfSolution(newCandidate);
                    if (!analysis.isDeadLocked) {
                        this.candidatesToVisit.push(newCandidate);
                    }
                }
            });
    }

    private candidateSolvesMap(boxesPosition: Point[]): boolean {
        return boxesPosition
            .every(box => this.staticMap.tiles[box.y][box.x] === TileCodes.target);
    }

    private candidateWasVisitedBefore(newCandidateHash: string): boolean {
        return this.candidatesVisitedHash[newCandidateHash];
    }

    private calculateHashOfSolution(newCandidate: Solution) {
        return `${newCandidate.boxes
            .map(box => `${box.x},${box.y}`)
            .sort()
            .join(';')}:${newCandidate.hero.x},${newCandidate.hero.y}`;
    }

}