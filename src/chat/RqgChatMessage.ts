export class RqgChatMessage extends ChatMessage {
  public static init() {
    CONFIG.ChatMessage.documentClass = RqgChatMessage;
    // CONFIG.ChatMessage.template = "systems/rqg/chat/chat-message.hbs"; // TODO redefine the base chat card
  }

  // private static card = {
  //   characteristicCard: CharacteristicCard,
  //   itemCard: ItemCard,
  //   spiritMagicCard: SpiritMagicCard,
  //   runeMagicCard: RuneMagicCard,
  //   weaponCard: WeaponCard,
  //   reputationCard: ReputationCard,
  // };

  // TODO Implement via getHTML in each chatcard and move away from static functions
  // getHTML(): Promise<JQuery> {
  //   const flags = this.data.flags;
  //   const chatMessageType = flags.rqg?.type;
  //   if (chatMessageType) {
  //     return CONFIG.RQG.chatMessages[chatMessageType].getHTML();
  //   }
  //   const msg = "Unexpected Chat Message type when generating Chat Message HTML";
  //   throw new RqgError(msg, this);
  // }
}
