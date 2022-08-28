import { DataArray } from "obsidian-dataview";
import { DataviewFacade, DataviewNotInstalledError } from "src/dataview/dataviewFacade";
import { IQueue } from "./IQueue";
import { DataviewQueryError } from "./queueService";


export class DataviewService {
    private _dataviewApi = new DataviewFacade();

    public getQueueFiles(queue: IQueue): DataArray<Record<string, any>> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query = this.getOrCreateBaseDataviewQuery(queue);
        try {
            return this._dataviewApi.pages(query);
        } catch (error) {
            if (error instanceof DataviewNotInstalledError) {
                throw error;
            } else {
                throw new DataviewQueryError(`Query "${query}" contains errors. Please check settings for the current queue.`)
            }
        }
    }

    public getOrCreateBaseDataviewQuery(queue: IQueue): string {
        if (queue.dataviewQuery && queue.dataviewQuery != "") 
            return queue.dataviewQuery;
        
        let tags = "";
        let folders = "";
        if (queue.tags) {
            tags = queue.tags.map(p => {
                if (p[0] !== "#") return "#" + p;
                return p;
            }).join(` ${queue.tagsJoinType || "or"} `);
        }

        if (queue.folders) {
            folders = queue.folders.join(" or ");
        }

        if (tags && folders) return `(${tags}) ${queue.foldersToTagsJoinType || "or"} (${folders})`;

        if (tags) return tags;

        return folders;

    }

    public getPageFromPath(path: string): Record<string, any> {
        return this._dataviewApi.page(path);
    }

    
}