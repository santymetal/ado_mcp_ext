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
exports.CopilotIntegration = void 0;
const vscode = __importStar(require("vscode"));
class CopilotIntegration {
    constructor(workItemManager) {
        this.workItemManager = workItemManager;
        this.disposables = [];
        this.registerCopilotCommands();
    }
    registerCopilotCommands() {
        // Register slash command for work item management
        const workItemCommand = vscode.commands.registerCommand('azuredevops.copilot.workitem', async (args) => {
            return this.handleWorkItemCommand(args);
        });
        this.disposables.push(workItemCommand);
    }
    async handleWorkItemCommand(args) {
        try {
            const input = args?.prompt || '';
            const command = this.parseWorkItemCommand(input);
            switch (command.action) {
                case 'list':
                    return await this.listWorkItems();
                case 'assign':
                    return await this.assignWorkItem(command.workItemId);
                case 'update':
                    return await this.updateWorkItem(command.workItemId, command.state);
                case 'create':
                    return await this.createWorkItem(command.title, command.description, command.type);
                case 'link':
                    return await this.linkPR(command.workItemId, command.prUrl);
                case 'status':
                    return await this.getWorkItemStatus(command.workItemId);
                default:
                    return this.getHelpText();
            }
        }
        catch (error) {
            return `Error: ${error}`;
        }
    }
    parseWorkItemCommand(input) {
        const lowerInput = input.toLowerCase().trim();
        // List work items
        if (lowerInput.includes('list') || lowerInput.includes('show')) {
            return { action: 'list' };
        }
        // Assign work item
        const assignMatch = lowerInput.match(/assign\s+(?:work\s*item\s*)?#?(\d+)/);
        if (assignMatch) {
            return { action: 'assign', workItemId: parseInt(assignMatch[1]) };
        }
        // Update work item state
        const updateMatch = lowerInput.match(/(?:update|set|change)\s+(?:work\s*item\s*)?#?(\d+)\s+(?:to\s+)?(\w+)/);
        if (updateMatch) {
            return { action: 'update', workItemId: parseInt(updateMatch[1]), state: updateMatch[2] };
        }
        // Create work item
        const createMatch = lowerInput.match(/create\s+(?:(\w+)\s+)?(?:work\s*item\s*)?(?:titled\s*)?['""]([^'"]+)['""](?:\s+with\s+description\s*['""]([^'"]+)['""])?/);
        if (createMatch) {
            return {
                action: 'create',
                type: createMatch[1] || 'Task',
                title: createMatch[2],
                description: createMatch[3] || ''
            };
        }
        // Link PR
        const linkMatch = lowerInput.match(/link\s+(?:pr|pull\s*request)\s+(.+?)\s+to\s+(?:work\s*item\s*)?#?(\d+)/);
        if (linkMatch) {
            return { action: 'link', prUrl: linkMatch[1], workItemId: parseInt(linkMatch[2]) };
        }
        // Get work item status
        const statusMatch = lowerInput.match(/(?:status|state)\s+(?:of\s+)?(?:work\s*item\s*)?#?(\d+)/);
        if (statusMatch) {
            return { action: 'status', workItemId: parseInt(statusMatch[1]) };
        }
        return { action: 'help' };
    }
    async listWorkItems() {
        try {
            const workItems = await this.workItemManager.getAssignedWorkItems();
            if (workItems.length === 0) {
                return 'No work items assigned to you.';
            }
            let result = `You have ${workItems.length} assigned work items:\n\n`;
            for (const wi of workItems) {
                result += `• #${wi.id}: ${wi.title} (${wi.state})\n`;
            }
            return result;
        }
        catch (error) {
            return `Failed to retrieve work items: ${error}`;
        }
    }
    async assignWorkItem(workItemId) {
        try {
            await this.workItemManager.assignWorkItem(workItemId);
            return `Work item #${workItemId} has been assigned to you and set to Active state.`;
        }
        catch (error) {
            return `Failed to assign work item #${workItemId}: ${error}`;
        }
    }
    async updateWorkItem(workItemId, state) {
        try {
            const validStates = ['new', 'active', 'resolved', 'closed'];
            const normalizedState = state.toLowerCase();
            if (!validStates.includes(normalizedState)) {
                return `Invalid state '${state}'. Valid states are: ${validStates.join(', ')}`;
            }
            const capitalizedState = normalizedState.charAt(0).toUpperCase() + normalizedState.slice(1);
            await this.workItemManager.updateWorkItemState(workItemId, capitalizedState);
            return `Work item #${workItemId} has been updated to ${capitalizedState} state.`;
        }
        catch (error) {
            return `Failed to update work item #${workItemId}: ${error}`;
        }
    }
    async createWorkItem(title, description, type) {
        try {
            const validTypes = ['Bug', 'Task', 'User Story', 'Feature'];
            const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
            if (!validTypes.includes(normalizedType)) {
                return `Invalid work item type '${type}'. Valid types are: ${validTypes.join(', ')}`;
            }
            const workItem = await this.workItemManager.createWorkItem(title, description, normalizedType);
            return `Created ${normalizedType} #${workItem.id}: ${title}`;
        }
        catch (error) {
            return `Failed to create work item: ${error}`;
        }
    }
    async linkPR(workItemId, prUrl) {
        try {
            await this.workItemManager.linkPullRequest(workItemId, prUrl);
            return `Pull request ${prUrl} has been linked to work item #${workItemId}.`;
        }
        catch (error) {
            return `Failed to link PR to work item #${workItemId}: ${error}`;
        }
    }
    async getWorkItemStatus(workItemId) {
        try {
            const workItems = await this.workItemManager.getAssignedWorkItems();
            const workItem = workItems.find(wi => wi.id === workItemId);
            if (!workItem) {
                return `Work item #${workItemId} not found in your assigned items.`;
            }
            return `Work item #${workItemId}: ${workItem.title}\nState: ${workItem.state}\nAssigned to: ${workItem.assignedTo}`;
        }
        catch (error) {
            return `Failed to get status for work item #${workItemId}: ${error}`;
        }
    }
    getHelpText() {
        return `Available work item commands:

• "list work items" - Show your assigned work items
• "assign work item #123" - Assign work item to yourself
• "update work item #123 to active" - Change work item state
• "create task titled 'Fix bug' with description 'Bug description'" - Create new work item
• "link PR https://dev.azure.com/... to work item #123" - Link PR to work item
• "status of work item #123" - Get work item details

You can also use natural language variations of these commands.`;
    }
    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
exports.CopilotIntegration = CopilotIntegration;
//# sourceMappingURL=copilotIntegration.js.map