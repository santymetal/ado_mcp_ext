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
    constructor(workItemManager, mcpClient) {
        this.workItemManager = workItemManager;
        this.mcpClient = mcpClient;
        this.repositories = [];
        this.disposables = [];
    }
    async initialize() {
        try {
            // Get Git extension for local VS Code integration
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (!gitExtension) {
                throw new Error('Git extension not found');
            }
            if (!gitExtension.isActive) {
                await gitExtension.activate();
            }
            this.gitExtension = gitExtension.exports.getAPI(1);
            this.repositories = this.gitExtension.repositories;
            // Set up event listeners for local repository changes
            this.setupRepositoryListeners();
            // Start monitoring Azure DevOps repositories through MCP
            this.startAdoRepositoryMonitoring();
            console.log(`ADO Git integration initialized with ${this.repositories.length} local repositories`);
        }
        catch (error) {
            console.error('Failed to initialize ADO Git integration:', error);
            vscode.window.showWarningMessage('Azure DevOps Git integration failed to initialize. Automatic work item updates may not work.');
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
                console.log(`Found work item ${workItemId} in ADO commit ${commitSha}`);
                // Update work item with commit information via MCP
                await this.workItemManager.updateWorkItemOnCommit(workItemId, commitSha, commitMessage);
                // Sync commit to Azure DevOps if needed
                await this.syncCommitToAdo(commitSha, commitMessage, workItemId);
                vscode.window.showInformationMessage(`Work item ${workItemId} updated with ADO commit ${commitSha.substring(0, 8)}`);
            }
        }
        catch (error) {
            console.error('Failed to process ADO commit:', error);
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
    async startAdoRepositoryMonitoring() {
        // Monitor Azure DevOps repositories through MCP server
        try {
            console.log('Starting Azure DevOps repository monitoring...');
            // This could be expanded to poll ADO repos for changes
            // For now, we rely on local Git events and sync to ADO
        }
        catch (error) {
            console.error('Failed to start ADO repository monitoring:', error);
        }
    }
    async syncCommitToAdo(commitSha, commitMessage, workItemId) {
        try {
            // Ensure the commit is properly linked in Azure DevOps
            // The MCP server handles the actual ADO API calls
            console.log(`Syncing commit ${commitSha} to Azure DevOps for work item ${workItemId}`);
            // Additional ADO-specific commit linking could be added here
            // through the MCP client if needed
        }
        catch (error) {
            console.error('Failed to sync commit to Azure DevOps:', error);
        }
    }
    async getAdoRepositoryBranches(repositoryId) {
        try {
            // Get branches from Azure DevOps repository through MCP
            const branches = await this.mcpClient.sendRequest('git.getBranches', { repositoryId });
            return branches || [];
        }
        catch (error) {
            console.error('Failed to get ADO repository branches:', error);
            return [];
        }
    }
    async createAdoBranch(repositoryId, branchName, sourceBranch = 'main') {
        try {
            // Create branch in Azure DevOps repository through MCP
            await this.mcpClient.sendRequest('git.createBranch', {
                repositoryId,
                branchName,
                sourceBranch
            });
            vscode.window.showInformationMessage(`Created ADO branch: ${branchName}`);
        }
        catch (error) {
            console.error('Failed to create ADO branch:', error);
            vscode.window.showErrorMessage(`Failed to create ADO branch: ${error}`);
        }
    }
    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
exports.GitIntegration = GitIntegration;
//# sourceMappingURL=gitIntegration.js.map