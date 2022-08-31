import { App, TFile } from "obsidian";

const FRONTMATTER_REGEX = /^---\n((?:.*\n)*?)---/;

export class MetadataService {
    constructor(private app: App) { }

    public async setMetadataFieldValue(file: TFile = null, fieldName: string, newValue: string): Promise<void> {
        const fileContent = await app.vault.read(file);
        const fieldText = `${fieldName}: ${newValue}\n`;
        let newFileContent: string;

        const fieldRegex = this.createFieldRegex(fieldName);

        if (fieldRegex.test(fileContent)) {
            const result = fieldRegex.exec(fileContent);
            newFileContent = fileContent.replace(fieldRegex, `---\n${result[1]}${fieldText}${result[3]}---`);
        }
        else if (FRONTMATTER_REGEX.test(fileContent)) {
            const metadata = FRONTMATTER_REGEX.exec(fileContent);
            newFileContent = fileContent.replace(FRONTMATTER_REGEX, `---\n${metadata[1]}${fieldText}---`)
        } else {
            newFileContent = `---\n${fieldText}---\n\n${fileContent}}`;
        }

        await this.app.vault.modify(file, newFileContent);
    }

    private createFieldRegex(fieldName: string) {
        // match fieldname:somevalue
        //eslint-disable-next-line
        return new RegExp(`---\n(?:((?:.*\n)*)(${fieldName}\s*:\s*.*\n)((?:.*\n)*))---`);
    }

}