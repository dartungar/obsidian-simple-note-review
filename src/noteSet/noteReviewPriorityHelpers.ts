import SimpleNoteReviewPlugin from "main";
import { ReviewFrequency } from "./reviewFrequency";
import { getNumberOfDaysFromToday } from "src/utils/dateUtils";


export enum NoteReviewPriority {
    priority1,
    priority2,
    priority3,
    priority4,
    priority5
}

/** Calculate Note review priority score. (days elapsed from last review * (review frequency rank ** 2))
 * @param  {SimpleNoteReviewPlugin} plugin
 * @param  {Record<string, any>} note
 * @returns number
 */
export function calculateNoteReviewPriority(plugin: SimpleNoteReviewPlugin, note: Record<string, any>): number {
    const reviewedFieldName = plugin.settings.reviewedFieldName;
    const frequencyFieldName = plugin.settings.reviewFrequencyFieldName;

    let score = 0;

    switch (note[frequencyFieldName]) {
        case ReviewFrequency.high:
            score = 5;
            break;
        case null:
        case "":
        case undefined:
            score = 4;
            break;
        case ReviewFrequency.normal:
            score = 3;
            break;
        case ReviewFrequency.low:
            score = 2;
            break;
        case ReviewFrequency.ignore:
            score = 0;
            return score; // ignored notes always get zero score
        default:
            throw new Error("Review Frequency error!");
    }

    let multiplier = 1;

    if (note[reviewedFieldName] == null) 
        multiplier = 6;
    else 
        multiplier = getNumberOfDaysFromToday(note[reviewedFieldName]);

    return (score ** 2)  * multiplier;
}