export class RqgItem<DataType = any> extends Item<DataType> {
  // public static init() {
  //   Items.unregisterSheet("core", ItemSheet);
  //   Item2TypeClass.forEach((itemClass) => itemClass.init());
  // }

  prepareData() {
    super.prepareData();
    console.log("*** RqgItem prepareData");
    const itemData: ItemData<DataType> = this.data;

    // Item2TypeClass.get(itemData.type).prepareItemForActorSheet(this);
  }
}
