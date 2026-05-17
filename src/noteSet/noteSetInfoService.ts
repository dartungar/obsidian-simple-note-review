import { JoinLogicOperators } from "src/settings/joinLogicOperators";
import { INoteSet } from "./INoteSet";
import { DataviewService } from "../dataview/dataviewService";
import { getDateOffsetByNDays } from "src/utils/dateUtils";
import { NoteSetService } from "./noteSetService";

export class NoteSetInfoService {

    constructor(private _dataviewService: DataviewService) {  }

    public async updateNoteSetStats(noteSet: INoteSet, reviewedFieldName = "reviewed"): Promise<void> {
        const pages = await this._dataviewService.getNoteSetFiles(noteSet);
        noteSet.stats = {
            totalCount: pages.length,
            notRewiewedCount: pages.where(p => !this.getDateValue(p[reviewedFieldName])).length,
            reviewedLastSevenDaysCount: pages.where(p => {
                const reviewedDate = this.getDateValue(p[reviewedFieldName]);
                return reviewedDate !== null && reviewedDate > getDateOffsetByNDays(7);
            }).length,
            reviewedLastThirtyDaysCount: pages.where(p => {
                const reviewedDate = this.getDateValue(p[reviewedFieldName]);
                return reviewedDate !== null && reviewedDate > getDateOffsetByNDays(30);
            }).length
        }
    }

    public updateNoteSetDisplayNameAndDescription(noteSet: INoteSet) {
        noteSet.displayName = this.getNoteSetDisplayName(noteSet);
        noteSet.description = this.getNoteSetDescription(noteSet);
    }

    private getNoteSetDisplayName(noteSet: INoteSet): string {
        if (noteSet.name && noteSet.name !== "" ) {
            return noteSet.name;
        }
        const alias = this._dataviewService.getOrCreateBaseDataviewQuery(noteSet);
        return alias && alias != "" ? alias : "blank note set";
    }

    private getNoteSetDescription(noteSet: INoteSet): string {

        if (this.queryMatchesAllNotes(noteSet)) {
            return NoteSetService.MATCHES_ALL_STRING;
        }

        const desc: string[] = [];

        if (noteSet.dataviewQuery && noteSet.dataviewQuery !== "") {
            desc.push(`are matched with dataviewJS query ${noteSet.dataviewQuery}; `);
        }

        if (noteSet.tags && noteSet.tags?.length > 0) {
            let tagString = `contain ${noteSet.tagsJoinType === JoinLogicOperators.AND ? "all" : "any"} of these tags: ${noteSet.tags.join(", ")}`;
            if (noteSet.folders && noteSet.folders?.length > 0) {
                tagString += ` ${noteSet.foldersToTagsJoinType === JoinLogicOperators.AND ? "and" : "or"} `;
            } 
            desc.push(tagString);
        }

        if (noteSet.folders && noteSet.folders?.length > 0) {
            desc.push(`are inside any of these folders (including nested folders): ${noteSet.folders.join(", ")}`);
        }

        if (noteSet.createdInLastNDays) {
            desc.push(`are created in the last ${noteSet.createdInLastNDays} days`);
        }

        if (noteSet.modifiedInLastNDays) {
            desc.push(`are modified in the last ${noteSet.modifiedInLastNDays} days`);
        }

        return `matches notes that:  ` + desc.join("; ");
    }

    private queryMatchesAllNotes(noteset: INoteSet): boolean {
        return !(this._dataviewService.getOrCreateBaseDataviewQuery(noteset) || noteset.createdInLastNDays || noteset.modifiedInLastNDays);
    }

    private getDateValue(value: unknown): Date | null {
        if (value instanceof Date) {
            return value;
        }

        if (typeof value === "string") {
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
        }

        if (this.hasToJSDate(value)) {
            return value.toJSDate();
        }

        return null;
    }

    private hasToJSDate(value: unknown): value is { toJSDate(): Date } {
        return (
            typeof value === "object" &&
            value !== null &&
            "toJSDate" in value &&
            typeof (value as { toJSDate?: unknown }).toJSDate === "function"
        );
    }


}
