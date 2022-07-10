import { Queue } from "src/queue";

export interface SimpleNoteReviewPluginSettings {
    fieldName: string
    queues: Queue[]
}

export class DefaultSettings implements SimpleNoteReviewPluginSettings {
    fieldName = "reviewed";
    queues: Queue[] = [];
}