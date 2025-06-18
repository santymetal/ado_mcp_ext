import * as vscode from 'vscode';
import { McpClient } from './mcpClient';
import { WorkItemManager } from './workItemManager';
import { GitIntegration } from './gitIntegration';
import { PrMonitor } from './prMonitor';
import { CopilotIntegration } from './copilotIntegration';
import { WorkItemWebviewProvider } from './webviewProvider';
import { Config } from './config';

let mcpClient: McpClient;
let workItemManager: WorkItemManager;
let gitIntegration: GitIntegration;
let prMonitor: PrMonitor;
let copilotIntegration: CopilotIntegration;
let webviewProvider: WorkItemWebviewProvider;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Azure DevOps Work Item Manager is now active!');

    try {
        // Initialize configuration
        const config = new Config();
        await config.initialize();

        // Initialize MCP client
        mcpClient = new McpClient(config.getMcpServerUrl());
        await mcpClient.connect();

        // Initialize managers
        workItemManager = new WorkItemManager(mcpClient, config);
        gitIntegration = new GitIntegration(workItemManager, mcpClient);
        prMonitor = new PrMonitor(workItemManager, mcpClient);
        copilotIntegration = new CopilotIntegration(workItemManager);

        // Initialize webview provider
        webviewProvider = new WorkItemWebviewProvider(context.extensionUri, workItemManager);
        
        // Register webview provider
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('workItemsPanel', webviewProvider)
        );

        // Register commands
        registerCommands(context);

        // Start monitoring
        await gitIntegration.initialize();
        await prMonitor.startMonitoring();

        // Show status
        vscode.window.showInformationMessage('Azure DevOps Work Item Manager connected successfully!');

    } catch (error) {
        console.error('Failed to activate extension:', error);
        vscode.window.showErrorMessage(`Failed to initialize Azure DevOps integration: ${error}`);
    }
}

function registerCommands(context: vscode.ExtensionContext) {
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
        } catch (error) {
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

            const selectedItem = await vscode.window.showQuickPick(
                workItems.map(wi => ({
                    label: `${wi.id}: ${wi.title}`,
                    description: wi.state,
                    workItem: wi
                })),
                { placeHolder: 'Select work item to update' }
            );

            if (selectedItem) {
                const newState = await vscode.window.showQuickPick(
                    ['New', 'Active', 'Resolved', 'Closed'],
                    { placeHolder: 'Select new state' }
                );

                if (newState) {
                    await workItemManager.updateWorkItemState(selectedItem.workItem.id, newState);
                    vscode.window.showInformationMessage(`Work item ${selectedItem.workItem.id} updated to ${newState}`);
                    webviewProvider.refresh();
                }
            }
        } catch (error) {
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
        } catch (error) {
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

            const type = await vscode.window.showQuickPick(
                ['Bug', 'Task', 'User Story', 'Feature'],
                { placeHolder: 'Select work item type' }
            );

            if (title && type) {
                const workItem = await workItemManager.createWorkItem(title, description || '', type);
                vscode.window.showInformationMessage(`Work item ${workItem.id} created successfully!`);
                webviewProvider.refresh();
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create work item: ${error}`);
        }
    });

    // Register all commands
    context.subscriptions.push(
        assignWorkItemCommand,
        updateWorkItemCommand,
        linkPRCommand,
        showWorkItemsCommand,
        refreshWorkItemsCommand,
        createWorkItemCommand
    );
}

export function deactivate() {
    if (mcpClient) {
        mcpClient.disconnect();
    }
    if (prMonitor) {
        prMonitor.stopMonitoring();
    }
}
