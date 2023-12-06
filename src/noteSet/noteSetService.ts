import { EmptyNoteSet, INoteSet } from "./INoteSet";
import { App } from "obsidian";
import SimpleNoteReviewPlugin from "main";
import { DataviewService } from "../dataview/dataviewService";
import { NoteSetInfoService } from "./noteSetInfoService";

export class NoteSetEmptyError extends Error {
	message =
		"Could not get the next note in note set. Please check note set settings and make sure it has notes.";
}
export class OpenNextFileInNoteSetError extends Error {
	message =
		"Could not open next note in note set. If this keeps happening, please try to disable and enable plugin. If that fails, try to restart Obsidian.";
}

export class DataviewQueryError extends Error {}

export class NoteSetService {
	private _dataviewService = new DataviewService();
	private _noteSetInfoService = new NoteSetInfoService(this._dataviewService);

	public static readonly MATCHES_ALL_STRING = "matches all notes";

	constructor(private _app: App, private _plugin: SimpleNoteReviewPlugin) {}

	public async addEmptyNoteSet() {
		this._plugin.settings.noteSets.push(
			new EmptyNoteSet(
				this._plugin.settings.noteSets.length > 0
					? Math.max(
							...this._plugin.settings.noteSets.map((q) => q.id)) + 1
					: 1
			) // id "generation"
		);
		await this._plugin.saveSettings();
	}

	public async deleteNoteSet(noteSet: INoteSet) {
		this._plugin.settings.noteSets = this._plugin.settings.noteSets.filter(
			(q) => q.id !== noteSet.id
		);
		await this._plugin.saveSettings();
	}

	public updateNoteSetDisplayNames() {
		this._plugin.settings.noteSets.forEach((q) =>
			this.updateNoteSetDisplayNameAndDescription(q)
		);
	}

	public updateNoteSetDisplayNameAndDescription(noteSet: INoteSet) {
		this._noteSetInfoService.updateNoteSetDisplayNameAndDescription(
			noteSet
		);
	}

	public async updateNoteSetStats(noteSet: INoteSet): Promise<void> {
		await this._noteSetInfoService.updateNoteSetStats(noteSet);
	}

	public async updateAllNotesetErrors(): Promise<void> {
		await Promise.all(this._plugin.settings.noteSets.map(noteset => this.validateRules(noteset)));
	}

	public async validateRules(noteSet: INoteSet): Promise<void> {
		this._plugin.settings.noteSets.find(x => x.id === noteSet.id).validationError = await this.notesetRuleError(noteSet);
		await this._plugin.saveSettings();
	}

	private async notesetRuleError(noteset: INoteSet): Promise<string | undefined> {
		if (!noteset.queue?.filenames?.length)
			return "noteset review queue is empty. if you are sure it should be not, try resetting queue and/or checking noteset rules.";

		const customDvQueryIsValid = !noteset.dataviewQuery || this._dataviewService.validateQuery(noteset.dataviewQuery);	
		if (!customDvQueryIsValid)
			return "DataviewJS query is invalid";

		const constructedDvQuery = this._dataviewService.getOrCreateBaseDataviewQuery(noteset);
		const constructedDvQueryIsValid = await this._dataviewService.validateQuery(constructedDvQuery);	
		if (!constructedDvQueryIsValid)
			return `noteset rules result in an invalid Dataview query: "${constructedDvQuery}".`;

		const queueActual = await this._dataviewService.getNoteSetFiles(noteset);
		if (!queueActual.length)
			return "noteset rules do not match any notes in the vault.";

		return undefined;
	}

	public sortNoteSets(noteSets: INoteSet[]): INoteSet[] {
		// Find the highest sortOrder that is defined
		const maxSortOrder = noteSets.reduce((max, note) => {
			if (note.sortOrder !== undefined && note.sortOrder > max) {
				return note.sortOrder;
			}
			return max;
		}, 0);

		// Fill undefined sortOrder values with incrementing numbers starting from maxSortOrder + 1
		let nextSortOrder = maxSortOrder + 1;
		const filledNotes = noteSets.map((noteSet) => ({
			...noteSet,
			sortOrder:
				noteSet.sortOrder !== undefined
					? noteSet.sortOrder
					: nextSortOrder++,
		}));

		// Now, sort the notes array by sortOrder
		filledNotes.sort((a, b) => a.sortOrder - b.sortOrder);

		return filledNotes;
	}
}
