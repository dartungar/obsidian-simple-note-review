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
        let tableEl = contentEl.createEl("table");
        let tbodyEl = tableEl.createEl("tbody");

        this.addTableRow(tbodyEl, "Total notes", this.noteSet.stats.totalCount);
        this.addTableRow(tbodyEl, "Reviewed in last 7 days", this.noteSet.stats.reviewedLastSevenDaysCount);
        this.addTableRow(tbodyEl, "Reviewed in last 30 days", this.noteSet.stats.reviewedLastThirtyDaysCount);
        this.addTableRow(tbodyEl, "Not reviewed yet", this.noteSet.stats.notRewiewedCount);
      }

      private addTableRow(tbodyEl: HTMLElement, name: string, value: string | number): void {
        let valueStr = typeof value === 'number' ? value.toString() : value;

        let rowEl = tbodyEl.createEl("tr");
        let nameRow = rowEl.createEl("td");
        nameRow.setText(name);
        nameRow.style.paddingRight = "1rem";
        rowEl.createEl("td").setText(valueStr);
      }
    
      onClose() {
        const { contentEl } = this;
        contentEl.empty();
      }
}