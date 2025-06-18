export interface WorkItem {
    id: number;
    title: string;
    description: string;
    state: WorkItemState;
    assignedTo: string;
    type: WorkItemType;
    createdDate: Date;
    changedDate: Date;
    url: string;
}

export type WorkItemState = 'New' | 'Active' | 'Resolved' | 'Closed';

export type WorkItemType = 'Bug' | 'Task' | 'User Story' | 'Feature';

export interface PullRequest {
    id: number;
    title: string;
    status: PullRequestStatus;
    sourceRefName: string;
    targetRefName: string;
    createdBy: string;
    creationDate: Date;
    url: string;
    workItemIds: number[];
}

export type PullRequestStatus = 'active' | 'completed' | 'abandoned';

export interface Commit {
    commitId: string;
    comment: string;
    author: string;
    committer: string;
    commitDate: Date;
    workItemIds: number[];
}

export interface McpServerConfig {
    url: string;
    organization: string;
    project: string;
    personalAccessToken?: string;
}

export interface NotificationSettings {
    enableCommitNotifications: boolean;
    enablePRNotifications: boolean;
    enableReviewReminders: boolean;
    reviewReminderDays: number;
}

export interface WorkItemUpdateFields {
    'System.State'?: string;
    'System.AssignedTo'?: string;
    'System.Title'?: string;
    'System.Description'?: string;
    'System.History'?: string;
    'Microsoft.VSTS.Common.ResolvedReason'?: string;
    'Microsoft.VSTS.Common.ResolvedBy'?: string;
    'Microsoft.VSTS.Common.ActivatedBy'?: string;
    'Microsoft.VSTS.Common.ActivatedDate'?: string;
}
