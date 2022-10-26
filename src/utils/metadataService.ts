import { App, TFile } from "obsidian";

// matches whole YAML frontmatter
const FRONTMATTER_REGEX = /^---\r?\n((?:.*\r?\n)+?)---/;
// matches any number of fields in frontmatter
const FIELDS_REGEX_PART = '((?:.*\n)*)';

export interface IMetadataField {
    name: string,
    value: string
}

export class MetadataService {
    constructor(private app: App) { }

    
    /** Change or add metadata field and value, and save modified file.
     * @param  {TFile=null} file
     * @param  {IMetadataField[]} fields
     * @returns Promise
     */
    public async setAndSaveMetadataFieldsValue(file: TFile = null, fields: IMetadataField[]): Promise<void> {
        const fileContent = await app.vault.read(file);
        let newFileContent = fileContent;
        for (const field of fields) {
            newFileContent = this.setMetadataFieldValue(newFileContent, field);
        }
        await this.app.vault.modify(file, newFileContent);
    }

    /** Change or add multiple metadata fields and their values, and save modified file.
     * @param  {TFile=null} file 
     * @param  {IMetadataField} field
     * @returns Promise
     */
    public async setAndSaveMetadataFieldValue(file: TFile = null, field: IMetadataField): Promise<void> {
        this.setAndSaveMetadataFieldsValue(file, [field]);
    }

    private setMetadataFieldValue(fileContent: string, data: IMetadataField): string {
        const fieldText = `${data.name}: ${data.value}\n`;
        let newFileContent: string;

        const fieldRegex = this.createFieldRegex(data.name);

        if (fieldRegex.test(fileContent)) {
            const result = fieldRegex.exec(fileContent);
            const partBefore = result[1];
            const partAfter = result[3];
            newFileContent = fileContent.replace(fieldRegex, `---\n${partBefore}${fieldText}${partAfter}---`);
        }
        else if (FRONTMATTER_REGEX.test(fileContent)) {
            const metadata = FRONTMATTER_REGEX.exec(fileContent);
            const partBefore = metadata[1];
            newFileContent = fileContent.replace(FRONTMATTER_REGEX, `---\n${partBefore}${fieldText}---`)
        } else {
            newFileContent = `---\n${fieldText}---\n\n${fileContent}`;
        }

        return newFileContent;
    }

    private createSingleFieldRegexString(fieldName: string): string {
        //eslint-disable-next-line
        return `(${fieldName}\s*:\s*.*\n)`;
    }

    private createFieldRegex(fieldName: string): RegExp {
        // match fieldname:somevalue
        //eslint-disable-next-line
        return new RegExp(`---\n(?:${FIELDS_REGEX_PART}${this.createSingleFieldRegexString(fieldName)}${FIELDS_REGEX_PART})---`);
    }

}