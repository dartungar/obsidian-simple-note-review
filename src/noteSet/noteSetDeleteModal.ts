import { App, Modal } from "obsidian";
import { SimpleNoteReviewPluginSettingsTab } from "src/settings/settingsTab";
import { INoteSet } from "./INoteSet";
import { NoteSetService } from "./noteSetService";

export class NoteSetDeleteModal extends Modal {

    constructor(app: App, private settingsTab: SimpleNoteReviewPluginSettingsTab, private noteSet: INoteSet, private service: NoteSetService) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass("note-set-delete-modal");
        contentEl.setText(`Delete note set "${this.noteSet.displayName}" ?`);
        const btnsDiv = contentEl.createDiv();
        const okBtn = btnsDiv.createEl("button", {text: "Ok"});
        okBtn.onClickEvent(async () => {
            await this.service.deleteNoteSet(this.noteSet);
            this.settingsTab.refresh();
            this.close();
        });
        const cancelBtn = btnsDiv.createEl("button", {text: "Cancel"});
        cancelBtn.onClickEvent(() => this.close());
      }
    
      onClose() {
        const { contentEl } = this;
        contentEl.empty();
      }
}