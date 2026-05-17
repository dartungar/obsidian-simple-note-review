import { App, Modal } from "obsidian";
import { INoteSet } from "../../noteSet/INoteSet";
import { NoteSetService } from "../../noteSet/noteSetService";

export class NoteSetInfoModal extends Modal {
    constructor(app: App, private noteSet: INoteSet, private service: NoteSetService) {
        super(app);
      }
    
      async onOpen() {
        this.service.updateNoteSetDisplayNameAndDescription(this.noteSet);
        await this.service.updateNoteSetStats(this.noteSet);
        const { contentEl } = this;
        
        contentEl.createEl("h3", {text: `Note set "${this.noteSet.displayName}"`});
        contentEl.createDiv({text: `This query ${this.noteSet.description}.`});
        contentEl.createEl("br");
        const tableEl = contentEl.createEl("table");
        const tbodyEl = tableEl.createEl("tbody");

        this.addTableRow(tbodyEl, "Total notes", this.noteSet.stats.totalCount);
        this.addTableRow(tbodyEl, "Reviewed in last 7 days", this.noteSet.stats.reviewedLastSevenDaysCount);
        this.addTableRow(tbodyEl, "Reviewed in last 30 days", this.noteSet.stats.reviewedLastThirtyDaysCount);
        this.addTableRow(tbodyEl, "Not reviewed yet", this.noteSet.stats.notRewiewedCount);
      }

      private addTableRow(tbodyEl: HTMLElement, name: string, value: string | number): void {
        const valueStr = typeof value === 'number' ? value.toString() : value;

        const rowEl = tbodyEl.createEl("tr");
        const nameRow = rowEl.createEl("td");
        nameRow.setText(name);
        nameRow.addClass("simple-note-review-table-label");
        rowEl.createEl("td").setText(valueStr);
      }
    
      onClose() {
        const { contentEl } = this;
        contentEl.empty();
      }
}
