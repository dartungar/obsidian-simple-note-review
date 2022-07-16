import { IQueue } from "./IQueue";
import {DataArray, getAPI} from "obsidian-dataview";
import { App, TFile } from "obsidian";
import SimpleNoteReviewPlugin from "main";

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
        console.log("opening next file...");
        console.log("next file path is", filePath);
        const abstractFile = this._app.vault.getAbstractFileByPath(filePath);
        this._app.workspace.getLeaf().openFile(abstractFile as TFile); 
    }

    public async setMetadataValueToToday(file: TFile): Promise<void> {
        const todayString = new Date().toISOString().slice(0, 10); // "yyyy-mm-dd"
        await this.changeOrAddMetadataValue(file, todayString);
        this._plugin.showNotice(`Marked note "${file.path}" as reviewed today.`)
    }

    public getQueueDisplayName(queue: IQueue): string {
        return queue.name && queue.name != "" 
            ? queue.name 
            : this.getOrCreateDataviewQuery(queue);
    }

    private getNextFilePath(queue: IQueue): string {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let pages: DataArray<Record<string, any>>;
        const query = queue.dataviewQuery ?? this.getOrCreateDataviewQuery(queue);
        try {
            pages = this._api.pages(query);
        } catch (error) {
            throw new DataviewQueryError(`Query "${query}" contains errors. Please check settings for queue "${queue.name}".`)
        }
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

    private pathEqualsCurrentFilePath(path: string): boolean {
        return path === this._app.workspace.getActiveFile().path;
    }

    // TODO: validation
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

        // TODO: show modal somewhere
    }

    private getOrCreateDataviewQuery(queue: IQueue): string {
        if (queue.dataviewQuery != "") 
            return queue.dataviewQuery;
        
        // TODO: handle absence of params - throw an error?
        let tags = "";
        let folders = "";
        if (queue.tags) {
            tags = queue.tags.map(p => {
                if (p[0] !== "#") return "#" + p;
                return p;
            }).join(" or ");
        }

        if (queue.folders) {
            folders = queue.folders.join(" or ");
        }

        // TODO: switch for OR / AND
        if (tags && folders) return `(${tags}) and (${folders})`;

        if (tags) return tags;

        return folders;
    }
}