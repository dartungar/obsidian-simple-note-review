import { DataArray } from "obsidian-dataview";
import { DataviewFacade, DataviewNotInstalledError, DataviewPage } from "src/dataview/dataviewFacade";
import { getDateOffsetByNDays } from "src/utils/dateUtils";
import { INoteSet } from "../noteSet/INoteSet";
import { IFrontmatterPropertyFilter } from "../noteSet/IFrontmatterPropertyFilter";
import { JoinLogicOperators } from "../settings/joinLogicOperators";
import { DataviewQueryError } from "../noteSet/noteSetService";


export class DataviewService {
    private _dataviewApi = new DataviewFacade();

    get isDataviewInitialized(): boolean {
        return this._dataviewApi.isDataviewInitialized();
    } 

    get isDataviewInstalled(): boolean {
        return this._dataviewApi.isDataviewInstalled;
    }

    public async getNoteSetFiles(noteSet: INoteSet): Promise<DataArray<DataviewPage>> {
        const hasCustomQuery = Boolean(noteSet.dataviewQuery && noteSet.dataviewQuery !== "");
        const hasProperties = Boolean(noteSet.frontmatterProperties && noteSet.frontmatterProperties.length > 0);
        const filterCriteriaInMemory = hasProperties && !hasCustomQuery;
        const query = filterCriteriaInMemory ? undefined : this.getOrCreateBaseDataviewQuery(noteSet);
        try {
            let pages = await this._dataviewApi.pages(query);
            if (filterCriteriaInMemory) {
                pages = pages.where(p => this.matchesCriteriaGroups(p, noteSet));
            }
            if (noteSet.createdInLastNDays) {
                pages = pages.where(p => p.file.cday > getDateOffsetByNDays(noteSet.createdInLastNDays));
            }
            if (noteSet.modifiedInLastNDays) {
                pages = pages.where(p => p.file.mday > getDateOffsetByNDays(noteSet.modifiedInLastNDays));
            }
            return pages;
        } catch (error) {
            if (error instanceof DataviewNotInstalledError) {
                throw error;
            } else {
                console.error(`Simple Note Review - dataview API error: ${error instanceof Error ? error.message : String(error)}`);
                throw new DataviewQueryError(`Error while trying to get next note in noteset "${query}" via Dataview API. Please check noteset settings and/or disabling and enabling Simple Note Review plugin again.`)
            }
        }
    }

    public getOrCreateBaseDataviewQuery(noteSet: INoteSet): string | undefined {
        if (noteSet.dataviewQuery && noteSet.dataviewQuery != "")
            return noteSet.dataviewQuery;

        let tags = "";
        let folders = "";
        if (noteSet.tags) {
            tags = noteSet.tags.map(p => {
                if (p[0] !== "#") return "#" + p;
                return p;
            }).join(` ${noteSet.tagsJoinType || "or"} `);
        }

        if (noteSet.folders) {
            folders = noteSet.folders.join(" or ");
        }

        if (tags && folders) return `(${tags}) ${noteSet.criteriaJoinType || "or"} (${folders})`;

        if (tags) return tags;

        if (folders) return folders;

        return undefined;
    }

    public validateQuery(query?: string): Promise<boolean> {
        return this._dataviewApi.validate(query);
    }

    public getPageFromPath(filepath: string): Promise<DataviewPage | undefined> {
        return this._dataviewApi.page(filepath);
    }

    public async getMetadataFieldValue(filepath: string, fieldName: string): Promise<unknown> {
        return await this._dataviewApi.getMetadataFieldValue(filepath, fieldName);
    }

    private matchesCriteriaGroups(page: DataviewPage, noteSet: INoteSet): boolean {
        const groupResults: boolean[] = [];

        if (noteSet.tags && noteSet.tags.length > 0) {
            groupResults.push(this.matchesTags(page, noteSet.tags, noteSet.tagsJoinType));
        }

        if (noteSet.folders && noteSet.folders.length > 0) {
            groupResults.push(this.matchesFolders(page, noteSet.folders));
        }

        if (noteSet.frontmatterProperties && noteSet.frontmatterProperties.length > 0) {
            groupResults.push(this.matchesProperties(page, noteSet.frontmatterProperties, noteSet.frontmatterPropertiesJoinType));
        }

        if (groupResults.length === 0) {
            return true;
        }

        return noteSet.criteriaJoinType === JoinLogicOperators.AND
            ? groupResults.every(Boolean)
            : groupResults.some(Boolean);
    }

    private matchesTags(page: DataviewPage, tags: string[], joinType: JoinLogicOperators): boolean {
        const pageTags = page.file?.tags ? Array.from(page.file.tags, tag => tag.toLowerCase()) : [];
        const normalizedTags = tags.map(tag => (tag[0] !== "#" ? "#" + tag : tag).toLowerCase());
        const matchesTag = (tag: string) => pageTags.some(pt => pt === tag || pt.startsWith(`${tag}/`));
        return joinType === JoinLogicOperators.AND
            ? normalizedTags.every(matchesTag)
            : normalizedTags.some(matchesTag);
    }

    private matchesFolders(page: DataviewPage, folders: string[]): boolean {
        const path = page.file?.path ?? "";
        return folders.some(folder => {
            const normalizedFolder = this.normalizeFolderSource(folder);
            return normalizedFolder.length > 0
                && (path === normalizedFolder || path.startsWith(`${normalizedFolder}/`));
        });
    }

    private matchesProperties(page: DataviewPage, properties: IFrontmatterPropertyFilter[], joinType: JoinLogicOperators): boolean {
        const matchesProperty = (filter: IFrontmatterPropertyFilter) => {
            const propertyKey = this.findPropertyKey(page, filter.name);
            if (propertyKey === undefined) {
                return false;
            }
            if (!filter.value) {
                return true;
            }
            return this.matchesFrontmatterProperty(page[propertyKey], [filter.value], JoinLogicOperators.OR);
        };
        return joinType === JoinLogicOperators.AND
            ? properties.every(matchesProperty)
            : properties.some(matchesProperty);
    }

    private matchesFrontmatterProperty(actualValue: unknown, allowedValues: string[], joinType: JoinLogicOperators): boolean {
        const actualValues = this.normalizePropertyValueToStrings(actualValue);
        if (!allowedValues || allowedValues.length === 0) {
            return actualValues.length > 0;
        }

        const matchesValue = (allowed: string) => actualValues.some(v => v.toLowerCase() === allowed.toLowerCase());
        return joinType === JoinLogicOperators.AND
            ? allowedValues.every(matchesValue)
            : allowedValues.some(matchesValue);
    }

    private normalizePropertyValueToStrings(value: unknown): string[] {
        if (value === null || value === undefined) {
            return [];
        }

        if (Array.isArray(value)) {
            return value.flatMap(v => this.normalizePropertyValueToStrings(v));
        }

        if (value instanceof Date) {
            if (Number.isNaN(value.getTime())) {
                return [];
            }
            const isoDateTime = value.toISOString();
            return [isoDateTime, isoDateTime.slice(0, 10)];
        }

        if (this.isDataviewDate(value)) {
            return [value.toISO(), value.toISODate()]
                .filter((dateValue): dateValue is string => typeof dateValue === "string" && dateValue.length > 0);
        }

        if (this.isDataviewLink(value)) {
            return [value.path];
        }

        return [String(value)];
    }

    private isDataviewLink(value: unknown): value is { path: string } {
        return typeof value === "object" && value !== null && "path" in value;
    }

    private isDataviewDate(value: unknown): value is { toISO(): string | null; toISODate(): string | null } {
        return typeof value === "object"
            && value !== null
            && "toISO" in value
            && typeof (value as { toISO?: unknown }).toISO === "function"
            && "toISODate" in value
            && typeof (value as { toISODate?: unknown }).toISODate === "function";
    }

    private findPropertyKey(page: DataviewPage, propertyName: string): string | undefined {
        if (Object.prototype.hasOwnProperty.call(page, propertyName)) {
            return propertyName;
        }

        const normalizedPropertyName = propertyName.toLowerCase();
        return Object.keys(page).find(key => key.toLowerCase() === normalizedPropertyName);
    }

    private normalizeFolderSource(folder: string): string {
        let normalizedFolder = folder.trim();
        const isDoubleQuoted = normalizedFolder.startsWith('"') && normalizedFolder.endsWith('"');
        const isSingleQuoted = normalizedFolder.startsWith("'") && normalizedFolder.endsWith("'");
        if (isDoubleQuoted || isSingleQuoted) {
            normalizedFolder = normalizedFolder.slice(1, -1);
        }

        return normalizedFolder.replace(/^\.\//, "").replace(/^\/+|\/+$/g, "");
    }
}
