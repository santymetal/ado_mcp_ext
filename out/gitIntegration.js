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
exports.GitIntegration = void 0;
const vscode = __importStar(require("vscode"));
class GitIntegration {
    constructor(workItemManager) {
        this.workItemManager = workItemManager;
        this.repositories = [];
        this.disposables = [];
    }
    async initialize() {
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
        }
        catch (error) {
            console.error('Failed to initialize Git integration:', error);
            vscode.window.showWarningMessage('Git integration failed to initialize. Automatic work item updates on commit will not work.');
        }
    }
    setupRepositoryListeners() {
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
    async handleRepositoryStateChange(repo) {
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
        }
        catch (error) {
            console.error('Error handling repository state change:', error);
        }
    }
    async getRecentCommits(repo, limit = 5) {
        try {
            const log = await repo.log({ maxEntries: limit });
            return log || [];
        }
        catch (error) {
            console.error('Failed to get recent commits:', error);
            return [];
        }
    }
    async processCommit(commit) {
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
                vscode.window.showInformationMessage(`Work item ${workItemId} updated with commit ${commitSha.substring(0, 8)}`);
            }
        }
        catch (error) {
            console.error('Failed to process commit:', error);
        }
    }
    async createBranch(workItemId, workItemTitle) {
        try {
            if (this.repositories.length === 0) {
                vscode.window.showErrorMessage('No Git repositories found');
                return;
            }
            const repo = this.repositories[0]; // Use first repository
            const branchName = `feature/${workItemId}-${this.sanitizeBranchName(workItemTitle)}`;
            await repo.createBranch(branchName, true);
            vscode.window.showInformationMessage(`Created and switched to branch: ${branchName}`);
        }
        catch (error) {
            console.error('Failed to create branch:', error);
            vscode.window.showErrorMessage(`Failed to create branch: ${error}`);
        }
    }
    sanitizeBranchName(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
    }
    async commitWithWorkItem(workItemId, message) {
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
        }
        catch (error) {
            console.error('Failed to commit with work item:', error);
            vscode.window.showErrorMessage(`Failed to commit: ${error}`);
        }
    }
    getCurrentBranch() {
        try {
            if (this.repositories.length === 0) {
                return null;
            }
            const repo = this.repositories[0];
            const head = repo.state.HEAD;
            return head ? head.name : null;
        }
        catch (error) {
            console.error('Failed to get current branch:', error);
            return null;
        }
    }
    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
exports.GitIntegration = GitIntegration;
//# sourceMappingURL=gitIntegration.js.map