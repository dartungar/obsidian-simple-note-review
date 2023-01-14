import { EmptyNoteSet, INoteSet } from "./INoteSet";
import { App, TAbstractFile, TFile} from "obsidian";
import SimpleNoteReviewPlugin from "main";
import { DataviewService } from "../dataview/dataviewService";
import { NoteSetInfoService } from "./noteSetInfoService";
import { MetadataService } from "src/utils/metadataService";
import { ReviewFrequency } from "./reviewFrequency";
import { DataArray } from "obsidian-dataview";
import { calculateNoteReviewPriority } from "./noteReviewPriorityHelpers";
import { ReviewAlgorithm } from "src/settings/reviewAlgorightms";


export class NoteSetEmptyError extends Error {
    message = "Could not get the next note in note set. Please check note set settings and make sure it has notes.";
}
export class OpenNextFileInNoteSetError extends Error {
    message = "Could not open next note in note set. If this keeps happening, please try to disable and enable plugin. If that fails, try to restart Obsidian."
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


    public updateNoteSetDisplayNames() {
        this._plugin.settings.noteSets.forEach(q => this.updateNoteSetDisplayNameAndDescription(q));
    } 

    public updateNoteSetDisplayNameAndDescription(noteSet: INoteSet) {
        this._noteSetInfoService.updateNoteSetDisplayNameAndDescription(noteSet);
    }

    public updateNoteSetStats(noteSet: INoteSet) {
        this._noteSetInfoService.updateNoteSetStats(noteSet);
    }

    /** Mark note as reviewed today. If setting "open next note in noteSet after reviewing" is enabled,
    * open next note in noteSet (current noteSet by default).
    * @param  {TAbstractFile} note
    * @param  {INoteSet=this._plugin.settings.currentnoteSet} noteSet
    * @returns Promise
    */
    public async reviewNote(note: TAbstractFile, noteSet: INoteSet = this._plugin.settings.currentNoteSet): Promise<void> {
        // "note" must be an actual note, not folder
        if (!(note instanceof TFile))
            return;
        try {
            await this.setReviewedToToday(note);
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
        const filePath = await this.getNextFilePath(noteSet);
        const abstractFile = this._app.vault.getAbstractFileByPath(filePath);
        await this._app.workspace.getLeaf().openFile(abstractFile as TFile); 
    }

    public async setReviewedFrequency(note: TAbstractFile, frequency: ReviewFrequency): Promise<void> {
        if (!(note instanceof TFile))
            return;
        try {
            await this._metadataService.setAndSaveMetadataFieldValue(note, 
                {
                    name: this._plugin.settings.reviewFrequencyFieldName,
                    value: frequency
                });
        } catch (error) {
            this._plugin.showNotice(error.message);
            throw error;
        }
    }

    private async setReviewedToToday(file: TFile): Promise<void> {
        const todayString = new Date().toISOString().slice(0, 10); // "yyyy-mm-dd"

        const fieldsToSet = [{
            name: this._plugin.settings.reviewedFieldName, 
            value: todayString 
        }];

        if (this._plugin.settings.useReviewFrequency) {
            const reviewFrequency = await this.getReviewFrequency(file);
            fieldsToSet.push({
                    name: this._plugin.settings.reviewFrequencyFieldName,
                    value: reviewFrequency ?? ReviewFrequency.normal
                }
            );
        }

        await this._metadataService.setAndSaveMetadataFieldsValue(file, fieldsToSet);
        this._plugin.showNotice(`Marked note "${file.path}" as reviewed today.`)
    }

    private async getReviewFrequency(file: TFile): Promise<ReviewFrequency | null> {
        const frequencyValue = await this._dataviewService.getMetadataFieldValue(
            file.path, this._plugin.settings.reviewFrequencyFieldName);

        switch (frequencyValue) {
            case ReviewFrequency.high:
                return ReviewFrequency.high;
            case ReviewFrequency.normal:
                return ReviewFrequency.normal;
            case ReviewFrequency.low:
                return ReviewFrequency.low;
            case ReviewFrequency.ignore:
                return ReviewFrequency.ignore;
            default:
                return null;
        }
    }

    private async getNextFilePath(noteSet: INoteSet): Promise<string> {
        const reviewedFieldName = this._plugin.settings.reviewedFieldName;
        const freqFieldname = this._plugin.settings.reviewFrequencyFieldName;
        const pages = (await this._dataviewService.getNoteSetFiles(noteSet))
                        .filter(x => x[freqFieldname] !== ReviewFrequency.ignore);
        let sorted: DataArray<Record<string, any>>;

        if (this._plugin.settings.useReviewFrequency) { 
            sorted = pages.sort(x => calculateNoteReviewPriority(this._plugin, x), "desc");
        } else {
            sorted = pages.sort(x => x[reviewedFieldName], "asc");
        }

        if (sorted.length > 0) {
            let firstNoteIndex: number;
            switch (this._plugin.settings.reviewAlgorithm) {
                case ReviewAlgorithm.random:
                    firstNoteIndex = ~~(Math.random() * sorted.length);
                    break;
                case ReviewAlgorithm.default:
                default:
                    firstNoteIndex = 0;
                    break;
            }
            const firstInNoteSetPath = sorted[firstNoteIndex]?.file?.path;

            if (!firstInNoteSetPath)
                throw new OpenNextFileInNoteSetError();

            if (sorted.length === 1) {
                return firstInNoteSetPath;
            }
            const nextInnoteSetPath = sorted[1]?.file?.path;
            // sometimes DV cache does not update in time so we have to take next note in set
            return this.pathEqualsCurrentFilePath(firstInNoteSetPath) ? nextInnoteSetPath : firstInNoteSetPath;
        } 
        throw new NoteSetEmptyError();
    }

    private pathEqualsCurrentFilePath(path: string): boolean {
        return path === this._app.workspace.getActiveFile()?.path;
    }
}