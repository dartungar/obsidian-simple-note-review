import SimpleNoteReviewPlugin from "main";
import { App, TAbstractFile, TFile } from "obsidian";
import { DataviewService } from "src/dataview/dataviewService";
import { ReviewFrequency } from "src/noteSet/reviewFrequency";
import { getTodayAsYyyyMmDd } from "src/utils/dateUtils";
import { MetadataService } from "src/utils/metadataService";


export class FileService {
    private _dataviewService = new DataviewService();
    private _metadataService = new MetadataService(this._app);

    constructor(private _app: App, private _plugin: SimpleNoteReviewPlugin) { }

    public async setReviewFrequency(note: TAbstractFile, frequency: ReviewFrequency): Promise<void> {
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

    public async setReviewedToToday(file: TFile): Promise<void> {
        const todayString = getTodayAsYyyyMmDd(); // "yyyy-mm-dd"

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
}