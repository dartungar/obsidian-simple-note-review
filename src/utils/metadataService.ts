import { App, TFile } from "obsidian";

export interface IMetadataField {
    name: string,
    value: string
}

export class MetadataService {
    constructor(private _app: App) { }

    
    /** Change or add metadata field and value, and save modified file.
     * @param  {TFile=null} file
     * @param  {IMetadataField[]} fields
     * @returns Promise
     */
    public async setAndSaveMetadataFieldsValue(file: TFile, fields: IMetadataField[]): Promise<void> {
        await this._app.fileManager.processFrontMatter(
            file,
            (frontmatter: Record<string, string>) => {
                for (const field of fields) {
                    frontmatter[field.name] = field.value;
                }
            }
        );
    }

    /** Change or add multiple metadata fields and their values, and save modified file.
     * @param  {TFile=null} file 
     * @param  {IMetadataField} field
     * @returns Promise
     */
    public async setAndSaveMetadataFieldValue(file: TFile, field: IMetadataField): Promise<void> {
        await this.setAndSaveMetadataFieldsValue(file, [field]);
    }

}
