import { INoteQueue } from "src/queues/noteQueue"
import { JoinLogicOperators } from "../settings/joinLogicOperators"
import { INoteSetStats } from "./INoteSetStats"
import { NotesetValidationErrors } from "./notesetValidationErrors"

// TODO: excluded tags, folders, frontmatter keys
export interface INoteSet {
    id: string
    sortOrder: number | undefined
    name: string
    displayName: string
    description: string
    tags: string[]
    tagsJoinType: JoinLogicOperators
    folders: string[]
    foldersToTagsJoinType: JoinLogicOperators
    createdInLastNDays: number | undefined
    modifiedInLastNDays: number | undefined
    dataviewQuery: string
    stats: INoteSetStats
    queue: INoteQueue
    validationErrors: NotesetValidationErrors[]
}

export class EmptyNoteSet implements INoteSet {
    id = crypto.randomUUID()
    sortOrder: number | undefined = undefined
    name = "new note set"
    displayName = "new note set"
    description = ""
    tags: string[] = []
    tagsJoinType = JoinLogicOperators.OR
    folders: string[] = []
    foldersToTagsJoinType = JoinLogicOperators.OR
    createdInLastNDays: number | undefined = undefined
    modifiedInLastNDays: number | undefined = undefined
    dataviewQuery = ""
    stats: INoteSetStats = {
        totalCount: 0,
        notRewiewedCount: 0,
        reviewedLastSevenDaysCount: 0,
        reviewedLastThirtyDaysCount: 0,
    }
    queue: INoteQueue = { filenames: [], sourceFileCount: 0 }
    validationErrors: NotesetValidationErrors[] = []
}
