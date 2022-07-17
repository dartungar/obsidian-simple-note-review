import { IQueue } from "./IQueue";
import {DataArray, getAPI} from "obsidian-dataview";
import { App, TFile } from "obsidian";
import SimpleNoteReviewPlugin from "main";
import { JoinLogicOperators } from "../joinLogicOperators";

export class QueueEmptyError extends Error {
    message = "Queue is empty";
}

export class DataviewQueryError extends Error { }

export class QueueService {

    private _api = getAPI();

    constructor(private _app: App, private _plugin: SimpleNoteReviewPlugin) { }

    // open next fine in queue
    public openNextFile(queue: IQueue): void {
        const filePath = this.getNextFilePath(queue);
        const abstractFile = this._app.vault.getAbstractFileByPath(filePath);
        this._app.workspace.getLeaf().openFile(abstractFile as TFile); 
    }

    public async setMetadataValueToToday(file: TFile): Promise<void> {
        const todayString = new Date().toISOString().slice(0, 10); // "yyyy-mm-dd"
        await this.changeOrAddMetadataValue(file, todayString);
        this._plugin.showNotice(`Marked note "${file.path}" as reviewed today.`)
    }

    public getQueueDisplayName(queue: IQueue): string {
        if (queue.name && queue.name != "" ) {
            return queue.name;
        }
        const alias = this.getOrCreateDataviewQuery(queue);
        return alias && alias != "" ? alias : "blank queue";
    }

    public getSchemaDescription(queue: IQueue): string {
        let desc = "matches notes that ";
        if (queue.dataviewQuery && queue.dataviewQuery != "") {
            desc += `are matched with dataviewJS query ${queue.dataviewQuery}`;
            return desc;
        }
        if (queue.tags.length === 0 && queue.folders.length === 0) {
            return "matches all notes"
        }
        if (queue.tags && queue.tags.length > 0) {
            desc += `contain ${queue.tagsJoinType === JoinLogicOperators.AND ? "all" : "any"} of these tags: ${queue.tags.join(", ")}`;
            if (queue.folders.length > 0) desc += ` ${queue.foldersToTagsJoinType === JoinLogicOperators.AND ? "and" : "or"} `;
        }
        if (queue.folders && queue.folders.length > 0) {
            desc += `are inside any of these folders (including nested folders): ${queue.folders.join(", ")}`;
        }
        return desc;
    }

    public getQueueFilesQty(queue: IQueue): number {
        const pages = this.getQueueFiles(queue);
        return pages.length;
    }

    private getNextFilePath(queue: IQueue): string {
        const pages = this.getQueueFiles(queue);
        const sorted = pages.sort(x => x[this._plugin.settings.fieldName], "asc").array(); // TODO: files without field should come first - check default behavior
        if (sorted.length > 0) {
            const firstInQueue = sorted[0]["file"]["path"];
            if (sorted.length === 1) {
                return firstInQueue;
            }
            const nextInQueue = sorted[1]["file"]["path"];
            return this.pathEqualsCurrentFilePath(firstInQueue) ? nextInQueue : firstInQueue;
        } 
        throw new QueueEmptyError();
    }

    private getQueueFiles(queue: IQueue): DataArray<Record<string, any>> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query = this.getOrCreateDataviewQuery(queue);
        console.log("query:", query);
        try {
            return this._api.pages(query);
        } catch (error) {
            throw new DataviewQueryError(`Query "${query}" contains errors. Please check settings for queue "${this.getQueueDisplayName(queue)}".`)
        }
    }

    private pathEqualsCurrentFilePath(path: string): boolean {
        return path === this._app.workspace.getActiveFile().path;
    }

    // TODO: check if async works / is really needed
    private async changeOrAddMetadataValue(file: TFile = null, value: string): Promise<void> {
        const newFieldValue = `${this._plugin.settings.fieldName}: ${value}`;
        const fileContentSplit = (await this._app.vault.read(file)).split("\n");
        const page = this._api.page(file.path);
        if (!page[this._plugin.settings.fieldName]) {
            if (fileContentSplit[0] !== "---") {
                fileContentSplit.unshift("---");
                fileContentSplit.unshift("---");
            }
            fileContentSplit.splice(1, 0, newFieldValue);

            await this._app.vault.modify(file, fileContentSplit.join("\n"));
            return;
        } 

        const newContent = fileContentSplit.map(line => {
            if (!line.startsWith(this._plugin.settings.fieldName)) return line; // TODO: more precise matching
            return newFieldValue;
        });
        await this._app.vault.modify(file, newContent.join("\n"));
    }

    private getOrCreateDataviewQuery(queue: IQueue): string {
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


}