import { INoteSet } from "./INoteSet";
import { App, TAbstractFile, TFile} from "obsidian";
import SimpleNoteReviewPlugin from "main";
import { DataviewService } from "./dataviewService";
import { NoteSetInfoService as NoteSetInfoService } from "./noteSetInfoService";


export class NoteSetEmptyError extends Error {
    message = "Note set is empty";
}
export class DataviewQueryError extends Error { }

export class NoteSetService {
    private _dataviewService = new DataviewService();
    private _noteSetInfoService = new NoteSetInfoService(this._dataviewService);

    constructor(private _app: App, private _plugin: SimpleNoteReviewPlugin) { }

    /** Mark note as reviewed today. If setting "open next note in noteSet after reviewing" is enabled,
     * open next note in noteSet (current noteSet by default).
     * @param  {TAbstractFile} note
     * @param  {INoteSet=this._plugin.settings.currentnoteSet} noteSet
     * @returns Promise
     */
    public updateNoteSetDisplayNames() {
        this._plugin.settings.noteSets.forEach(q => this.updateNoteSetDisplayNameAndDescription(q));
    } 

    public updateNoteSetDisplayNameAndDescription(noteSet: INoteSet) {
        this._noteSetInfoService.updateNoteSetDisplayNameAndDescription(noteSet);
    }

    public updateNoteSetStats(noteSet: INoteSet) {
        this._noteSetInfoService.updateNoteSetStats(noteSet);
    }

    public async reviewNote(note: TAbstractFile, noteSet: INoteSet = this._plugin.settings.currentNoteSet): Promise<void> {
        // "note" must be an actual note, not folder
        if (!(note instanceof TFile))
            return;
        try {
            await this.setMetadataValueToToday(note);
        } catch (error) {
            this._plugin.showNotice(error.message);
        }
        
        if (this._plugin.settings.openNextNoteAfterReviewing) {
            await this.openNextFile(noteSet);
        }
    }


    /** Open next file in noteSet.
     * @param  {INoteSet} noteSet
     * @returns Promise
     */
    public async openNextFile(noteSet: INoteSet): Promise<void> {
        const filePath = this.getNextFilePath(noteSet);
        const abstractFile = this._app.vault.getAbstractFileByPath(filePath);
        await this._app.workspace.getLeaf().openFile(abstractFile as TFile); 
    }


    /** Set value of metadata field "reviewed" to today in yyyy-mm-dd format.
     * @param  {TFile} file
     * @returns Promise
     */
    public async setMetadataValueToToday(file: TFile): Promise<void> {
        const todayString = new Date().toISOString().slice(0, 10); // "yyyy-mm-dd"
        await this.changeOrAddMetadataValue(file, todayString);
        this._plugin.showNotice(`Marked note "${file.path}" as reviewed today.`)
    }

    private getNextFilePath(noteSet: INoteSet): string {
        const pages = this._dataviewService.getNoteSetFiles(noteSet);
        const sorted = pages.sort(x => x[this._plugin.settings.fieldName], "asc").array();
        if (sorted.length > 0) {
            const firstNoteIndex = this._plugin.settings.openRandomNote ? ~~(Math.random() * sorted.length) : 0;
            const firstInnoteSet = sorted[firstNoteIndex]["file"]["path"];
            if (sorted.length === 1) {
                return firstInnoteSet;
            }
            const nextInnoteSet = sorted[1]["file"]["path"];
            return this.pathEqualsCurrentFilePath(firstInnoteSet) ? nextInnoteSet : firstInnoteSet;
        } 
        throw new NoteSetEmptyError();
    }

    private pathEqualsCurrentFilePath(path: string): boolean {
        return path === this._app.workspace.getActiveFile().path;
    }

    // TODO: check if async works / is really needed
    // TODO: do not mangle metadata
    private async changeOrAddMetadataValue(file: TFile = null, value: string): Promise<void> {
        const newFieldValue = `${this._plugin.settings.fieldName}: ${value}`;
        const fileContentSplit = (await this._app.vault.read(file)).split("\n");
        const page = this._dataviewService.getPageFromPath(file.path);
        if (!page[this._plugin.settings.fieldName]) {
            if (fileContentSplit[0] !== "---") {
                fileContentSplit.unshift("---");
                fileContentSplit.unshift("---");
            }
            fileContentSplit.splice(1, 0, newFieldValue);

            await this._app.vault.modify(file, fileContentSplit.join("\n"));
            return;
        } 

        const newContent = fileContentSplit.map(line => {
            if (!line.startsWith(this._plugin.settings.fieldName)) return line; // TODO: more precise matching
            return newFieldValue;
        });
        await this._app.vault.modify(file, newContent.join("\n"));
    }

}