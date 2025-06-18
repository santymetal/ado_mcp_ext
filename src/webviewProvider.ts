import * as vscode from 'vscode';
import { WorkItemManager } from './workItemManager';
import { WorkItem } from './types';

export class WorkItemWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'workItemsPanel';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private workItemManager: WorkItemManager
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(this._extensionUri.fsPath + '/media')
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'refresh':
                    this.refresh();
                    break;
                case 'assignWorkItem':
                    await this.handleAssignWorkItem(message.workItemId);
                    break;
                case 'updateWorkItem':
                    await this.handleUpdateWorkItem(message.workItemId, message.newState);
                    break;
                case 'openWorkItem':
                    await this.handleOpenWorkItem(message.workItemId);
                    break;
                case 'createBranch':
                    await this.handleCreateBranch(message.workItemId, message.title);
                    break;
            }
        });

        // Initial load
        this.refresh();
    }

    public async refresh() {
        if (this._view) {
            try {
                const workItems = await this.workItemManager.getAssignedWorkItems();
                this._view.webview.postMessage({
                    type: 'updateWorkItems',
                    workItems: workItems
                });
            } catch (error) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: `Failed to load work items: ${error}`
                });
            }
        }
    }

    private async handleAssignWorkItem(workItemId: string) {
        try {
            await this.workItemManager.assignWorkItem(parseInt(workItemId));
            this.refresh();
            vscode.window.showInformationMessage(`Work item ${workItemId} assigned successfully!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to assign work item: ${error}`);
        }
    }

    private async handleUpdateWorkItem(workItemId: string, newState: string) {
        try {
            await this.workItemManager.updateWorkItemState(parseInt(workItemId), newState);
            this.refresh();
            vscode.window.showInformationMessage(`Work item ${workItemId} updated to ${newState}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to update work item: ${error}`);
        }
    }

    private async handleOpenWorkItem(workItemId: string) {
        try {
            const workItems = await this.workItemManager.getAssignedWorkItems();
            const workItem = workItems.find(wi => wi.id === parseInt(workItemId));
            
            if (workItem && workItem.url) {
                vscode.env.openExternal(vscode.Uri.parse(workItem.url));
            } else {
                vscode.window.showWarningMessage(`Work item ${workItemId} URL not available`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open work item: ${error}`);
        }
    }

    private async handleCreateBranch(workItemId: string, title: string) {
        try {
            // This would typically be handled by GitIntegration
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (gitExtension) {
                vscode.window.showInformationMessage(`Create branch feature/${workItemId}-${title.replace(/\s+/g, '-').toLowerCase()}`);
            } else {
                vscode.window.showWarningMessage('Git extension not available');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create branch: ${error}`);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(this._extensionUri.fsPath + '/media/workitem-panel.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.file(this._extensionUri.fsPath + '/media/workitem-panel.css'));

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <title>Azure DevOps Work Items</title>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Work Items</h2>
            <button id="refreshBtn" class="btn btn-primary">
                <span class="codicon codicon-refresh"></span>
                Refresh
            </button>
        </div>
        
        <div id="loadingIndicator" class="loading hidden">
            <span class="codicon codicon-loading codicon-modifier-spin"></span>
            Loading work items...
        </div>
        
        <div id="errorMessage" class="error hidden"></div>
        
        <div id="workItemsList" class="work-items-list">
            <!-- Work items will be populated here -->
        </div>
        
        <div id="emptyState" class="empty-state hidden">
            <span class="codicon codicon-inbox"></span>
            <p>No work items assigned to you.</p>
            <p>Use the command palette to assign or create work items.</p>
        </div>
    </div>
    
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }
}
