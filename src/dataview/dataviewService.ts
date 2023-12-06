import { DataArray } from "obsidian-dataview";
import { DataviewFacade, DataviewNotInstalledError } from "src/dataview/dataviewFacade";
import { getDateOffsetByNDays } from "src/utils/dateUtils";
import { INoteSet } from "../noteSet/INoteSet";
import { DataviewQueryError } from "../noteSet/noteSetService";


export class DataviewService {
    private _dataviewApi = new DataviewFacade();

    public async getNoteSetFiles(noteSet: INoteSet): Promise<DataArray<Record<string, any>>> {
        const query = this.getOrCreateBaseDataviewQuery(noteSet);
        try {
            let pages = await this._dataviewApi.pages(query);
            if (noteSet.createdInLastNDays) {
                pages = pages.where(p => p.file.cday > getDateOffsetByNDays(noteSet.createdInLastNDays)); 
            }
            if (noteSet.modifiedInLastNDays) {
                pages = pages.where(p => p.file.mday > getDateOffsetByNDays(noteSet.modifiedInLastNDays));
            }
            return pages;
        } catch (error) {
            if (error instanceof DataviewNotInstalledError) {
                throw error;
            } else {
                console.error(`Simple Note Review - dataview API error: ${error.message}`);
                throw new DataviewQueryError(`Error while trying to get next note in noteset "${query}" via Dataview API. Please check noteset settings and/or disabling and enabling Simple Note Review plugin again.`)
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

        if (folders) return folders;

        return null;
    }

    public validateQuery(query: string): Promise<boolean> {
        return this._dataviewApi.validate(query);
    }

    public getPageFromPath(filepath: string): Record<string, any> {
        return this._dataviewApi.page(filepath);
    }

    public async getMetadataFieldValue(filepath: string, fieldName: string): Promise<string> {
        return await this._dataviewApi.getMetadataFieldValue(filepath, fieldName);
    }

    
}