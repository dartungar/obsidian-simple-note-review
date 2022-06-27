import { IQueueParams } from "./IQeueParams";
import {getAPI} from "obsidian-dataview";
import { App } from "obsidian";

export class Queue {
    private _api = getAPI();

    // TODO: expand param options
    constructor(private _params: IQueueParams, private _app: App, private fieldName: string) { }

    getNextFile(): void {
        const pages = this._api.pages(this.createQuery());
        console.log("found pages:", pages.array.length);
        const sorted = pages.sort(x => x[this.fieldName], "desc"); // TODO: check if query works
        const first = sorted.array()[0];
        console.log(first);
    }

    createQuery(): string {
        return "#to_review";
    }
}