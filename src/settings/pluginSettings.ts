import { INoteSet } from "src/noteSet/INoteSet";
import { ReviewAlgorithm } from "./reviewAlgorightms";

export enum ReviewStartUiBehavior {
    yes = "yes",
    no = "no",
    ifOtherHidden = "if-other-hidden",
}

export interface SimpleNoteReviewPluginSettings {
    reviewedFieldName: string
    reviewFrequencyFieldName: string
    noteSets: INoteSet[]
    currentNoteSetId?: string
    openNextNoteAfterReviewing: boolean
    showReviewNotification: boolean
    reviewAlgorithm: ReviewAlgorithm
    useReviewFrequency: boolean
    unreviewedNotesFirst: boolean
    sidebarShowCurrentNoteInfo: boolean
    sidebarShowNoteCount: boolean
    sidebarShowRandomButton: boolean
    sidebarShowOpenBottomBarButton: boolean
    sidebarShowSettingsButton: boolean
    sidebarOpenOnStart: ReviewStartUiBehavior
    sidebarCompactMode: boolean
    bottomBarShowNoteCount: boolean
    bottomBarShowRandomButton: boolean
    bottomBarShowOpenSidebarButton: boolean
    bottomBarShowSettingsButton: boolean
    bottomBarOpenOnStart: ReviewStartUiBehavior
}

export class DefaultSettings implements SimpleNoteReviewPluginSettings {
    reviewedFieldName = "reviewed";
    reviewFrequencyFieldName = "review-frequency";
    noteSets: INoteSet[] = [];
    currentNoteSetId?: string  = null;
    openNextNoteAfterReviewing = true;
    showReviewNotification = true;
    reviewAlgorithm = ReviewAlgorithm.default;
    useReviewFrequency = false;
    unreviewedNotesFirst = false;
    sidebarShowCurrentNoteInfo = true;
    sidebarShowNoteCount = true;
    sidebarShowRandomButton = true;
    sidebarShowOpenBottomBarButton = true;
    sidebarShowSettingsButton = true;
    sidebarOpenOnStart = ReviewStartUiBehavior.no;
    sidebarCompactMode = false;
    bottomBarShowNoteCount = true;
    bottomBarShowRandomButton = true;
    bottomBarShowOpenSidebarButton = true;
    bottomBarShowSettingsButton = true;
    bottomBarOpenOnStart = ReviewStartUiBehavior.no;
}
