import { App, Modal } from "obsidian";
import { IQueue } from "./IQueue";
import { QueueService } from "./queueService";

export class QueueInfoModal extends Modal {
    constructor(app: App, private queue: IQueue, private service: QueueService) {
        super(app);
      }
    
      onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h3", {text: `Queue "${this.service.getQueueDisplayName(this.queue)}"`});
        contentEl.createDiv({text: `This query ${this.service.getSchemaDescription(this.queue)}.`});
        contentEl.createDiv({text: `It currently contains ${this.service.getQueueFilesQty(this.queue)} notes.`});
      }
    
      onClose() {
        const { contentEl } = this;
        contentEl.empty();
      }
}