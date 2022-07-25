import { getAPI, DataviewApi, DataArray } from "obsidian-dataview";

export class DataviewNotInstalledError extends Error {
    constructor() {
        super();
        this.message = "Dataview plugin not installed";
    }
}

export class DataviewFacade {
    private _api: DataviewApi;
    public isDataviewInstalled = false;

    constructor() {
        try {
            this._api = getAPI();
            this.isDataviewInstalled = true;
        } catch (error) {
            throw new DataviewNotInstalledError();
        }
    }

    public pages(query: string): DataArray<Record<string, any>> {
        this.throwIfDataviewNotInstalled();
        return this._api.pages(query);
    }

    public page(filepath: string): Record<string, any> {
        this.throwIfDataviewNotInstalled();
        return this._api.page(filepath);
    }

    private throwIfDataviewNotInstalled() {
        if (!this.isDataviewInstalled)
            throw new DataviewNotInstalledError();
    }
}