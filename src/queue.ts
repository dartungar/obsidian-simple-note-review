import { IQueueParams } from "./IQeueParams";
import {getAPI} from "obsidian-dataview";
import { App, TFile } from "obsidian";

export class Queue {
    public name: string;
    public params: IQueueParams;

    private _api = getAPI();

    // TODO: expand param options
    constructor(name: string, params: IQueueParams, private _app: App, private fieldName: string) {
        this.name = name;
        this.params = params;
     }

    // open next fine in queue
    public openNextFile(): void {
        const filePath = this.getNextFilePath();
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
    private getNextFilePath(): string {
        const pages = this._api.pages(this.createQueryString());
        const sorted = pages.sort(x => x[this.fieldName], "asc"); // TODO: filed without field come first - check default behavior
        return sorted.array()[0]["file"]["path"];
    }

    // TODO: validation
    // TODO: check if async works / is really needed
    private async changeOrAddMetadataValue(newValue: string): Promise<void> {
        const newFieldValue = `${this.fieldName}: ${newValue}`;
        const currentFile = this._app.workspace.getActiveFile();
        const fileContentSplit = await (await this._app.vault.read(currentFile)).split("\n");
        const page = this._api.page(currentFile.path);
        if (!page[this.fieldName]) {
            if (fileContentSplit[0] !== "---") {
                fileContentSplit.unshift("---");
                fileContentSplit.unshift("---");
            }
            fileContentSplit.splice(1, 0, newFieldValue);

            await this._app.vault.modify(currentFile, fileContentSplit.join("\n"));
            return;
        } 

        const newContent = fileContentSplit.map(line => {
            if (!line.startsWith(this.fieldName)) return line; // TODO: more precise matching
            return newFieldValue;
        });
        await this._app.vault.modify(currentFile, newContent.join("\n"));

        // TODO: show modal somewhere
    }

    private createQueryString(): string {
        // TODO: handle absence of params - throw an error?
        let tags = "";
        let folders = "";
        if (this.params.tags) {
            tags = this.params.tags.map(p => {
                if (p[0] !== "#") return "#" + p;
                return p;
            }).join(" or ");
        }

        if (this.params.folders) {
            folders = this.params.folders.join(" or ");
        }

        // TODO: switch for OR / AND
        if (tags && folders) return `(${tags}) and (${folders})`;

        if (tags) return tags;

        return folders;
    }
}