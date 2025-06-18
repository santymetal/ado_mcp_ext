"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkItemManager = void 0;
const vscode = __importStar(require("vscode"));
class WorkItemManager {
    constructor(mcpClient, config) {
        this.mcpClient = mcpClient;
        this.config = config;
        this.assignedWorkItems = [];
        this.currentUser = '';
        this.initializeCurrentUser();
    }
    async initializeCurrentUser() {
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
        }
        catch (error) {
            console.error('Failed to get current user:', error);
            this.currentUser = 'unknown@example.com';
        }
    }
    async getAssignedWorkItems() {
        try {
            if (!this.mcpClient.isConnectedToServer()) {
                throw new Error('Not connected to MCP server');
            }
            const workItems = await this.mcpClient.getAssignedWorkItems(this.currentUser);
            this.assignedWorkItems = workItems.map(wi => this.mapToWorkItem(wi));
            return this.assignedWorkItems;
        }
        catch (error) {
            console.error('Failed to get assigned work items:', error);
            vscode.window.showErrorMessage(`Failed to retrieve work items: ${error}`);
            return [];
        }
    }
    async assignWorkItem(workItemId) {
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
        }
        catch (error) {
            console.error('Failed to assign work item:', error);
            throw error;
        }
    }
    async updateWorkItemState(workItemId, newState) {
        try {
            const fields = {
                'System.State': newState
            };
            // Add specific fields based on state transition
            if (newState === 'Resolved') {
                fields['Microsoft.VSTS.Common.ResolvedReason'] = 'Fixed';
                fields['Microsoft.VSTS.Common.ResolvedBy'] = this.currentUser;
            }
            else if (newState === 'Active') {
                fields['Microsoft.VSTS.Common.ActivatedBy'] = this.currentUser;
                fields['Microsoft.VSTS.Common.ActivatedDate'] = new Date().toISOString();
            }
            await this.mcpClient.updateWorkItem(workItemId, fields);
            // Add comment about state change
            await this.addWorkItemComment(workItemId, `State changed to ${newState} by ${this.currentUser}`);
            // Refresh assigned work items
            await this.getAssignedWorkItems();
        }
        catch (error) {
            console.error('Failed to update work item state:', error);
            throw error;
        }
    }
    async createWorkItem(title, description, type) {
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
        }
        catch (error) {
            console.error('Failed to create work item:', error);
            throw error;
        }
    }
    async linkPullRequest(workItemId, prUrl) {
        try {
            await this.mcpClient.linkWorkItemToPR(workItemId, prUrl);
            // Update work item state to Active if it's New
            const workItem = await this.mcpClient.getWorkItem(workItemId);
            if (workItem.fields['System.State'] === 'New') {
                await this.updateWorkItemState(workItemId, 'Active');
            }
            // Add comment about PR link
            await this.addWorkItemComment(workItemId, `Pull request linked: ${prUrl}`);
        }
        catch (error) {
            console.error('Failed to link pull request:', error);
            throw error;
        }
    }
    async updateWorkItemOnCommit(workItemId, commitSha, commitMessage) {
        try {
            // Add comment about commit
            await this.addWorkItemComment(workItemId, `Code committed: ${commitSha}\n${commitMessage}`);
            // Update state to Active if it's New
            const workItem = await this.mcpClient.getWorkItem(workItemId);
            if (workItem.fields['System.State'] === 'New') {
                await this.updateWorkItemState(workItemId, 'Active');
            }
        }
        catch (error) {
            console.error('Failed to update work item on commit:', error);
        }
    }
    async updateWorkItemOnPRMerge(workItemId, prUrl) {
        try {
            // Update state to Resolved
            await this.updateWorkItemState(workItemId, 'Resolved');
            // Add comment about PR merge
            await this.addWorkItemComment(workItemId, `Pull request merged: ${prUrl}\nWork item automatically resolved.`);
        }
        catch (error) {
            console.error('Failed to update work item on PR merge:', error);
        }
    }
    async addWorkItemComment(workItemId, comment) {
        try {
            const fields = {
                'System.History': comment
            };
            await this.mcpClient.updateWorkItem(workItemId, fields);
        }
        catch (error) {
            console.error('Failed to add work item comment:', error);
        }
    }
    mapToWorkItem(apiWorkItem) {
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
    getWorkItemFromCommitMessage(commitMessage) {
        // Look for work item patterns in commit message
        const workItemPatterns = [
            /#(\d+)/, // #123
            /AB#(\d+)/i, // AB#123
            /workitem[:\s]+(\d+)/i, // workitem: 123
            /wi[:\s]+(\d+)/i // wi: 123
        ];
        for (const pattern of workItemPatterns) {
            const match = commitMessage.match(pattern);
            if (match) {
                return parseInt(match[1]);
            }
        }
        return null;
    }
    async sendReviewReminder(workItemId, reviewerEmails) {
        try {
            const workItem = await this.mcpClient.getWorkItem(workItemId);
            const comment = `Review reminder sent to: ${reviewerEmails.join(', ')}`;
            await this.addWorkItemComment(workItemId, comment);
            // Show notification in VS Code
            vscode.window.showInformationMessage(`Review reminder sent for work item ${workItemId}: ${workItem.fields['System.Title']}`);
        }
        catch (error) {
            console.error('Failed to send review reminder:', error);
        }
    }
}
exports.WorkItemManager = WorkItemManager;
//# sourceMappingURL=workItemManager.js.map