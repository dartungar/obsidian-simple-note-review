// TODO: frontmatter keys

import { JoinLogicOperators } from "../joinLogicOperators"
import { IQueueStats } from "./IQueueStats"

// TODO: excluded tags, folders, frontmatter keys
export interface IQueue {
    id: number
    name: string
    displayName: string
    description: string
    tags: string[]
    tagsJoinType: JoinLogicOperators
    folders: string[]
    foldersToTagsJoinType: JoinLogicOperators
    dataviewQuery: string
    stats: IQueueStats
}

export class EmptyQueue implements IQueue {
    id: number
    name: "New queue"
    displayName: string
    description: string
    tags: []
    tagsJoinType: JoinLogicOperators.OR
    folders: []
    foldersToTagsJoinType: JoinLogicOperators.OR
    dataviewQuery: ""
    stats: IQueueStats

    constructor(id: number) {    
        this.id = id;    
    }
}