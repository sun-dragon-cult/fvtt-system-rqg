export interface Modifiable {
  reference?: string; // Reference to what is modified, id of skill item
  mod?: string; // Modification, ex @DEX*2
  description?: string; // Ex Bladesharp

  // ['+5', 'Bladesharp'],['-2', 'Sickness']
  // Roll( 1d8 [+5 #Bladesharp] [-2 #Sickness])
}

export class Modifier implements Modifiable {
  constructor(
    public reference?: string,
    public mod?: string,
    public description?: string
  ) {}
}

export const emptyModifier = new Modifier();
