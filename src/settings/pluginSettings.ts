import { IQueue } from "src/IQueue";

export interface SimpleNoteReviewPluginSettings {
    fieldName: string
    queues: IQueue[]
}

export class DefaultSettings implements SimpleNoteReviewPluginSettings {
    fieldName = "reviewed";
    queues: IQueue[] = [];
}