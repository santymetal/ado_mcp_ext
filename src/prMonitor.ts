import * as vscode from 'vscode';
import { WorkItemManager } from './workItemManager';
import { McpClient } from './mcpClient';

interface PullRequest {
    id: number;
    title: string;
    status: string;
    sourceRefName: string;
    targetRefName: string;
    createdBy: string;
    creationDate: Date;
    url: string;
    workItemIds: number[];
}

export class PrMonitor {
    private monitoringInterval: NodeJS.Timeout | null = null;
    private trackedPRs: Map<number, PullRequest> = new Map();
    private isMonitoring = false;

    constructor(
        private workItemManager: WorkItemManager,
        private mcpClient: McpClient
    ) {}

    async startMonitoring(): Promise<void> {
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
            } catch (error) {
                console.error('Error during PR monitoring:', error);
            }
        }, 5 * 60 * 1000);
    }

    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isMonitoring = false;
        console.log('PR monitoring stopped');
    }

    private async scanPullRequests(): Promise<void> {
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
        } catch (error) {
            console.error('Failed to scan pull requests:', error);
        }
    }

    private async scanRepositoryPRs(repositoryId: string): Promise<void> {
        try {
            const pullRequests = await this.mcpClient.getPullRequests(repositoryId);
            
            for (const pr of pullRequests) {
                const mappedPR = this.mapToPullRequest(pr);
                const existingPR = this.trackedPRs.get(mappedPR.id);

                if (!existingPR) {
                    // New PR discovered
                    await this.handleNewPR(mappedPR);
                } else if (existingPR.status !== mappedPR.status) {
                    // PR status changed
                    await this.handlePRStatusChange(existingPR, mappedPR);
                }

                this.trackedPRs.set(mappedPR.id, mappedPR);
            }
        } catch (error) {
            console.error(`Failed to scan PRs for repository ${repositoryId}:`, error);
        }
    }

    private async handleNewPR(pr: PullRequest): Promise<void> {
        console.log(`New PR discovered: ${pr.id} - ${pr.title}`);

        // Extract work item IDs from PR title or description
        const workItemIds = this.extractWorkItemIds(pr.title);
        pr.workItemIds = workItemIds;

        // Update associated work items
        for (const workItemId of workItemIds) {
            try {
                await this.workItemManager.linkPullRequest(workItemId, pr.url);
                console.log(`Linked PR ${pr.id} to work item ${workItemId}`);
            } catch (error) {
                console.error(`Failed to link PR ${pr.id} to work item ${workItemId}:`, error);
            }
        }

        // Show notification
        if (workItemIds.length > 0) {
            vscode.window.showInformationMessage(
                `New PR created and linked to work items: ${workItemIds.join(', ')}`
            );
        }
    }

    private async handlePRStatusChange(oldPR: PullRequest, newPR: PullRequest): Promise<void> {
        console.log(`PR ${newPR.id} status changed from ${oldPR.status} to ${newPR.status}`);

        if (newPR.status === 'completed' && oldPR.status !== 'completed') {
            // PR was merged
            await this.handlePRMerged(newPR);
        } else if (newPR.status === 'active' && this.shouldSendReviewReminder(newPR)) {
            // PR needs review reminder
            await this.handleReviewReminder(newPR);
        }
    }

    private async handlePRMerged(pr: PullRequest): Promise<void> {
        console.log(`PR ${pr.id} was merged`);

        // Update all associated work items to resolved
        for (const workItemId of pr.workItemIds) {
            try {
                await this.workItemManager.updateWorkItemOnPRMerge(workItemId, pr.url);
                console.log(`Work item ${workItemId} resolved due to PR merge`);
            } catch (error) {
                console.error(`Failed to resolve work item ${workItemId} on PR merge:`, error);
            }
        }

        // Show notification
        if (pr.workItemIds.length > 0) {
            vscode.window.showInformationMessage(
                `PR merged! Work items resolved: ${pr.workItemIds.join(', ')}`
            );
        }
    }

    private async handleReviewReminder(pr: PullRequest): Promise<void> {
        console.log(`Sending review reminder for PR ${pr.id}`);

        // Get reviewers (simplified - in real implementation you'd get this from PR details)
        const reviewerEmails = await this.getPRReviewers(pr.id);

        // Send reminder for each associated work item
        for (const workItemId of pr.workItemIds) {
            try {
                await this.workItemManager.sendReviewReminder(workItemId, reviewerEmails);
            } catch (error) {
                console.error(`Failed to send review reminder for work item ${workItemId}:`, error);
            }
        }
    }

    private shouldSendReviewReminder(pr: PullRequest): boolean {
        const config = vscode.workspace.getConfiguration('azuredevops');
        const reminderDays = config.get<number>('reviewReminderDays', 2);
        const daysSinceCreation = (Date.now() - pr.creationDate.getTime()) / (1000 * 60 * 60 * 24);
        
        return daysSinceCreation >= reminderDays;
    }

    private extractWorkItemIds(text: string): number[] {
        const workItemIds: number[] = [];
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

    private mapToPullRequest(apiPR: any): PullRequest {
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

    private async getRepositoryIds(): Promise<string[]> {
        try {
            // Get Azure DevOps repositories through MCP server
            const repositories = await this.mcpClient.getRepositories();
            return repositories.map((repo: any) => repo.id);
        } catch (error) {
            console.error('Failed to get ADO repository IDs:', error);
            return [];
        }
    }

    private async getPRReviewers(prId: number): Promise<string[]> {
        // In a real implementation, this would fetch actual reviewers from the PR
        // For now, return placeholder emails
        return ['reviewer1@example.com', 'reviewer2@example.com'];
    }

    getTrackedPRs(): PullRequest[] {
        return Array.from(this.trackedPRs.values());
    }
}
