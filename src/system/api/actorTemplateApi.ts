import { RqgActor } from "../../actors/rqgActor";
import { getGame } from "../util"

export async function getActorTemplates() {
    //TODO: Make the compendium name a setting
    const speciesTemplatesCompendium = getGame().packs.get("rqg.species-templates");
    const templates = await speciesTemplatesCompendium?.getDocuments();
    if (templates) {
        return templates as StoredDocument<RqgActor>[];
    } else {
        return undefined;
    }
}