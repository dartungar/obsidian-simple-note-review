import { App, Modal } from "obsidian";
import { IQueue } from "./IQueue";
import { QueueService } from "./queueService";

export class QueueInfoModal extends Modal {
    constructor(app: App, private queue: IQueue, private service: QueueService) {
        super(app);
      }
    
      onOpen() {
        this.service.updateQueueStats(this.queue);
        const { contentEl } = this;
        contentEl.createEl("h3", {text: `Queue "${this.queue.displayName}"`});
        contentEl.createDiv({text: `This query ${this.queue.description}.`});
        contentEl.createEl("br");
        contentEl.createEl("p", {text: `Total notes: ${this.queue.stats.totalCount}`});
        contentEl.createEl("p", {text: `Reviewed in last 7 days: ${this.queue.stats.reviewedLastSevenDaysCount}`});
        contentEl.createEl("p", {text: `Reviewed in last 30 days: ${this.queue.stats.reviewedLastThirtyDaysCount}`});
        contentEl.createEl("p", {text: `Not reviewed yet: ${this.queue.stats.notRewiewedCount}`});
      }
    
      onClose() {
        const { contentEl } = this;
        contentEl.empty();
      }
}