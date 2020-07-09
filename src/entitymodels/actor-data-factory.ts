import {
  ActorDataRqg,
  Attributes,
  Characteristic,
  Characteristics,
  ElementalRunes,
  HitLocation, PowerRunes,
  RuneAbility
} from "./rqg.actor.data";

export enum ActorTypeEnum {
  Humanoid,
  WingedHumanoid,
  Beetle,
  BirdFlying,
  BirdRunning, // TODO Problem? Switching hit locations for same animal - Lookup "Polymorph"
  Centaur,
  Dragon,
  DaragonSnailOneHeaded,
  DragonSnailTwoHeaded,
  AnimalFourLegged
}

export class ActorDataFactory {

  static create(type: ActorTypeEnum): ActorDataRqg {
    return new ActorDataRqg(
      this.createCharacteristics(),
      this.createHitLocations(type),
      this.createAttributes(),
      this.createElementalRunes(),
      this.createPowerRunes(),
      0,
      0
    );
  }

  private static createCharacteristics(): Characteristics {
    const str = new Characteristic(0, 21, null, false);
    const con = new Characteristic(0, 21, null, false);
    const siz = new Characteristic(0, 21, null, false);
    const dex = new Characteristic(0, 21, null, false);
    const int = new Characteristic(0, 21, null, false);
    const pow = new Characteristic(0, 21, null, false);
    const cha = new Characteristic(0, 21, null, false);
    return new Characteristics(str, con, siz, dex, int, pow, cha);
  }

  private static createHitLocations(type: ActorTypeEnum): Array<HitLocation> {
    if (type === ActorTypeEnum.WingedHumanoid) { // TODO Just placeholder for future
      return ActorDataFactory.createHumanoidHitLocations();
    } else {
      return ActorDataFactory.createHumanoidHitLocations(); // Default to humanoid
    }
  }

  private static createHumanoidHitLocations(): Array<HitLocation> {
    return [
      new HitLocation('head', 0, 5, 0, 19, 20),
      new HitLocation('left-arm', 0, 4, 0, 16, 18),
      new HitLocation('right-arm', 0, 4, 0, 13, 15),
      new HitLocation('chest', 0, 6, 0, 12, 12),
      new HitLocation('abdomen', 0, 5, 0, 9, 11),
      new HitLocation('left-leg', 0, 5, 0, 5, 8),
      new HitLocation('right-leg', 0, 5, 0, 1, 4)
    ];
  }

  private static createAttributes(): Attributes {
    // TODO All will be calculated in prepareData() Change constructor to use defaults?
    return new Attributes(0, 0, 0, 0, 0, 0, 0, 0);
  }

  private static createElementalRunes(): ElementalRunes {
    const fire = new RuneAbility('systems/rqg/icons/runes/fire_sky.svg', 0, false);
    const darkness = new RuneAbility('systems/rqg/icons/runes/darkness.svg', 0, false);
    const water = new RuneAbility('systems/rqg/icons/runes/water.svg', 0, false);
    const earth = new RuneAbility('systems/rqg/icons/runes/earth.svg', 0, false);
    const air = new RuneAbility('systems/rqg/icons/runes/air.svg', 0, false);
    const moon = new RuneAbility('systems/rqg/icons/runes/moon_full.svg', 0, false);
    return new ElementalRunes(fire, darkness, water, earth, air, moon);
  }

  private static createPowerRunes(): PowerRunes {
    const man = new RuneAbility('systems/rqg/icons/runes/man.svg', 0, false);
    const beast = new RuneAbility('systems/rqg/icons/runes/beast.svg', 0, false);
    const fertility = new RuneAbility('systems/rqg/icons/runes/fertility.svg', 0, false);
    const death = new RuneAbility('systems/rqg/icons/runes/death.svg', 0, false);
    const harmony = new RuneAbility('systems/rqg/icons/runes/harmony.svg', 0, false);
    const disorder = new RuneAbility('systems/rqg/icons/runes/disorder.svg', 0, false);
    const truth = new RuneAbility('systems/rqg/icons/runes/truth.svg', 0, false);
    const illusion = new RuneAbility('systems/rqg/icons/runes/illusion.svg', 0, false);
    const stasis = new RuneAbility('systems/rqg/icons/runes/stasis.svg', 0, false);
    const movement = new RuneAbility('systems/rqg/icons/runes/movement_change.svg', 0, false);
    return new PowerRunes(man, beast, fertility, death, harmony, disorder, truth, illusion, stasis, movement)
  }
}
