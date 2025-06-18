import * as vscode from 'vscode';
import { WorkItemManager } from './workItemManager';

export class GitIntegration {
    private gitExtension: any;
    private repositories: any[] = [];
    private disposables: vscode.Disposable[] = [];

    constructor(private workItemManager: WorkItemManager) {}

    async initialize(): Promise<void> {
        try {
            // Get Git extension
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (!gitExtension) {
                throw new Error('Git extension not found');
            }

            if (!gitExtension.isActive) {
                await gitExtension.activate();
            }

            this.gitExtension = gitExtension.exports.getAPI(1);
            this.repositories = this.gitExtension.repositories;

            // Set up event listeners for each repository
            this.setupRepositoryListeners();

            console.log(`Git integration initialized with ${this.repositories.length} repositories`);
        } catch (error) {
            console.error('Failed to initialize Git integration:', error);
            vscode.window.showWarningMessage('Git integration failed to initialize. Automatic work item updates on commit will not work.');
        }
    }

    private setupRepositoryListeners(): void {
        for (const repo of this.repositories) {
            // Listen for commit events
            const commitDisposable = repo.state.onDidChange(() => {
                this.handleRepositoryStateChange(repo);
            });

            this.disposables.push(commitDisposable);
        }

        // Listen for new repositories
        const repoChangeDisposable = this.gitExtension.onDidChangeRepositories(() => {
            this.repositories = this.gitExtension.repositories;
            this.setupRepositoryListeners();
        });

        this.disposables.push(repoChangeDisposable);
    }

    private async handleRepositoryStateChange(repo: any): Promise<void> {
        try {
            // Check if there are new commits
            const head = repo.state.HEAD;
            if (!head || !head.commit) {
                return;
            }

            // Get recent commits
            const commits = await this.getRecentCommits(repo);
            
            for (const commit of commits) {
                await this.processCommit(commit);
            }
        } catch (error) {
            console.error('Error handling repository state change:', error);
        }
    }

    private async getRecentCommits(repo: any, limit: number = 5): Promise<any[]> {
        try {
            const log = await repo.log({ maxEntries: limit });
            return log || [];
        } catch (error) {
            console.error('Failed to get recent commits:', error);
            return [];
        }
    }

    private async processCommit(commit: any): Promise<void> {
        try {
            const commitMessage = commit.message || '';
            const commitSha = commit.hash || '';

            // Extract work item ID from commit message
            const workItemId = this.workItemManager.getWorkItemFromCommitMessage(commitMessage);
            
            if (workItemId) {
                console.log(`Found work item ${workItemId} in commit ${commitSha}`);
                
                // Update work item with commit information
                await this.workItemManager.updateWorkItemOnCommit(workItemId, commitSha, commitMessage);
                
                // Show notification
                vscode.window.showInformationMessage(
                    `Work item ${workItemId} updated with commit ${commitSha.substring(0, 8)}`
                );
            }
        } catch (error) {
            console.error('Failed to process commit:', error);
        }
    }

    async createBranch(workItemId: number, workItemTitle: string): Promise<void> {
        try {
            if (this.repositories.length === 0) {
                vscode.window.showErrorMessage('No Git repositories found');
                return;
            }

            const repo = this.repositories[0]; // Use first repository
            const branchName = `feature/${workItemId}-${this.sanitizeBranchName(workItemTitle)}`;

            await repo.createBranch(branchName, true);
            
            vscode.window.showInformationMessage(`Created and switched to branch: ${branchName}`);
        } catch (error) {
            console.error('Failed to create branch:', error);
            vscode.window.showErrorMessage(`Failed to create branch: ${error}`);
        }
    }

    private sanitizeBranchName(title: string): string {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
    }

    async commitWithWorkItem(workItemId: number, message: string): Promise<void> {
        try {
            if (this.repositories.length === 0) {
                vscode.window.showErrorMessage('No Git repositories found');
                return;
            }

            const repo = this.repositories[0];
            const commitMessage = `${message}\n\nWork item: #${workItemId}`;

            // Stage all changes
            await repo.add([]);
            
            // Commit with work item reference
            await repo.commit(commitMessage);

            vscode.window.showInformationMessage(`Committed with work item reference: #${workItemId}`);
        } catch (error) {
            console.error('Failed to commit with work item:', error);
            vscode.window.showErrorMessage(`Failed to commit: ${error}`);
        }
    }

    getCurrentBranch(): string | null {
        try {
            if (this.repositories.length === 0) {
                return null;
            }

            const repo = this.repositories[0];
            const head = repo.state.HEAD;
            return head ? head.name : null;
        } catch (error) {
            console.error('Failed to get current branch:', error);
            return null;
        }
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
