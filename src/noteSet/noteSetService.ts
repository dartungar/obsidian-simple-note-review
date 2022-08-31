import { EmptyNoteSet, INoteSet } from "./INoteSet";
import { App, TAbstractFile, TFile} from "obsidian";
import SimpleNoteReviewPlugin from "main";
import { DataviewService } from "../dataview/dataviewService";
import { NoteSetInfoService as NoteSetInfoService } from "./noteSetInfoService";
import { MetadataService } from "src/utils/metadataService";


export class NoteSetEmptyError extends Error {
    message = "Note set is empty";
}
export class DataviewQueryError extends Error { }

export class NoteSetService {
    private _dataviewService = new DataviewService();
    private _noteSetInfoService = new NoteSetInfoService(this._dataviewService);
    private _metadataService = new MetadataService(this._app);

    constructor(private _app: App, private _plugin: SimpleNoteReviewPlugin) { }

    public async addEmptyNoteSet() {
        this._plugin.settings.noteSets.push(
            new EmptyNoteSet(
                this._plugin.settings.noteSets.length > 0 
                ? Math.max(...this._plugin.settings.noteSets.map(q => q.id)) + 1 
                : 1), // id "generation"
        );
        await this._plugin.saveSettings();
    }

    public async deleteNoteSet(noteSet: INoteSet) {
        this._plugin.settings.noteSets = this._plugin.settings.noteSets.filter(q => q.id !== noteSet.id);
        await this._plugin.saveSettings();
    }

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
        await this._metadataService.setMetadataFieldValue(file, this._plugin.settings.fieldName, todayString);
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
}