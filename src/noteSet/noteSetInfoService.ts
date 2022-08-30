import { JoinLogicOperators } from "src/joinLogicOperators";
import { INoteSet } from "./INoteSet";
import { DataviewService } from "./dataviewService";

export class NoteSetInfoService {

    constructor(private _dataviewService: DataviewService) {  }

    public updateNoteSetStats(noteSet: INoteSet) {
        const pages = this._dataviewService.getNoteSetFiles(noteSet);
        noteSet.stats = {
            totalCount: pages.length,
            notRewiewedCount: pages.where(p => !p.reviewed).length, 
            reviewedLastSevenDaysCount: pages.where(p => p.reviewed > this.getDateOffsetByNDays(7)).length,
            reviewedLastThirtyDaysCount: pages.where(p => p.reviewed > this.getDateOffsetByNDays(30)).length
        }
    }

    public updateNoteSetDisplayNameAndDescription(noteSet: INoteSet) {
        noteSet.displayName = this.getNoteSetDisplayName(noteSet);
        noteSet.description = this.getNoteSetDescription(noteSet);
    }

    /** Get display name (set by user or generated from noteSet parameters)
    * @param  {INoteSet} noteSet
    * @returns noteSet's display name
    */
    private getNoteSetDisplayName(noteSet: INoteSet): string {
        if (noteSet.name && noteSet.name !== "" ) {
            return noteSet.name;
        }
        const alias = this._dataviewService.getOrCreateBaseDataviewQuery(noteSet);
        return alias && alias != "" ? alias : "blank noteSet";
    }

    /** Get noteSet's description (what notes are matched with its parameters)
    * @param  {INoteSet} noteSet
    * @returns string
    */
    private getNoteSetDescription(noteSet: INoteSet): string {
        let desc = "matches notes that ";
        if (noteSet.dataviewQuery && noteSet.dataviewQuery !== "") {
            desc += `are matched with dataviewJS query ${noteSet.dataviewQuery}`;
            return desc;
        }
        if (noteSet.tags?.length === 0 && noteSet.folders?.length === 0) {
            return "matches all notes"
        }
        if (noteSet.tags && noteSet.tags?.length > 0) {
            desc += `contain ${noteSet.tagsJoinType === JoinLogicOperators.AND ? "all" : "any"} of these tags: ${noteSet.tags.join(", ")}`;
            if (noteSet.folders && noteSet.folders?.length > 0) desc += ` ${noteSet.foldersToTagsJoinType === JoinLogicOperators.AND ? "and" : "or"} `;
        }
        if (noteSet.folders && noteSet.folders?.length > 0) {
            desc += `are inside any of these folders (including nested folders): ${noteSet.folders.join(", ")}`;
        }
        return desc;
    }

    private getDateOffsetByNDays(days: number): Date {
        const today = new Date();
        const offsetDate = new Date();
        offsetDate.setDate(today.getDate() - days);
        return offsetDate;
    }
}