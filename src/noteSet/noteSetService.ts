import { EmptyNoteSet, INoteSet } from "./INoteSet";
import { App, TAbstractFile } from "obsidian";
import SimpleNoteReviewPlugin from "main";
import { DataviewService } from "../dataview/dataviewService";
import { NoteSetInfoService } from "./noteSetInfoService";
import { NotesetValidationErrors } from "./notesetValidationErrors";
import { IFrontmatterPropertyFilter } from "./IFrontmatterPropertyFilter";

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
	private static readonly QUEUE_STALE_AFTER_DAYS = 7;

	constructor(private _app: App, private _plugin: SimpleNoteReviewPlugin) {}

	public getNoteSet(noteSetId: string): INoteSet {
		if (!noteSetId) {
			throw new Error("No current note set selected.");
		}
		const notesets = this._plugin.settings.noteSets.filter(x => x.id === noteSetId);
		if (notesets.length === 0) {
			throw new Error(`Noteset not found`);
		}
		return notesets[0];
	}

	public async saveNoteSet(noteSet: INoteSet) {
		noteSet = this.normalizeNoteSet(noteSet);
		if (!noteSet.id) {
			noteSet.id = crypto.randomUUID();
		}
		this._plugin.settings.noteSets = this._plugin.settings.noteSets.filter(
			(x) => x.id !== noteSet.id
		);
		this._plugin.settings.noteSets.push(noteSet);
		await this._plugin.saveSettings();
	}

	public async deleteNoteSet(noteSet: INoteSet) {
		this._plugin.settings.noteSets = this._plugin.settings.noteSets.filter(
			(q) => q.id !== noteSet.id
		);
		if (this._plugin.settings.currentNoteSetId === noteSet.id) {
			this._plugin.settings.currentNoteSetId = null;
		}
		await this._plugin.saveSettings();
	}

	public async addEmptyNoteSet() {
		const emptyNoteSet = new EmptyNoteSet();
		await this.saveNoteSet(emptyNoteSet);
	}

	public normalizeNoteSets(noteSets: INoteSet[]): INoteSet[] {
		return (noteSets ?? []).map((noteSet) => this.normalizeNoteSet(noteSet));
	}

	public normalizeNoteSet(noteSet: Partial<INoteSet>): INoteSet {
		const defaults = new EmptyNoteSet();
		const stats = noteSet.stats ?? defaults.stats;
		const queue = noteSet.queue ?? defaults.queue;
		const filenames = this.normalizeStringArray(queue.filenames);
		const sourceFileCount = this.normalizeOptionalNumber(queue.sourceFileCount);

		return {
			...defaults,
			...noteSet,
			id: noteSet.id || defaults.id,
			sortOrder: noteSet.sortOrder,
			name: noteSet.name ?? defaults.name,
			displayName: noteSet.displayName ?? defaults.displayName,
			description: noteSet.description ?? defaults.description,
			tags: this.normalizeStringArray(noteSet.tags),
			tagsJoinType: noteSet.tagsJoinType ?? defaults.tagsJoinType,
			folders: this.normalizeStringArray(noteSet.folders),
			frontmatterProperties: this.normalizeFrontmatterProperties(noteSet.frontmatterProperties),
			frontmatterPropertiesJoinType: noteSet.frontmatterPropertiesJoinType ?? defaults.frontmatterPropertiesJoinType,
			criteriaJoinType: noteSet.criteriaJoinType ?? defaults.criteriaJoinType,
			createdInLastNDays: this.normalizeOptionalNumber(noteSet.createdInLastNDays),
			modifiedInLastNDays: this.normalizeOptionalNumber(noteSet.modifiedInLastNDays),
			dataviewQuery: noteSet.dataviewQuery ?? defaults.dataviewQuery,
			stats: {
				totalCount: stats.totalCount ?? defaults.stats.totalCount,
				notRewiewedCount: stats.notRewiewedCount ?? defaults.stats.notRewiewedCount,
				reviewedLastSevenDaysCount: stats.reviewedLastSevenDaysCount ?? defaults.stats.reviewedLastSevenDaysCount,
				reviewedLastThirtyDaysCount: stats.reviewedLastThirtyDaysCount ?? defaults.stats.reviewedLastThirtyDaysCount,
			},
			queue: {
				filenames: filenames,
				createdAt: typeof queue.createdAt === "string" ? queue.createdAt : defaults.queue.createdAt,
				sourceFileCount: sourceFileCount !== undefined ? Math.max(sourceFileCount, filenames.length) : defaults.queue.sourceFileCount,
				rulesHash: typeof queue.rulesHash === "string" ? queue.rulesHash : defaults.queue.rulesHash,
			},
			validationErrors: Array.isArray(noteSet.validationErrors)
				? noteSet.validationErrors
				: defaults.validationErrors,
		};
	}

	public getQueueRulesHash(noteSet: INoteSet): string {
		const normalized = this.normalizeNoteSet(noteSet);
		return JSON.stringify({
			tags: normalized.tags,
			tagsJoinType: normalized.tagsJoinType,
			folders: normalized.folders,
			frontmatterProperties: normalized.frontmatterProperties,
			frontmatterPropertiesJoinType: normalized.frontmatterPropertiesJoinType,
			criteriaJoinType: normalized.criteriaJoinType,
			createdInLastNDays: normalized.createdInLastNDays,
			modifiedInLastNDays: normalized.modifiedInLastNDays,
			dataviewQuery: normalized.dataviewQuery,
			reviewedFieldName: this._plugin.settings.reviewedFieldName,
			reviewFrequencyFieldName: this._plugin.settings.reviewFrequencyFieldName,
			useReviewFrequency: this._plugin.settings.useReviewFrequency,
			unreviewedNotesFirst: this._plugin.settings.unreviewedNotesFirst,
			reviewAlgorithm: this._plugin.settings.reviewAlgorithm,
		});
	}

	public getQueueProgressText(noteSet: INoteSet): string {
		const remainingCount = noteSet.queue?.filenames?.length ?? 0;
		const sourceFileCount = noteSet.queue?.sourceFileCount;
		const totalCount = Number.isFinite(sourceFileCount)
			? Math.max(sourceFileCount, remainingCount)
			: remainingCount;

		if (totalCount === 0) {
			return "queue empty";
		}

		return `${remainingCount}/${totalCount} left`;
	}

	public getQueueStaleReasons(noteSet: INoteSet): string[] {
		if (!noteSet.queue?.filenames?.length) {
			return [];
		}

		const reasons: string[] = [];
		if (!noteSet.queue.rulesHash) {
			reasons.push("queue was created before staleness tracking");
		} else if (noteSet.queue.rulesHash !== this.getQueueRulesHash(noteSet)) {
			reasons.push("note set rules or review settings changed");
		}

		const queueAgeInDays = this.getQueueAgeInDays(noteSet);
		if (queueAgeInDays === null) {
			reasons.push("queue age is unknown");
		} else if (queueAgeInDays >= NoteSetService.QUEUE_STALE_AFTER_DAYS) {
			reasons.push(`queue is ${queueAgeInDays} days old`);
		}

		return reasons;
	}

	public async getMatchingNoteCount(noteSet: INoteSet): Promise<number> {
		const normalized = this.normalizeNoteSet(noteSet);
		const pages = await this._dataviewService.getNoteSetFiles(normalized);
		return pages.length;
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

	public sortNoteSets(noteSets: INoteSet[]): INoteSet[] {
		noteSets = this.normalizeNoteSets(noteSets);

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

	public async updateNoteSetStats(noteSet: INoteSet): Promise<void> {
		await this._noteSetInfoService.updateNoteSetStats(
			noteSet,
			this._plugin.settings.reviewedFieldName
		);
	}

	public async validateAllNotesets(): Promise<void> {
		await Promise.all(
			this._plugin.settings.noteSets.map((noteset) =>
				this.validateRulesAndSave(noteset)
			)
		);
	}

	public async validateRulesAndSave(noteSet: INoteSet): Promise<void> {
		noteSet = this.normalizeNoteSet(noteSet);
		const validationErrors = await this.getValidationErrors(noteSet);
		noteSet.validationErrors = validationErrors;
		await this.saveNoteSet(noteSet);
	}

	public async onPhysicalDeleteNote(note: TAbstractFile) {
		let queueChanged = false;
		this._plugin.settings.noteSets.forEach((noteSet) => {
			const queue = noteSet.queue;
			if (!queue?.filenames?.length) {
				return;
			}

			const filenamesCountBeforeDelete = queue.filenames.length;
			queue.filenames.remove(note.path);
			if (queue.filenames.length !== filenamesCountBeforeDelete) {
				queueChanged = true;
				if (Number.isFinite(queue.sourceFileCount)) {
					queue.sourceFileCount = Math.max(queue.filenames.length, queue.sourceFileCount - 1);
				}
			}
		});

		if (queueChanged) {
			await this._plugin.saveSettings();
		}
	}

	public async onPhysicalRenameNote(note: TAbstractFile, oldPath: string) {
		let queueChanged = false;
		this._plugin.settings.noteSets.forEach((noteSet) => {
			const queue = noteSet.queue;
			if (!queue?.filenames?.length) {
				return;
			}

			queue.filenames = queue.filenames.map((filename) => {
				if (filename !== oldPath) {
					return filename;
				}

				queueChanged = true;
				return note.path;
			});
		});

		if (queueChanged) {
			await this._plugin.saveSettings();
		}
	}

	private getQueueAgeInDays(noteSet: INoteSet): number | null {
		const createdAt = noteSet.queue?.createdAt;
		if (!createdAt) {
			return null;
		}

		const createdAtTime = new Date(createdAt).getTime();
		if (!Number.isFinite(createdAtTime)) {
			return null;
		}

		const millisecondsInDay = 1000 * 60 * 60 * 24;
		return Math.max(0, Math.floor((Date.now() - createdAtTime) / millisecondsInDay));
	}

	private async getValidationErrors(
		noteset: INoteSet
	): Promise<NotesetValidationErrors[]> {
		const errors: NotesetValidationErrors[] = [];

		if (!this._dataviewService.isDataviewInstalled) {
			return errors;
		}

		const customDvQueryIsValid =
			!noteset.dataviewQuery ||
			(await this._dataviewService.validateQuery(noteset.dataviewQuery));
		if (!customDvQueryIsValid)
			errors.push(NotesetValidationErrors.CustomDataviewIncorrect);

		if (!noteset.dataviewQuery) {
			const constructedDvQuery =
				this._dataviewService.getOrCreateBaseDataviewQuery(noteset);
			const constructedDvQueryIsValid =
				await this._dataviewService.validateQuery(constructedDvQuery);
			if (!constructedDvQueryIsValid)
				errors.push(NotesetValidationErrors.RulesAreIncorrect);
		}

		if (this._dataviewService.isDataviewInitialized) {
			const queueActual = await this._dataviewService.getNoteSetFiles(noteset);

			if (!queueActual?.length || queueActual.length === 0) {
				errors.push(NotesetValidationErrors.RulesDoNotMatchAnyNotes);
			}
		}
		return errors;
	}

	private normalizeStringArray(value: string[]): string[] {
		if (!Array.isArray(value)) {
			return [];
		}

		return value
			.filter((item) => typeof item === "string")
			.map((item) => item.trim())
			.filter((item) => item.length > 0);
	}

	private normalizeOptionalNumber(value: number | undefined): number | undefined {
		return Number.isFinite(value) ? value : undefined;
	}

	private normalizeFrontmatterProperties(value: IFrontmatterPropertyFilter[]): IFrontmatterPropertyFilter[] {
		if (!Array.isArray(value)) {
			return [];
		}

		return value
			.filter((item) => item && typeof item.name === "string")
			.map((item) => ({ name: item.name.trim(), value: typeof item.value === "string" ? item.value.trim() : "" }))
			.filter((item) => item.name.length > 0);
	}
}
