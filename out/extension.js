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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const mcpClient_1 = require("./mcpClient");
const workItemManager_1 = require("./workItemManager");
const gitIntegration_1 = require("./gitIntegration");
const prMonitor_1 = require("./prMonitor");
const copilotIntegration_1 = require("./copilotIntegration");
const webviewProvider_1 = require("./webviewProvider");
const config_1 = require("./config");
let mcpClient;
let workItemManager;
let gitIntegration;
let prMonitor;
let copilotIntegration;
let webviewProvider;
async function activate(context) {
    console.log('Azure DevOps Work Item Manager is now active!');
    try {
        // Initialize configuration
        const config = new config_1.Config();
        await config.initialize();
        // Initialize MCP client
        mcpClient = new mcpClient_1.McpClient(config.getMcpServerUrl());
        await mcpClient.connect();
        // Initialize managers
        workItemManager = new workItemManager_1.WorkItemManager(mcpClient, config);
        gitIntegration = new gitIntegration_1.GitIntegration(workItemManager);
        prMonitor = new prMonitor_1.PrMonitor(workItemManager, mcpClient);
        copilotIntegration = new copilotIntegration_1.CopilotIntegration(workItemManager);
        // Initialize webview provider
        webviewProvider = new webviewProvider_1.WorkItemWebviewProvider(context.extensionUri, workItemManager);
        // Register webview provider
        context.subscriptions.push(vscode.window.registerWebviewViewProvider('workItemsPanel', webviewProvider));
        // Register commands
        registerCommands(context);
        // Start monitoring
        await gitIntegration.initialize();
        await prMonitor.startMonitoring();
        // Show status
        vscode.window.showInformationMessage('Azure DevOps Work Item Manager connected successfully!');
    }
    catch (error) {
        console.error('Failed to activate extension:', error);
        vscode.window.showErrorMessage(`Failed to initialize Azure DevOps integration: ${error}`);
    }
}
function registerCommands(context) {
    // Assign work item command
    const assignWorkItemCommand = vscode.commands.registerCommand('azuredevops.assignWorkItem', async () => {
        try {
            const workItemId = await vscode.window.showInputBox({
                prompt: 'Enter Work Item ID to assign',
                validateInput: (value) => {
                    if (!value || isNaN(Number(value))) {
                        return 'Please enter a valid work item ID';
                    }
                    return null;
                }
            });
            if (workItemId) {
                await workItemManager.assignWorkItem(Number(workItemId));
                vscode.window.showInformationMessage(`Work item ${workItemId} assigned successfully!`);
                webviewProvider.refresh();
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to assign work item: ${error}`);
        }
    });
    // Update work item command
    const updateWorkItemCommand = vscode.commands.registerCommand('azuredevops.updateWorkItem', async () => {
        try {
            const workItems = await workItemManager.getAssignedWorkItems();
            if (workItems.length === 0) {
                vscode.window.showInformationMessage('No assigned work items found');
                return;
            }
            const selectedItem = await vscode.window.showQuickPick(workItems.map(wi => ({
                label: `${wi.id}: ${wi.title}`,
                description: wi.state,
                workItem: wi
            })), { placeHolder: 'Select work item to update' });
            if (selectedItem) {
                const newState = await vscode.window.showQuickPick(['New', 'Active', 'Resolved', 'Closed'], { placeHolder: 'Select new state' });
                if (newState) {
                    await workItemManager.updateWorkItemState(selectedItem.workItem.id, newState);
                    vscode.window.showInformationMessage(`Work item ${selectedItem.workItem.id} updated to ${newState}`);
                    webviewProvider.refresh();
                }
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to update work item: ${error}`);
        }
    });
    // Link PR command
    const linkPRCommand = vscode.commands.registerCommand('azuredevops.linkPR', async () => {
        try {
            const workItemId = await vscode.window.showInputBox({
                prompt: 'Enter Work Item ID to link PR',
                validateInput: (value) => {
                    if (!value || isNaN(Number(value))) {
                        return 'Please enter a valid work item ID';
                    }
                    return null;
                }
            });
            const prUrl = await vscode.window.showInputBox({
                prompt: 'Enter Pull Request URL',
                validateInput: (value) => {
                    if (!value || !value.includes('pullrequest')) {
                        return 'Please enter a valid PR URL';
                    }
                    return null;
                }
            });
            if (workItemId && prUrl) {
                await workItemManager.linkPullRequest(Number(workItemId), prUrl);
                vscode.window.showInformationMessage(`PR linked to work item ${workItemId}`);
                webviewProvider.refresh();
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to link PR: ${error}`);
        }
    });
    // Show work items panel command
    const showWorkItemsCommand = vscode.commands.registerCommand('azuredevops.showWorkItems', () => {
        vscode.commands.executeCommand('workItemsPanel.focus');
    });
    // Refresh work items command
    const refreshWorkItemsCommand = vscode.commands.registerCommand('azuredevops.refreshWorkItems', () => {
        webviewProvider.refresh();
    });
    // Create work item command
    const createWorkItemCommand = vscode.commands.registerCommand('azuredevops.createWorkItem', async () => {
        try {
            const title = await vscode.window.showInputBox({
                prompt: 'Enter work item title',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Title is required';
                    }
                    return null;
                }
            });
            const description = await vscode.window.showInputBox({
                prompt: 'Enter work item description (optional)'
            });
            const type = await vscode.window.showQuickPick(['Bug', 'Task', 'User Story', 'Feature'], { placeHolder: 'Select work item type' });
            if (title && type) {
                const workItem = await workItemManager.createWorkItem(title, description || '', type);
                vscode.window.showInformationMessage(`Work item ${workItem.id} created successfully!`);
                webviewProvider.refresh();
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to create work item: ${error}`);
        }
    });
    // Register all commands
    context.subscriptions.push(assignWorkItemCommand, updateWorkItemCommand, linkPRCommand, showWorkItemsCommand, refreshWorkItemsCommand, createWorkItemCommand);
}
function deactivate() {
    if (mcpClient) {
        mcpClient.disconnect();
    }
    if (prMonitor) {
        prMonitor.stopMonitoring();
    }
}
//# sourceMappingURL=extension.js.map