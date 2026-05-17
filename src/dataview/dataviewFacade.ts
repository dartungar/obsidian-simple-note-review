import { getAPI, DataviewApi, DataArray } from "obsidian-dataview";

export interface DataviewPage {
    file: {
        path: string;
        cday: Date;
        mday: Date;
    };
    reviewed?: string | Date | null;
    [field: string]: unknown;
}

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
        } catch (_error) {
            throw new DataviewNotInstalledError();
        }
    }

    public isDataviewInitialized(): boolean {
        return this._api.index.initialized;
    }

    public async pages(query: string): Promise<DataArray<DataviewPage>> {
        return await this.invokeAndReinitDvCacheOnError(() => this._api.pages(query)) as DataArray<DataviewPage>;
    }

    public async page(filepath: string): Promise<DataviewPage> {
        return await this.invokeAndReinitDvCacheOnError(() => this._api.page(filepath)) as DataviewPage;
    }

    public async validate(query: string): Promise<boolean> {
        const result = await this.invokeAndReinitDvCacheOnError(() => this._api.query(`LIST FROM ${query}`));
        return result.successful;
    }

    public async getMetadataFieldValue(filepath: string, fieldName: string): Promise<unknown> {
        const page = await this.page(filepath);
        return page[fieldName];
    }

    private async invokeAndReinitDvCacheOnError<TReturn>(func: () => TReturn): Promise<TReturn> {
            try {
                if (!this.isDataviewInstalled)
                    throw new DataviewNotInstalledError();
                return func();
            } catch (_error) {
                await this._api.index.reinitialize();
                return func();
            }
    }
}
