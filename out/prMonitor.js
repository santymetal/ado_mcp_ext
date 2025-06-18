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
exports.PrMonitor = void 0;
const vscode = __importStar(require("vscode"));
class PrMonitor {
    constructor(workItemManager, mcpClient) {
        this.workItemManager = workItemManager;
        this.mcpClient = mcpClient;
        this.monitoringInterval = null;
        this.trackedPRs = new Map();
        this.isMonitoring = false;
    }
    async startMonitoring() {
        if (this.isMonitoring) {
            return;
        }
        this.isMonitoring = true;
        console.log('Starting PR monitoring...');
        // Initial scan
        await this.scanPullRequests();
        // Set up periodic monitoring (every 5 minutes)
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.scanPullRequests();
            }
            catch (error) {
                console.error('Error during PR monitoring:', error);
            }
        }, 5 * 60 * 1000);
    }
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isMonitoring = false;
        console.log('PR monitoring stopped');
    }
    async scanPullRequests() {
        try {
            if (!this.mcpClient.isConnectedToServer()) {
                console.log('MCP client not connected, skipping PR scan');
                return;
            }
            // Get all repositories (simplified - in real implementation you'd get this from config)
            const repositoryIds = await this.getRepositoryIds();
            for (const repoId of repositoryIds) {
                await this.scanRepositoryPRs(repoId);
            }
        }
        catch (error) {
            console.error('Failed to scan pull requests:', error);
        }
    }
    async scanRepositoryPRs(repositoryId) {
        try {
            const pullRequests = await this.mcpClient.getPullRequests(repositoryId);
            for (const pr of pullRequests) {
                const mappedPR = this.mapToPullRequest(pr);
                const existingPR = this.trackedPRs.get(mappedPR.id);
                if (!existingPR) {
                    // New PR discovered
                    await this.handleNewPR(mappedPR);
                }
                else if (existingPR.status !== mappedPR.status) {
                    // PR status changed
                    await this.handlePRStatusChange(existingPR, mappedPR);
                }
                this.trackedPRs.set(mappedPR.id, mappedPR);
            }
        }
        catch (error) {
            console.error(`Failed to scan PRs for repository ${repositoryId}:`, error);
        }
    }
    async handleNewPR(pr) {
        console.log(`New PR discovered: ${pr.id} - ${pr.title}`);
        // Extract work item IDs from PR title or description
        const workItemIds = this.extractWorkItemIds(pr.title);
        pr.workItemIds = workItemIds;
        // Update associated work items
        for (const workItemId of workItemIds) {
            try {
                await this.workItemManager.linkPullRequest(workItemId, pr.url);
                console.log(`Linked PR ${pr.id} to work item ${workItemId}`);
            }
            catch (error) {
                console.error(`Failed to link PR ${pr.id} to work item ${workItemId}:`, error);
            }
        }
        // Show notification
        if (workItemIds.length > 0) {
            vscode.window.showInformationMessage(`New PR created and linked to work items: ${workItemIds.join(', ')}`);
        }
    }
    async handlePRStatusChange(oldPR, newPR) {
        console.log(`PR ${newPR.id} status changed from ${oldPR.status} to ${newPR.status}`);
        if (newPR.status === 'completed' && oldPR.status !== 'completed') {
            // PR was merged
            await this.handlePRMerged(newPR);
        }
        else if (newPR.status === 'active' && this.shouldSendReviewReminder(newPR)) {
            // PR needs review reminder
            await this.handleReviewReminder(newPR);
        }
    }
    async handlePRMerged(pr) {
        console.log(`PR ${pr.id} was merged`);
        // Update all associated work items to resolved
        for (const workItemId of pr.workItemIds) {
            try {
                await this.workItemManager.updateWorkItemOnPRMerge(workItemId, pr.url);
                console.log(`Work item ${workItemId} resolved due to PR merge`);
            }
            catch (error) {
                console.error(`Failed to resolve work item ${workItemId} on PR merge:`, error);
            }
        }
        // Show notification
        if (pr.workItemIds.length > 0) {
            vscode.window.showInformationMessage(`PR merged! Work items resolved: ${pr.workItemIds.join(', ')}`);
        }
    }
    async handleReviewReminder(pr) {
        console.log(`Sending review reminder for PR ${pr.id}`);
        // Get reviewers (simplified - in real implementation you'd get this from PR details)
        const reviewerEmails = await this.getPRReviewers(pr.id);
        // Send reminder for each associated work item
        for (const workItemId of pr.workItemIds) {
            try {
                await this.workItemManager.sendReviewReminder(workItemId, reviewerEmails);
            }
            catch (error) {
                console.error(`Failed to send review reminder for work item ${workItemId}:`, error);
            }
        }
    }
    shouldSendReviewReminder(pr) {
        const config = vscode.workspace.getConfiguration('azuredevops');
        const reminderDays = config.get('reviewReminderDays', 2);
        const daysSinceCreation = (Date.now() - pr.creationDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCreation >= reminderDays;
    }
    extractWorkItemIds(text) {
        const workItemIds = [];
        const patterns = [
            /#(\d+)/g,
            /AB#(\d+)/gi,
            /workitem[:\s]+(\d+)/gi,
            /wi[:\s]+(\d+)/gi
        ];
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const id = parseInt(match[1]);
                if (!workItemIds.includes(id)) {
                    workItemIds.push(id);
                }
            }
        }
        return workItemIds;
    }
    mapToPullRequest(apiPR) {
        return {
            id: apiPR.pullRequestId,
            title: apiPR.title || '',
            status: apiPR.status || 'active',
            sourceRefName: apiPR.sourceRefName || '',
            targetRefName: apiPR.targetRefName || '',
            createdBy: apiPR.createdBy?.displayName || '',
            creationDate: new Date(apiPR.creationDate || Date.now()),
            url: apiPR._links?.web?.href || '',
            workItemIds: []
        };
    }
    async getRepositoryIds() {
        // In a real implementation, this would come from configuration or project settings
        // For now, return a placeholder
        return ['default-repo'];
    }
    async getPRReviewers(prId) {
        // In a real implementation, this would fetch actual reviewers from the PR
        // For now, return placeholder emails
        return ['reviewer1@example.com', 'reviewer2@example.com'];
    }
    getTrackedPRs() {
        return Array.from(this.trackedPRs.values());
    }
}
exports.PrMonitor = PrMonitor;
//# sourceMappingURL=prMonitor.js.map