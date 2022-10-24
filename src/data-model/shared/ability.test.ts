import { Ability, ResultEnum } from "./ability";

describe("Evaluate Roll Result", () => {
  beforeEach(() => {
    (global as any).game = { settings: {} };
    (global as any).game.settings.get = jest.fn(() => true); // Enable hyper criticals etc
  });

  describe.each`
    chance | roll   | expected
    ${-99} | ${95}  | ${ResultEnum.Failure}
    ${-99} | ${96}  | ${ResultEnum.Fumble}
    ${1}   | ${95}  | ${ResultEnum.Failure}
    ${1}   | ${96}  | ${ResultEnum.Fumble}
    ${150} | ${100} | ${ResultEnum.Fumble}
    ${11}  | ${96}  | ${ResultEnum.Failure}
    ${11}  | ${97}  | ${ResultEnum.Fumble}
    ${31}  | ${97}  | ${ResultEnum.Failure}
    ${31}  | ${98}  | ${ResultEnum.Fumble}
    ${51}  | ${98}  | ${ResultEnum.Failure}
    ${51}  | ${99}  | ${ResultEnum.Fumble}
    ${70}  | ${99}  | ${ResultEnum.Fumble}
    ${71}  | ${99}  | ${ResultEnum.Failure}
    ${71}  | ${100} | ${ResultEnum.Fumble}
    ${1}   | ${1}   | ${ResultEnum.Critical}
    ${1}   | ${2}   | ${ResultEnum.Success}
    ${1}   | ${5}   | ${ResultEnum.Success}
    ${1}   | ${6}   | ${ResultEnum.Failure}
    ${6}   | ${2}   | ${ResultEnum.Special}
    ${6}   | ${3}   | ${ResultEnum.Success}
    ${7}   | ${2}   | ${ResultEnum.Special}
    ${13}  | ${3}   | ${ResultEnum.Special}
    ${13}  | ${4}   | ${ResultEnum.Success}
    ${18}  | ${4}   | ${ResultEnum.Special}
    ${18}  | ${5}   | ${ResultEnum.Success}
    ${108} | ${22}  | ${ResultEnum.Special}
    ${108} | ${23}  | ${ResultEnum.Success}
    ${29}  | ${1}   | ${ResultEnum.Critical}
    ${29}  | ${2}   | ${ResultEnum.Special}
    ${30}  | ${2}   | ${ResultEnum.Critical}
    ${30}  | ${3}   | ${ResultEnum.Special}
    ${50}  | ${3}   | ${ResultEnum.Critical}
    ${50}  | ${4}   | ${ResultEnum.Special}
    ${70}  | ${4}   | ${ResultEnum.Critical}
    ${70}  | ${5}   | ${ResultEnum.Special}
    ${110} | ${6}   | ${ResultEnum.Critical}
    ${110} | ${7}   | ${ResultEnum.Special}
    ${999} | ${100} | ${ResultEnum.Fumble}
    ${999} | ${96}  | ${ResultEnum.Failure}
    ${100} | ${1}   | ${ResultEnum.HyperCritical}
    ${101} | ${2}   | ${ResultEnum.SpecialCritical}
    ${101} | ${3}   | ${ResultEnum.Critical}
  `("chance $chance & roll $roll", ({ chance, roll, expected }) => {
    it(`should return ${expected}`, () => {
      expect(Ability["evaluateResult"](chance, roll, true)).toBe(expected);
    });
  });
});
