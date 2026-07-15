import SimpleNoteReviewPlugin from "main";
import { ButtonComponent, Modal, Setting } from "obsidian";
import { INoteSet } from "src/noteSet/INoteSet";
import { IFrontmatterPropertyFilter } from "src/noteSet/IFrontmatterPropertyFilter";
import { JoinLogicOperators } from "src/settings/joinLogicOperators";


export class NoteSetEditModal extends Modal {
    private _noteSet: INoteSet;

    constructor(noteSet: INoteSet, private _plugin: SimpleNoteReviewPlugin) {
        super(_plugin.app);
        this._noteSet = this._plugin.noteSetService.normalizeNoteSet(
            JSON.parse(JSON.stringify(noteSet)) as INoteSet
        );
    }
        
    onOpen() {
        
        const { contentEl } = this;

        contentEl.createEl("h3", {text: `Note set "${this._noteSet.displayName}"`});

        const nameSetting = new Setting(contentEl);
        nameSetting.setName("Name");
        nameSetting.setDesc("If omitted, the name will be created from tags, folders, properties, or dataviewJS query (if these are set).")
        nameSetting.addText(textField => {
            textField.setValue(this._noteSet.name)
            .setPlaceholder(this._noteSet.displayName)
            .onChange(value => {
                if (value === this._noteSet.name) {
                    return;
                }
                this._noteSet.name = value != "" ? value : null;
                if (value == "") {
                    textField.setPlaceholder(this._noteSet.displayName);
                }
            })
        });

        const tagsSetting = new Setting(contentEl);
        tagsSetting.setName("Tags");
        tagsSetting.setDesc(`One or more tags, separated by comma. Note set will contain notes tagged with ${this._noteSet.tagsJoinType === JoinLogicOperators.AND ? "all" : "any"} of these. Example: #review, #knowledge`)			
        tagsSetting.addTextArea(textArea => {
            textArea.setValue(this._noteSet.tags ? this._noteSet.tags.join(",") : "")
            .setPlaceholder("Tags")
            .onChange(value => {
                this._noteSet.tags = value != "" ? value.split(',').map(f => f.trim()) : [];
            });
        });

        const foldersSetting = new Setting(contentEl);
        foldersSetting.setName("Folders");
        foldersSetting.setDesc(`One or more folder paths relative to vault root, surrounded by quotes and separated by comma. Note set will contain notes located in any of these. Top-level folders must not contain slash in their path.  Example: "notes", "notes/programming"`)			
        foldersSetting.addTextArea(textArea => {
            textArea.setValue(this._noteSet.folders ? this._noteSet.folders.join(',') : "")
            .setPlaceholder("Folders")
            .onChange(value => {
                this._noteSet.folders = value != "" ? value.split(',').map(f => f.trim()) : [];
            });
        });

        const propertiesSetting = new Setting(contentEl);
        propertiesSetting.setName("Frontmatter properties");
        propertiesSetting.setDesc(`One or more name:value pairs, separated by comma. Note set will contain notes with ${this._noteSet.frontmatterPropertiesJoinType === JoinLogicOperators.AND ? "all" : "any"} of these frontmatter properties. Leave out the value to match any note where the property is set. Example: status:active, priority`)
        propertiesSetting.addTextArea(textArea => {
            textArea.setValue(this._noteSet.frontmatterProperties ? this._noteSet.frontmatterProperties.map(p => p.value ? `${p.name}:${p.value}` : p.name).join(",") : "")
            .setPlaceholder("Properties")
            .onChange(value => {
                this._noteSet.frontmatterProperties = value != "" ? this.parsePropertyFilters(value) : [];
            });
        });

        const createdDateSetting = new Setting(contentEl);
        createdDateSetting.setName("Created in last N days");
        createdDateSetting.setDesc(`Number of days`);			
        createdDateSetting.addText(text => {
            text.inputEl.type = 'number';
            text.setValue(`${this._noteSet.createdInLastNDays ?? ""}`);
            text.onChange((val) => {
                this._noteSet.createdInLastNDays = this.parseOptionalNumber(val);
            } );
          });

        const modifiedDateSetting = new Setting(contentEl);
        modifiedDateSetting.setName("Modified in last N days");
        modifiedDateSetting.setDesc(`Number of days`);			
        modifiedDateSetting.addText(text => {
            text.inputEl.type = 'number';
            text.setValue(`${this._noteSet.modifiedInLastNDays ?? ""}`);
            text.onChange((val) => {
                this._noteSet.modifiedInLastNDays = this.parseOptionalNumber(val);
            } );
        });




        // Advanced Settings

        const advancedSectionHeader = new Setting(contentEl);
        advancedSectionHeader.setHeading();
        advancedSectionHeader.setName("Advanced Settings");

        const advancedSectionBodyEl = contentEl.createDiv({cls: ["setting-body-advanced", "is-collapsed"]});

        const tagJoinTypeSetting = new Setting(advancedSectionBodyEl);
        tagJoinTypeSetting.setName("If tags are specified, match notes with:")
        tagJoinTypeSetting.addDropdown(dropdown => {
            dropdown
            .addOption(JoinLogicOperators.OR, "any of the tags")
            .addOption(JoinLogicOperators.AND, "all of the tags")
            .setValue(this._noteSet.tagsJoinType as string || JoinLogicOperators.OR)
            .onChange((value: JoinLogicOperators) => {
                this._noteSet.tagsJoinType = value;
            } )
        });

        const propertiesJoinTypeSetting = new Setting(advancedSectionBodyEl);
        propertiesJoinTypeSetting.setName("If properties are specified, match notes with:")
        propertiesJoinTypeSetting.addDropdown(dropdown => {
            dropdown
            .addOption(JoinLogicOperators.OR, "any of the properties")
            .addOption(JoinLogicOperators.AND, "all of the properties")
            .setValue(this._noteSet.frontmatterPropertiesJoinType as string || JoinLogicOperators.OR)
            .onChange((value: JoinLogicOperators) => {
                this._noteSet.frontmatterPropertiesJoinType = value;
            } )
        });

        const criteriaJoinTypeSetting = new Setting(advancedSectionBodyEl);
        criteriaJoinTypeSetting.setName("If more than one of tags, folders, and properties are specified, match notes that satisfy:")
        criteriaJoinTypeSetting.addDropdown(dropdown => {
            dropdown.addOption(JoinLogicOperators.OR, "any of them").addOption(JoinLogicOperators.AND, "all of them")
            .setValue(this._noteSet.criteriaJoinType as string || JoinLogicOperators.OR)
            .onChange((value: JoinLogicOperators) => {
                this._noteSet.criteriaJoinType = value;
            })
        });

        const dataviewQuerySetting = new Setting(advancedSectionBodyEl);
        dataviewQuerySetting.setName("DataviewJS query");
        dataviewQuerySetting.setDesc(`DataviewJS-style query for more flexible control over the note set. If used, *overrides* Tags, Folders & Properties. Example: "(#knowledge and #review) or ('./notes')"`);
        dataviewQuerySetting.addTextArea(textArea => {
            textArea.setValue(this._noteSet.dataviewQuery)
            .setPlaceholder("DataviewJS query")
            .onChange(value => {
                this._noteSet.dataviewQuery = value;
                updateTagsFoldersSettingsAvailability(value);
            });
        });

        const previewResultEl = contentEl.createDiv({cls: ["simple-note-review-preview", "simple-note-review-muted"]});
        const previewBtn = new ButtonComponent(contentEl);
        previewBtn.setButtonText("Preview Matches");
        previewBtn.onClick(() => {
            void this.previewMatches(previewResultEl).catch((error) => {
                this._plugin.showNotice(this.getErrorMessage(error));
                console.error(error);
            });
        });

        const saveBtn = new ButtonComponent(contentEl);
        saveBtn.setButtonText("Save");
        saveBtn.onClick(() => {
            void this.save().catch((error) => {
                this._plugin.showNotice(this.getErrorMessage(error));
                console.error(error);
            });
        });

        // Helpers

        const updateTagsFoldersSettingsAvailability = (dataviewJsQueryValue: string) : void => {
            const disableTagsFoldersSettings = Boolean(dataviewJsQueryValue);
            tagsSetting.settingEl.classList.toggle("simple-note-review-setting-muted", disableTagsFoldersSettings);
            foldersSetting.settingEl.classList.toggle("simple-note-review-setting-muted", disableTagsFoldersSettings);
            propertiesSetting.settingEl.classList.toggle("simple-note-review-setting-muted", disableTagsFoldersSettings);
            tagsSetting.setDisabled(disableTagsFoldersSettings);
            foldersSetting.setDisabled(disableTagsFoldersSettings);
            propertiesSetting.setDisabled(disableTagsFoldersSettings);
        }

        updateTagsFoldersSettingsAvailability(this._noteSet.dataviewQuery);

    }
    


    async save() { 
        this._noteSet = this._plugin.noteSetService.normalizeNoteSet(this._noteSet);
        this._plugin.settings.noteSets.forEach((noteSet, index) => {
            if (noteSet.id === this._noteSet.id) {
                this._plugin.settings.noteSets[index] = this._noteSet;
            }
        });
        await this._plugin.noteSetService.validateRulesAndSave(this._noteSet);
        await this._plugin.reviewService.resetNotesetQueueWithValidation(this._noteSet.id);
        this._plugin.noteSetService.updateNoteSetDisplayNameAndDescription(this._noteSet);
        await this._plugin.noteSetService.updateNoteSetStats(this._noteSet);
        await this._plugin.saveSettings();
        await this._plugin.activateView();
        this._plugin.showNotice(`Saved note set "${this._noteSet.displayName}".`);
        this.close();
    }

    private parseOptionalNumber(value: string): number | undefined {
        const parsedValue = parseInt(value, 10);
        return Number.isNaN(parsedValue) ? undefined : parsedValue;
    }

    private parsePropertyFilters(value: string): IFrontmatterPropertyFilter[] {
        return value.split(',').map(pair => {
            const separatorIndex = pair.indexOf(':');
            const name = separatorIndex === -1 ? pair : pair.slice(0, separatorIndex);
            const propertyValue = separatorIndex === -1 ? "" : pair.slice(separatorIndex + 1);
            return { name: name.trim(), value: propertyValue.trim() };
        }).filter(filter => filter.name.length > 0);
    }

    private async previewMatches(previewResultEl: HTMLElement): Promise<void> {
        previewResultEl.setText("Checking matches...");
        const previewNoteSet = this._plugin.noteSetService.normalizeNoteSet(this._noteSet);
        const matchCount = await this._plugin.noteSetService.getMatchingNoteCount(previewNoteSet);
        previewResultEl.setText(`${matchCount} matching note${matchCount === 1 ? "" : "s"}.`);
    }

    private getErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }
    
}
