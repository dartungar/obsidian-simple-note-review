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
    private _api: DataviewApi | undefined;
    public isDataviewInstalled = false;

    constructor() {
        this._api = getAPI();
        this.isDataviewInstalled = this._api !== undefined;
    }

    public isDataviewInitialized(): boolean {
        return this._api?.index.initialized ?? false;
    }

    public async pages(query?: string): Promise<DataArray<DataviewPage>> {
        return await this.invokeAndReinitDvCacheOnError(() => this.api.pages(query)) as DataArray<DataviewPage>;
    }

    public async page(filepath: string): Promise<DataviewPage | undefined> {
        return await this.invokeAndReinitDvCacheOnError(() => this.api.page(filepath)) as DataviewPage | undefined;
    }

    public async validate(query?: string): Promise<boolean> {
        const result = await this.invokeAndReinitDvCacheOnError(() => this.api.query(query ? `LIST FROM ${query}` : "LIST"));
        return result.successful;
    }

    public async getMetadataFieldValue(filepath: string, fieldName: string): Promise<unknown> {
        const page = await this.page(filepath);
        return page?.[fieldName];
    }

    private async invokeAndReinitDvCacheOnError<TReturn>(func: () => TReturn): Promise<TReturn> {
            try {
                return func();
            } catch (error) {
                if (error instanceof DataviewNotInstalledError) {
                    throw error;
                }
                await this.api.index.reinitialize();
                return func();
            }
    }

    private get api(): DataviewApi {
        if (!this._api) {
            throw new DataviewNotInstalledError();
        }

        return this._api;
    }
}
