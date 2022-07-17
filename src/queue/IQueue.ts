// TODO: frontmatter keys

import { JoinLogicOperators } from "../joinLogicOperators"

// TODO: excluded tags, folders, frontmatter keys
export interface IQueue {
    id: number
    name: string
    tags: string[]
    tagsJoinType: JoinLogicOperators
    folders: string[]
    foldersToTagsJoinType: JoinLogicOperators
    dataviewQuery: string
}

export class EmptyQueue implements IQueue {
    id: number
    name: "New queue"
    tags: []
    tagsJoinType: JoinLogicOperators.OR
    folders: []
    foldersToTagsJoinType: JoinLogicOperators.OR
    dataviewQuery: ""

    constructor(id: number) {    
        this.id = id;    
    }
}