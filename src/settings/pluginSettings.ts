import { IQueue } from "src/queue/IQueue";

export interface SimpleNoteReviewPluginSettings {
    fieldName: string
    queues: IQueue[]
    currentQueue: IQueue
    openNextNoteAfterReviewing: boolean
    openRandomNote: boolean
}

export class DefaultSettings implements SimpleNoteReviewPluginSettings {
    fieldName = "reviewed";
    queues: IQueue[] = [];
    currentQueue: IQueue = null;
    openNextNoteAfterReviewing = true;
    openRandomNote = false;
}