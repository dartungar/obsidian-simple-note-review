import { INoteSet } from "src/noteSet/INoteSet";
import { ReviewAlgorithm } from "./reviewAlgorightms";

export interface SimpleNoteReviewPluginSettings {
    reviewedFieldName: string
    reviewFrequencyFieldName: string
    noteSets: INoteSet[]
    currentNoteSetId?: string
    openNextNoteAfterReviewing: boolean
    openRandomNote: boolean
    reviewAlgorithm: ReviewAlgorithm
    useReviewFrequency: boolean
    unreviewedNotesFirst: boolean
}

export class DefaultSettings implements SimpleNoteReviewPluginSettings {
    reviewedFieldName = "reviewed";
    reviewFrequencyFieldName = "review-frequency";
    noteSets: INoteSet[] = [];
    currentNoteSetId?: string  = null;
    openNextNoteAfterReviewing = true;
    openRandomNote = false;
    reviewAlgorithm: ReviewAlgorithm.default;
    useReviewFrequency = false;
    unreviewedNotesFirst = false;
}