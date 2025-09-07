export declare class Dice3D {
  waitFor3DAnimationByMessageID(targetMessageId: string): Promise<boolean>;

  //TODO type box
  box: any;
  DiceFactory: any;
  exports: Dice3DExports;

  /**
   * Show the 3D Dice animation for the Roll made by the User.
   *
   * @param roll an instance of Roll class to show 3D dice animation.
   * @param user the user who made the roll (game.user by default).
   * @param synchronize if the animation needs to be shown to other players. Default: false
   * @param whisper list of users or userId who can see the roll, set it to null if everyone can see. Default: null
   * @param blind if the roll is blind for the current user. Default: false
   * @param chatMessageID A chatMessage ID to reveal when the roll ends. Default: null
   * @param speaker An object using the same data schema than ChatSpeakerData.
   *                Needed to hide NPCs roll when the GM enables this setting.
   * @returns when resolved true if the animation was displayed, false if not.
   */
  showForRoll(
    roll: Roll,
    user?: User,
    synchronize?: boolean,
    whisper?: Array<{ id: string } | string> | null,
    blind?: boolean,
    chatMessageID?: string,
    speaker?: ChatMessage["speaker"],
  ): Promise<boolean>;

  /**
   * Show the 3D Dice animation based on data configuration made by the User.
   *
   * @param data  data containing the formula and the result to show in the 3D animation.
   * @param user the user who made the roll (game.user by default).
   * @param synchronize if the animation needs to be shown to other players. Default: false
   * @param whisper list of users or userId who can see the roll, leave it empty if everyone can see.
   * @param blind if the roll is blind for the current user
   * @returns when resolved true if the animation was displayed, false if not.
   */
  show(
    data: Dice3DShowData,
    user?: User,
    synchronize?: boolean,
    whisper?: Array<{ id: string } | string> | null,
    blind?: boolean,
  ): Promise<boolean>;

  /**
   * Register a new system
   * The id is to be used with the addDicePreset method
   * The name can be a localized string
   * @param {Object} system {id, name}
   * @param mode "preferred", "default". "preferred" will enable this system by default until a user changes it to anything else.
   * Default will add the system as a choice left to each user.
   */

  addSystem(data: { id: string; name: string }, mode: "preferred" | "default"): void;

  /**
   * Add a colorset (theme)
   * @param colorset
   * @param  mode = "default","preferred"
   * The "mode" parameter have 2 modes :
   * - "default" only register the colorset
   * - "preferred" apply the colorset if the player didn't already change his dice appearance for this world.
   */
  addColorset(colorset: DiceColorsetData, mode: "default" | "preferred" | "no"): void;

  /**
   * Register a new dice preset
   * @param data The informations on the new dice preset (see below)
   * @param shape should be explicit when using a custom die term. Supported shapes are d2,d4,d6,d8,d10,d12,d20
   */
  addDicePreset(
    data: DicePresetData,
    shape?: "d2" | "d4" | "d6" | "d8" | "d10" | "d12" | "d20",
  ): void;
}

interface Dice3DExports {
  COLORSETS: any;
  TEXTURELIST: any;
  Utils: {
    prepareFontList: () => Record<string, string>;
    prepareTextureList: () => Record<string, string>;
    prepareColorsetList: () => Record<string, Record<string, string>>;
    prepareSystemList: () => Record<string, string>;
  };
}

interface Dice3DShowData {
  throws: Array<Dice3DThrows>;
}

interface Dice3DThrows {
  dice: Array<DiceResult>;
}

interface DiceResult {
  result: number;
  resultLabel: number | string;
  type: string;
  vectors: Array<unknown>;
  options: unknown;
}

interface DicePresetData {
  // should be a registered dice term
  type: string;
  // contains either string (Unicode) or a path to a texture (png, gif, jpg, webp)
  labels: Array<string>;
  //should be a system ID previously registered
  system: string;
  // is the name of a colorset (either a custom one or from the DsN colorset list)
  colorset?: string;
  //is the name of the font family. This can be a Webfont too. (ex: Arial, monospace, etc). This setting overwrites the colorset font setting
  font?: string;
  //  is the scale of the font size (default: 1). This setting overwrite the colorset fontScale setting
  fontScale?: number;
  //is an array of bumpMap textures that should follow the exact same order as labels
  bumpMaps?: Array<string>;
  // is an object with the min and max value on the die
  values?: { min: number; max: number };
}

interface DiceColorsetData {
  // A string ID for the colorset
  name: string;
  // Localized string for settings
  description: string;
  //Used to group the colorsets in the settings
  category: string;
  //Colors of the labels
  foreground: string;
  //Colors of the dice
  background: string;
  //Colors of the label outline. Can be 'none'.
  outline: string;
  //Colors of the edges. Can be 'none'.
  edge: string;
  //An array of ID, or a single ID of the texture to use if "None / Auto (Theme)" is selected in the settings.
  //If it is a custom texture, make sure to call this function after the Promise from "addTexture" is resolved.
  texture: Array<string>;
  // ID of the material to use if "Auto (Theme)" is selected in the settings. Supported values are plastic, metal, glass, wood and chrome
  material: "plastic" | "metal" | "glass" | "wood" | "chrome";
  // is the name of the font family. This can be a Webfont too. (ex: Arial, monospace, etc)
  font: string;
  // is an object containing the fontScale for as many dice types as wanted. Here bellow is the default scale applied when a dice type is omitted.
  fontScale?: Record<string, number>;
  // Set to 'hidden' if you do not want this colorset to be visible in the players' theme list. Useful for internal colorsets.
  visibility?: "hidden";
}
