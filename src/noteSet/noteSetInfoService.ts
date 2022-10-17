import { JoinLogicOperators } from "src/settings/joinLogicOperators";
import { INoteSet } from "./INoteSet";
import { DataviewService } from "../dataview/dataviewService";
import { getDateOffsetByNDays } from "src/utils/dateUtils";

export class NoteSetInfoService {

    constructor(private _dataviewService: DataviewService) {  }

    // TODO: p.reviewed -> p.[setting for field name] !!
    public async updateNoteSetStats(noteSet: INoteSet): Promise<void> {
        const pages = await this._dataviewService.getNoteSetFiles(noteSet);
        noteSet.stats = {
            totalCount: pages.length,
            notRewiewedCount: pages.where(p => !p.reviewed).length, 
            reviewedLastSevenDaysCount: pages.where(p => p.reviewed > getDateOffsetByNDays(7)).length,
            reviewedLastThirtyDaysCount: pages.where(p => p.reviewed > getDateOffsetByNDays(30)).length
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

        if (!this._dataviewService.getOrCreateBaseDataviewQuery(noteSet)) {
            return "matches all notes"
        }

        let desc = "matches notes that ";
        if (noteSet.dataviewQuery && noteSet.dataviewQuery !== "") {
            desc += `are matched with dataviewJS query ${noteSet.dataviewQuery}`;
            return desc;
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


}