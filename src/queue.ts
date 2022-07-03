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

    public openNextFile(): void {
        const filePath = this.getNextFilePath();
        const abstractFile = this._app.vault.getAbstractFileByPath(filePath);
        this._app.workspace.getLeaf().openFile(abstractFile as TFile); // TODO: check if coercion works
    }

    public getNextFilePath(): string {
        const pages = this._api.pages(this.createQuery());
        console.log("found pages:", pages.array.length);
        const sorted = pages.sort(x => x[this.fieldName], "asc"); // TODO: return path
        console.log(sorted[0]);
        return sorted.array()[0]["file"]["path"]; // TODO: 
    }

    private createQuery(): string {
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