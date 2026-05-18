import SimpleNoteReviewPlugin from "main";
import { ReviewFrequency } from "./reviewFrequency";
import { getNumberOfDaysFromToday } from "src/utils/dateUtils";
import { DataviewPage } from "src/dataview/dataviewFacade";

const REVIEW_FREQUENCIES_BY_VALUE: Record<string, ReviewFrequency> = {
    [ReviewFrequency.high]: ReviewFrequency.high,
    [ReviewFrequency.normal]: ReviewFrequency.normal,
    [ReviewFrequency.low]: ReviewFrequency.low,
    [ReviewFrequency.ignore]: ReviewFrequency.ignore,
};

export function getReviewFrequencyFromMetadataValue(value: unknown): ReviewFrequency | null {
    if (!hasReviewFrequencyMetadataValue(value) || typeof value !== "string") {
        return null;
    }

    return REVIEW_FREQUENCIES_BY_VALUE[value] ?? null;
}

function requireReviewFrequencyFromMetadataValue(value: unknown): ReviewFrequency | null {
    if (!hasReviewFrequencyMetadataValue(value)) {
        return null;
    }

    const reviewFrequency = getReviewFrequencyFromMetadataValue(value);
    if (!reviewFrequency) {
        throw new Error("Review Frequency error!");
    }

    return reviewFrequency;
}

function hasReviewFrequencyMetadataValue(value: unknown): boolean {
    return value !== null && value !== undefined && value !== "";
}

/** Calculate Note review priority score. (days elapsed from last review * (review frequency rank ** 2))
 * @param  {SimpleNoteReviewPlugin} plugin
 * @param  {DataviewPage} note
 * @returns number
 */
export function calculateNoteReviewPriority(plugin: SimpleNoteReviewPlugin, note: DataviewPage): number {
    const reviewedFieldName = plugin.settings.reviewedFieldName;
    const frequencyFieldName = plugin.settings.reviewFrequencyFieldName;
    const reviewFrequency = requireReviewFrequencyFromMetadataValue(note[frequencyFieldName]);

    let score = 0;

    switch (reviewFrequency) {
        case ReviewFrequency.high:
            score = 5;
            break;
        case null:
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

    const reviewedValue = note[reviewedFieldName];

    if (reviewedValue == null || reviewedValue == "")
        multiplier = plugin.settings.unreviewedNotesFirst ? 10000 : 300;
    else
        multiplier = getNumberOfDaysFromToday(String(reviewedValue));

    return (score ** 2)  * multiplier;
}
