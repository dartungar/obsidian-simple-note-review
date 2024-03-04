import { getAPI, DataviewApi, DataArray } from "obsidian-dataview";

export class DataviewNotInstalledError extends Error {
    constructor() {
        super();
        this.message = "Dataview plugin not installed. To use Simple Note Review, Dataview plugin is needed.";
    }
}

export class DataviewFacade {
    private _api: DataviewApi;
    public isDataviewInstalled = false;

    constructor() {
        try {
            this._api = getAPI();
            if (this._api)
                this.isDataviewInstalled = true;
        } catch (error) {
            throw new DataviewNotInstalledError();
        }
    }

    public isDataviewInitialized(): boolean {
        return this._api.index.initialized;
    }

    public async pages(query: string): Promise<DataArray<Record<string, any>>> {
        return await this.invokeAndReinitDvCacheOnError(() => this._api.pages(query));
    }

    public async page(filepath: string): Promise<Record<string, any>> {
        return await this.invokeAndReinitDvCacheOnError(() => this._api.page(filepath));
    }

    public async validate(query: string): Promise<boolean> {
        const result = await this.invokeAndReinitDvCacheOnError(() => this._api.query(`LIST FROM ${query}`));
        return result.successful;
    }

    public async getMetadataFieldValue(filepath: string, fieldName: string): Promise<string> {
        const page = await this.page(filepath);
        return page[fieldName];
    }

    private async invokeAndReinitDvCacheOnError<TReturn>(func: (...args: any[]) 
        => TReturn, ...args: any[]): Promise<TReturn> {
            try {
                if (!this.isDataviewInstalled)
                    throw new DataviewNotInstalledError();
                return func(args);
            } catch (error) {
                await this._api.index.reinitialize();
                return func(args);
            }
    }
}