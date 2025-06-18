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
exports.WorkItemWebviewProvider = void 0;
const vscode = __importStar(require("vscode"));
class WorkItemWebviewProvider {
    constructor(_extensionUri, workItemManager) {
        this._extensionUri = _extensionUri;
        this.workItemManager = workItemManager;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'media')
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
    async refresh() {
        if (this._view) {
            try {
                const workItems = await this.workItemManager.getAssignedWorkItems();
                this._view.webview.postMessage({
                    type: 'updateWorkItems',
                    workItems: workItems
                });
            }
            catch (error) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: `Failed to load work items: ${error}`
                });
            }
        }
    }
    async handleAssignWorkItem(workItemId) {
        try {
            await this.workItemManager.assignWorkItem(parseInt(workItemId));
            this.refresh();
            vscode.window.showInformationMessage(`Work item ${workItemId} assigned successfully!`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to assign work item: ${error}`);
        }
    }
    async handleUpdateWorkItem(workItemId, newState) {
        try {
            await this.workItemManager.updateWorkItemState(parseInt(workItemId), newState);
            this.refresh();
            vscode.window.showInformationMessage(`Work item ${workItemId} updated to ${newState}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to update work item: ${error}`);
        }
    }
    async handleOpenWorkItem(workItemId) {
        try {
            const workItems = await this.workItemManager.getAssignedWorkItems();
            const workItem = workItems.find(wi => wi.id === parseInt(workItemId));
            if (workItem && workItem.url) {
                vscode.env.openExternal(vscode.Uri.parse(workItem.url));
            }
            else {
                vscode.window.showWarningMessage(`Work item ${workItemId} URL not available`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to open work item: ${error}`);
        }
    }
    async handleCreateBranch(workItemId, title) {
        try {
            // This would typically be handled by GitIntegration
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (gitExtension) {
                vscode.window.showInformationMessage(`Create branch feature/${workItemId}-${title.replace(/\s+/g, '-').toLowerCase()}`);
            }
            else {
                vscode.window.showWarningMessage('Git extension not available');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to create branch: ${error}`);
        }
    }
    _getHtmlForWebview(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'workitem-panel.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'workitem-panel.css'));
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
exports.WorkItemWebviewProvider = WorkItemWebviewProvider;
WorkItemWebviewProvider.viewType = 'workItemsPanel';
//# sourceMappingURL=webviewProvider.js.map