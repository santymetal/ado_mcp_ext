import * as vscode from 'vscode';
import { McpClient } from './mcpClient';
import { Config } from './config';
import { WorkItem, WorkItemState } from './types';

export class WorkItemManager {
    private assignedWorkItems: WorkItem[] = [];
    private currentUser: string = '';

    constructor(private mcpClient: McpClient, private config: Config) {
        this.initializeCurrentUser();
    }

    private async initializeCurrentUser(): Promise<void> {
        try {
            // Get current user from VS Code or Git config
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (gitExtension) {
                const git = gitExtension.exports.getAPI(1);
                const repositories = git.repositories;
                if (repositories.length > 0) {
                    const repo = repositories[0];
                    const config = await repo.getConfig('user.email');
                    this.currentUser = config || 'unknown@example.com';
                }
            }
        } catch (error) {
            console.error('Failed to get current user:', error);
            this.currentUser = 'unknown@example.com';
        }
    }

    async getAssignedWorkItems(): Promise<WorkItem[]> {
        try {
            if (!this.mcpClient.isConnectedToServer()) {
                throw new Error('Not connected to MCP server');
            }

            const workItems = await this.mcpClient.getAssignedWorkItems(this.currentUser);
            this.assignedWorkItems = workItems.map(wi => this.mapToWorkItem(wi));
            return this.assignedWorkItems;
        } catch (error) {
            console.error('Failed to get assigned work items:', error);
            vscode.window.showErrorMessage(`Failed to retrieve work items: ${error}`);
            return [];
        }
    }

    async assignWorkItem(workItemId: number): Promise<void> {
        try {
            const fields = {
                'System.AssignedTo': this.currentUser,
                'System.State': 'Active'
            };

            await this.mcpClient.updateWorkItem(workItemId, fields);
            
            // Add comment about assignment
            await this.addWorkItemComment(workItemId, `Work item assigned to ${this.currentUser} via VS Code extension`);
            
            // Refresh assigned work items
            await this.getAssignedWorkItems();
            
        } catch (error) {
            console.error('Failed to assign work item:', error);
            throw error;
        }
    }

    async updateWorkItemState(workItemId: number, newState: string): Promise<void> {
        try {
            const fields: Record<string, any> = {
                'System.State': newState
            };

            // Add specific fields based on state transition
            if (newState === 'Resolved') {
                fields['Microsoft.VSTS.Common.ResolvedReason'] = 'Fixed';
                fields['Microsoft.VSTS.Common.ResolvedBy'] = this.currentUser;
            } else if (newState === 'Active') {
                fields['Microsoft.VSTS.Common.ActivatedBy'] = this.currentUser;
                fields['Microsoft.VSTS.Common.ActivatedDate'] = new Date().toISOString();
            }

            await this.mcpClient.updateWorkItem(workItemId, fields);
            
            // Add comment about state change
            await this.addWorkItemComment(workItemId, `State changed to ${newState} by ${this.currentUser}`);
            
            // Refresh assigned work items
            await this.getAssignedWorkItems();
            
        } catch (error) {
            console.error('Failed to update work item state:', error);
            throw error;
        }
    }

    async createWorkItem(title: string, description: string, type: string): Promise<WorkItem> {
        try {
            const fields = {
                'System.Title': title,
                'System.Description': description,
                'System.AssignedTo': this.currentUser,
                'System.CreatedBy': this.currentUser,
                'System.State': 'New'
            };

            const result = await this.mcpClient.createWorkItem(type, fields);
            const workItem = this.mapToWorkItem(result);
            
            // Refresh assigned work items
            await this.getAssignedWorkItems();
            
            return workItem;
        } catch (error) {
            console.error('Failed to create work item:', error);
            throw error;
        }
    }

    async linkPullRequest(workItemId: number, prUrl: string): Promise<void> {
        try {
            await this.mcpClient.linkWorkItemToPR(workItemId, prUrl);
            
            // Update work item state to Active if it's New
            const workItem = await this.mcpClient.getWorkItem(workItemId);
            if (workItem.fields['System.State'] === 'New') {
                await this.updateWorkItemState(workItemId, 'Active');
            }
            
            // Add comment about PR link
            await this.addWorkItemComment(workItemId, `Pull request linked: ${prUrl}`);
            
        } catch (error) {
            console.error('Failed to link pull request:', error);
            throw error;
        }
    }

    async updateWorkItemOnCommit(workItemId: number, commitSha: string, commitMessage: string): Promise<void> {
        try {
            // Add comment about commit
            await this.addWorkItemComment(
                workItemId, 
                `Code committed: ${commitSha}\n${commitMessage}`
            );
            
            // Update state to Active if it's New
            const workItem = await this.mcpClient.getWorkItem(workItemId);
            if (workItem.fields['System.State'] === 'New') {
                await this.updateWorkItemState(workItemId, 'Active');
            }
            
        } catch (error) {
            console.error('Failed to update work item on commit:', error);
        }
    }

    async updateWorkItemOnPRMerge(workItemId: number, prUrl: string): Promise<void> {
        try {
            // Update state to Resolved
            await this.updateWorkItemState(workItemId, 'Resolved');
            
            // Add comment about PR merge
            await this.addWorkItemComment(workItemId, `Pull request merged: ${prUrl}\nWork item automatically resolved.`);
            
        } catch (error) {
            console.error('Failed to update work item on PR merge:', error);
        }
    }

    private async addWorkItemComment(workItemId: number, comment: string): Promise<void> {
        try {
            const fields = {
                'System.History': comment
            };
            await this.mcpClient.updateWorkItem(workItemId, fields);
        } catch (error) {
            console.error('Failed to add work item comment:', error);
        }
    }

    private mapToWorkItem(apiWorkItem: any): WorkItem {
        return {
            id: apiWorkItem.id,
            title: apiWorkItem.fields['System.Title'] || '',
            description: apiWorkItem.fields['System.Description'] || '',
            state: apiWorkItem.fields['System.State'] || 'New',
            assignedTo: apiWorkItem.fields['System.AssignedTo']?.displayName || '',
            type: apiWorkItem.fields['System.WorkItemType'] || '',
            createdDate: new Date(apiWorkItem.fields['System.CreatedDate'] || Date.now()),
            changedDate: new Date(apiWorkItem.fields['System.ChangedDate'] || Date.now()),
            url: apiWorkItem._links?.html?.href || ''
        };
    }

    getWorkItemFromCommitMessage(commitMessage: string): number | null {
        // Look for work item patterns in commit message
        const workItemPatterns = [
            /#(\d+)/,           // #123
            /AB#(\d+)/i,        // AB#123
            /workitem[:\s]+(\d+)/i, // workitem: 123
            /wi[:\s]+(\d+)/i    // wi: 123
        ];

        for (const pattern of workItemPatterns) {
            const match = commitMessage.match(pattern);
            if (match) {
                return parseInt(match[1]);
            }
        }

        return null;
    }

    async sendReviewReminder(workItemId: number, reviewerEmails: string[]): Promise<void> {
        try {
            const workItem = await this.mcpClient.getWorkItem(workItemId);
            const comment = `Review reminder sent to: ${reviewerEmails.join(', ')}`;
            await this.addWorkItemComment(workItemId, comment);
            
            // Show notification in VS Code
            vscode.window.showInformationMessage(
                `Review reminder sent for work item ${workItemId}: ${workItem.fields['System.Title']}`
            );
        } catch (error) {
            console.error('Failed to send review reminder:', error);
        }
    }
}
