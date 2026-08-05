import { INoteQueue } from "src/queues/noteQueue"
import { JoinLogicOperators } from "../settings/joinLogicOperators"
import { INoteSetStats } from "./INoteSetStats"
import { NotesetValidationErrors } from "./notesetValidationErrors"
import { IFrontmatterPropertyFilter } from "./IFrontmatterPropertyFilter"

// TODO: excluded tags, folders
export interface INoteSet {
    id: string
    sortOrder: number | undefined
    name: string
    displayName: string
    description: string
    tags: string[]
    tagsJoinType: JoinLogicOperators
    folders: string[]
    frontmatterProperties: IFrontmatterPropertyFilter[]
    frontmatterPropertiesJoinType: JoinLogicOperators
    criteriaJoinType: JoinLogicOperators
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
    frontmatterProperties: IFrontmatterPropertyFilter[] = []
    frontmatterPropertiesJoinType = JoinLogicOperators.OR
    criteriaJoinType = JoinLogicOperators.OR
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
