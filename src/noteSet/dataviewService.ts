import { DataArray } from "obsidian-dataview";
import { DataviewFacade, DataviewNotInstalledError } from "src/dataview/dataviewFacade";
import { INoteSet } from "./INoteSet";
import { DataviewQueryError } from "./noteSetService";


export class DataviewService {
    private _dataviewApi = new DataviewFacade();

    public getNoteSetFiles(noteSet: INoteSet): DataArray<Record<string, any>> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query = this.getOrCreateBaseDataviewQuery(noteSet);
        try {
            return this._dataviewApi.pages(query);
        } catch (error) {
            if (error instanceof DataviewNotInstalledError) {
                throw error;
            } else {
                throw new DataviewQueryError(`Query "${query}" contains errors. Please check settings for the current noteSet.`)
            }
        }
    }

    public getOrCreateBaseDataviewQuery(noteSet: INoteSet): string {
        if (noteSet.dataviewQuery && noteSet.dataviewQuery != "") 
            return noteSet.dataviewQuery;
        
        let tags = "";
        let folders = "";
        if (noteSet.tags) {
            tags = noteSet.tags.map(p => {
                if (p[0] !== "#") return "#" + p;
                return p;
            }).join(` ${noteSet.tagsJoinType || "or"} `);
        }

        if (noteSet.folders) {
            folders = noteSet.folders.join(" or ");
        }

        if (tags && folders) return `(${tags}) ${noteSet.foldersToTagsJoinType || "or"} (${folders})`;

        if (tags) return tags;

        return folders;

    }

    public getPageFromPath(path: string): Record<string, any> {
        return this._dataviewApi.page(path);
    }

    
}