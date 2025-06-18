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
exports.Config = void 0;
const vscode = __importStar(require("vscode"));
class Config {
    async initialize() {
        // Validate required configuration
        const organization = this.getOrganization();
        const project = this.getProject();
        if (!organization || !project) {
            const result = await vscode.window.showWarningMessage('Azure DevOps organization and project must be configured.', 'Open Settings');
            if (result === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', '@ext:azure-devops-tools.azure-devops-workitem-manager');
            }
            throw new Error('Azure DevOps configuration incomplete');
        }
    }
    getMcpServerUrl() {
        const config = vscode.workspace.getConfiguration(Config.SECTION);
        return config.get('mcpServerUrl', 'ws://localhost:3000');
    }
    getOrganization() {
        const config = vscode.workspace.getConfiguration(Config.SECTION);
        return config.get('organization', '');
    }
    getProject() {
        const config = vscode.workspace.getConfiguration(Config.SECTION);
        return config.get('project', '');
    }
    getPersonalAccessToken() {
        // Get PAT from environment variable first, then from secrets
        return process.env.AZURE_DEVOPS_PAT || undefined;
    }
    getMcpServerConfig() {
        return {
            url: this.getMcpServerUrl(),
            organization: this.getOrganization(),
            project: this.getProject(),
            personalAccessToken: this.getPersonalAccessToken()
        };
    }
    getNotificationSettings() {
        const config = vscode.workspace.getConfiguration(Config.SECTION);
        return {
            enableCommitNotifications: config.get('autoUpdateOnCommit', true),
            enablePRNotifications: config.get('autoUpdateOnPR', true),
            enableReviewReminders: config.get('enableReviewReminders', true),
            reviewReminderDays: config.get('reviewReminderDays', 2)
        };
    }
    async setMcpServerUrl(url) {
        const config = vscode.workspace.getConfiguration(Config.SECTION);
        await config.update('mcpServerUrl', url, vscode.ConfigurationTarget.Global);
    }
    async setOrganization(organization) {
        const config = vscode.workspace.getConfiguration(Config.SECTION);
        await config.update('organization', organization, vscode.ConfigurationTarget.Global);
    }
    async setProject(project) {
        const config = vscode.workspace.getConfiguration(Config.SECTION);
        await config.update('project', project, vscode.ConfigurationTarget.Global);
    }
    onConfigurationChange(callback) {
        return vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(Config.SECTION)) {
                callback();
            }
        });
    }
    validateConfiguration() {
        const errors = [];
        if (!this.getOrganization()) {
            errors.push('Azure DevOps organization is not configured');
        }
        if (!this.getProject()) {
            errors.push('Azure DevOps project is not configured');
        }
        if (!this.getMcpServerUrl()) {
            errors.push('MCP server URL is not configured');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.Config = Config;
Config.SECTION = 'azuredevops';
//# sourceMappingURL=config.js.map