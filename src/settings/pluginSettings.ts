import { IQueue } from "src/queue/IQueue";

export interface SimpleNoteReviewPluginSettings {
    fieldName: string
    queues: IQueue[]
    currentQueue: IQueue
}

export class DefaultSettings implements SimpleNoteReviewPluginSettings {
    fieldName = "reviewed";
    queues: IQueue[] = [];
    currentQueue: IQueue = null;
}