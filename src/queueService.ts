import { IQueue } from "./IQueue";
import {getAPI} from "obsidian-dataview";
import { App, TFile } from "obsidian";
import SimpleNoteReviewPlugin from "main";

export class QueueService {

    private _api = getAPI();

    // TODO: expand param options
    constructor(private _app: App, private _plugin: SimpleNoteReviewPlugin) { }

    // open next fine in queue
    public openNextFile(queue: IQueue): void {
        const filePath = this.getNextFilePath(queue);
        const abstractFile = this._app.vault.getAbstractFileByPath(filePath);
        this._app.workspace.getLeaf().openFile(abstractFile as TFile); 
    }

    // TODO
    public async setMetadataValueToToday(): Promise<void> {
        const todayString = new Date().toISOString().slice(0, 10); // "yyyy-mm-dd"
        await this.changeOrAddMetadataValue(todayString);
    }

    // TODO: maybe it's better to store queue in memory, if DataView is not fast enough
    // TODO: make async
    private getNextFilePath(queue: IQueue): string {
        const pages = this._api.pages(queue.dataviewQuery ?? this.createDataviewQuery(queue));
        const sorted = pages.sort(x => x[this._plugin.settings.fieldName], "asc"); // TODO: files without field come first - check default behavior
        return sorted.array()[0]["file"]["path"];
    }

    // TODO: validation
    // TODO: check if async works / is really needed
    private async changeOrAddMetadataValue(newValue: string): Promise<void> {
        const newFieldValue = `${this._plugin.settings.fieldName}: ${newValue}`;
        const currentFile = this._app.workspace.getActiveFile();
        const fileContentSplit = await (await this._app.vault.read(currentFile)).split("\n");
        const page = this._api.page(currentFile.path);
        if (!page[this._plugin.settings.fieldName]) {
            if (fileContentSplit[0] !== "---") {
                fileContentSplit.unshift("---");
                fileContentSplit.unshift("---");
            }
            fileContentSplit.splice(1, 0, newFieldValue);

            await this._app.vault.modify(currentFile, fileContentSplit.join("\n"));
            return;
        } 

        const newContent = fileContentSplit.map(line => {
            if (!line.startsWith(this._plugin.settings.fieldName)) return line; // TODO: more precise matching
            return newFieldValue;
        });
        await this._app.vault.modify(currentFile, newContent.join("\n"));

        // TODO: show modal somewhere
    }

    private createDataviewQuery(queue: IQueue): string {
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