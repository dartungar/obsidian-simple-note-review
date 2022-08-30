import { App, Modal } from "obsidian";
import { INoteSet } from "./INoteSet";
import { NoteSetService } from "./noteSetService";

export class NoteSetInfoModal extends Modal {
    constructor(app: App, private noteSet: INoteSet, private service: NoteSetService) {
        super(app);
      }
    
      onOpen() {
        this.service.updateNoteSetStats(this.noteSet);
        const { contentEl } = this;
        contentEl.createEl("h3", {text: `noteSet "${this.noteSet.displayName}"`});
        contentEl.createDiv({text: `This query ${this.noteSet.description}.`});
        contentEl.createEl("br");
        contentEl.createEl("p", {text: `Total notes: ${this.noteSet.stats.totalCount}`});
        contentEl.createEl("p", {text: `Reviewed in last 7 days: ${this.noteSet.stats.reviewedLastSevenDaysCount}`});
        contentEl.createEl("p", {text: `Reviewed in last 30 days: ${this.noteSet.stats.reviewedLastThirtyDaysCount}`});
        contentEl.createEl("p", {text: `Not reviewed yet: ${this.noteSet.stats.notRewiewedCount}`});
      }
    
      onClose() {
        const { contentEl } = this;
        contentEl.empty();
      }
}