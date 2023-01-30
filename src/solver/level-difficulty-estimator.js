import Phaser from 'phaser';
import { Actions } from '../constants/actions';
import { configuration } from '../constants/configuration';
export class LevelDifficultyEstimator {
    factors;
    constructor() {
        this.factors = [
            (solution) => ({
                value: this.getDifficulty(solution.actions
                    .filter(action => action !== Actions.STAND)
                    .length, 200), weight: .15
            }),
            (solution) => ({ value: this.getDifficulty(solution.boxesLine, 80), weight: .75 }),
            (solution) => ({ value: this.getDifficulty(solution.totalTime, 60000), weight: .25 }),
            (solution) => ({ value: this.getDifficulty(solution.iterations, 750000), weight: .35 }),
        ];
    }
    //0 -> easy piece
    //100 -> nightmare
    //undefined -> impossible. literally
    estimate(solution) {
        // console.log(solution);
        if (!solution.actions) {
            return undefined;
        }
        const sums = this.factors.reduce((acc, factor) => {
            const difficultFactor = factor(solution);
            if (configuration.solver.debug.estimator) {
                console.log(difficultFactor);
            }
            return {
                value: acc.value + (difficultFactor.value * difficultFactor.weight),
                weight: acc.weight + difficultFactor.weight
            };
        }, {
            value: 0,
            weight: 0
        });
        const number = sums.value / sums.weight;
        return Phaser.Math.Clamp(number * 100, 0, 100);
    }
    getDifficulty(value, max) {
        return Math.min(value / max, 1.25);
    }
}