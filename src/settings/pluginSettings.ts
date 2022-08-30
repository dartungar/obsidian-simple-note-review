import { INoteSet } from "src/noteSet/INoteSet";

export interface SimpleNoteReviewPluginSettings {
    fieldName: string
    noteSets: INoteSet[]
    currentNoteSet: INoteSet
    openNextNoteAfterReviewing: boolean
    openRandomNote: boolean
}

export class DefaultSettings implements SimpleNoteReviewPluginSettings {
    fieldName = "reviewed";
    noteSets: INoteSet[] = [];
    currentNoteSet: INoteSet = null;
    openNextNoteAfterReviewing = true;
    openRandomNote = false;
}