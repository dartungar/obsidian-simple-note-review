import { JoinLogicOperators } from "src/joinLogicOperators";
import { IQueue } from "./IQueue";
import { DataviewService } from "./dataviewService";

export class QueueInfoService {

    constructor(private _dataviewService: DataviewService) {  }

    public updateQueueStats(queue: IQueue) {
        const pages = this._dataviewService.getQueueFiles(queue);
        queue.stats = {
            totalCount: pages.length,
            notRewiewedCount: pages.where(p => !p.reviewed).length, 
            reviewedLastSevenDaysCount: pages.where(p => p.reviewed > this.getDateOffsetByNDays(7)).length,
            reviewedLastThirtyDaysCount: pages.where(p => p.reviewed > this.getDateOffsetByNDays(30)).length
        }
    }

    public updateQueueDisplayNameAndDescription(queue: IQueue) {
        queue.displayName = this.getQueueDisplayName(queue);
        queue.description = this.getQueueDescription(queue);
    }

    /** Get display name (set by user or generated from queue parameters)
    * @param  {IQueue} queue
    * @returns queue's display name
    */
    private getQueueDisplayName(queue: IQueue): string {
        if (queue.name && queue.name !== "" ) {
            return queue.name;
        }
        const alias = this._dataviewService.getOrCreateBaseDataviewQuery(queue);
        return alias && alias != "" ? alias : "blank queue";
    }

    /** Get queue's description (what notes are matched with its parameters)
    * @param  {IQueue} queue
    * @returns string
    */
    private getQueueDescription(queue: IQueue): string {
        let desc = "matches notes that ";
        if (queue.dataviewQuery && queue.dataviewQuery !== "") {
            desc += `are matched with dataviewJS query ${queue.dataviewQuery}`;
            return desc;
        }
        if (queue.tags?.length === 0 && queue.folders?.length === 0) {
            return "matches all notes"
        }
        if (queue.tags && queue.tags?.length > 0) {
            desc += `contain ${queue.tagsJoinType === JoinLogicOperators.AND ? "all" : "any"} of these tags: ${queue.tags.join(", ")}`;
            if (queue.folders && queue.folders?.length > 0) desc += ` ${queue.foldersToTagsJoinType === JoinLogicOperators.AND ? "and" : "or"} `;
        }
        if (queue.folders && queue.folders?.length > 0) {
            desc += `are inside any of these folders (including nested folders): ${queue.folders.join(", ")}`;
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