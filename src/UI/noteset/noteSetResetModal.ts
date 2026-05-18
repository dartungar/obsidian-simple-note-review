import { App, Modal } from "obsidian";
import { INoteSet } from "src/noteSet/INoteSet";

export class NoteSetResetModal extends Modal {
	constructor(
		app: App,
		private noteSet: INoteSet,
		private onConfirm: () => void
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h3", { text: `Reset review queue for "${this.noteSet.displayName}"?` });
		contentEl.createDiv({
			text: "This will rebuild the queue from the note set rules and clear current queue progress.",
			cls: "simple-note-review-muted",
		});

		const btnsDiv = contentEl.createDiv({ cls: "simple-note-review-modal-actions" });
		const resetBtn = btnsDiv.createEl("button", { text: "Reset queue" });
		resetBtn.addClass("mod-warning");
		resetBtn.onClickEvent(() => {
			this.onConfirm();
			this.close();
		});

		const cancelBtn = btnsDiv.createEl("button", { text: "Cancel" });
		cancelBtn.onClickEvent(() => this.close());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
