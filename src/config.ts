import * as vscode from 'vscode';
import { McpServerConfig, NotificationSettings } from './types';

export class Config {
    private static readonly SECTION = 'azuredevops';
    
    async initialize(): Promise<void> {
        // Validate required configuration
        const organization = this.getOrganization();
        const project = this.getProject();
        
        if (!organization || !project) {
            const result = await vscode.window.showWarningMessage(
                'Azure DevOps organization and project must be configured.',
                'Open Settings'
            );
            
            if (result === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', '@ext:azure-devops-tools.azure-devops-workitem-manager');
            }
            
            throw new Error('Azure DevOps configuration incomplete');
        }
    }

    getMcpServerUrl(): string {
        const config = vscode.workspace.getConfiguration(Config.SECTION);
        return config.get<string>('mcpServerUrl', 'ws://localhost:3000');
    }

    getOrganization(): string {
        const config = vscode.workspace.getConfiguration(Config.SECTION);
        return config.get<string>('organization', '');
    }

    getProject(): string {
        const config = vscode.workspace.getConfiguration(Config.SECTION);
        return config.get<string>('project', '');
    }

    getPersonalAccessToken(): string | undefined {
        // Get PAT from environment variable first, then from secrets
        return process.env.AZURE_DEVOPS_PAT || undefined;
    }

    getMcpServerConfig(): McpServerConfig {
        return {
            url: this.getMcpServerUrl(),
            organization: this.getOrganization(),
            project: this.getProject(),
            personalAccessToken: this.getPersonalAccessToken()
        };
    }

    getNotificationSettings(): NotificationSettings {
        const config = vscode.workspace.getConfiguration(Config.SECTION);
        
        return {
            enableCommitNotifications: config.get<boolean>('autoUpdateOnCommit', true),
            enablePRNotifications: config.get<boolean>('autoUpdateOnPR', true),
            enableReviewReminders: config.get<boolean>('enableReviewReminders', true),
            reviewReminderDays: config.get<number>('reviewReminderDays', 2)
        };
    }

    async setMcpServerUrl(url: string): Promise<void> {
        const config = vscode.workspace.getConfiguration(Config.SECTION);
        await config.update('mcpServerUrl', url, vscode.ConfigurationTarget.Global);
    }

    async setOrganization(organization: string): Promise<void> {
        const config = vscode.workspace.getConfiguration(Config.SECTION);
        await config.update('organization', organization, vscode.ConfigurationTarget.Global);
    }

    async setProject(project: string): Promise<void> {
        const config = vscode.workspace.getConfiguration(Config.SECTION);
        await config.update('project', project, vscode.ConfigurationTarget.Global);
    }

    onConfigurationChange(callback: () => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(Config.SECTION)) {
                callback();
            }
        });
    }

    validateConfiguration(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        
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
