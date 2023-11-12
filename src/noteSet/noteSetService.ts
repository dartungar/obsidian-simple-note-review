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
import { getTodayAsYyyyMmDd } from "src/utils/dateUtils";


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

}