import * as vscode from 'vscode';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

export interface McpMessage {
    id: string;
    method: string;
    params?: any;
    result?: any;
    error?: any;
}

export class McpClient {
    private ws: WebSocket | null = null;
    private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
    private isConnected = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor(private serverUrl: string) {}

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.serverUrl);

                this.ws.on('open', () => {
                    console.log('Connected to MCP server');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    resolve();
                });

                this.ws.on('message', (data: WebSocket.Data) => {
                    try {
                        const message: McpMessage = JSON.parse(data.toString());
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('Failed to parse MCP message:', error);
                    }
                });

                this.ws.on('close', () => {
                    console.log('Disconnected from MCP server');
                    this.isConnected = false;
                    this.attemptReconnect();
                });

                this.ws.on('error', (error) => {
                    console.error('MCP WebSocket error:', error);
                    if (!this.isConnected) {
                        reject(error);
                    }
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    private async attemptReconnect(): Promise<void> {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            vscode.window.showErrorMessage('Failed to reconnect to Azure DevOps MCP server. Please check your configuration.');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        console.log(`Attempting to reconnect to MCP server (attempt ${this.reconnectAttempts})...`);
        
        setTimeout(() => {
            this.connect().catch(error => {
                console.error('Reconnection failed:', error);
            });
        }, delay);
    }

    private handleMessage(message: McpMessage): void {
        if (message.id && this.pendingRequests.has(message.id)) {
            const { resolve, reject } = this.pendingRequests.get(message.id)!;
            this.pendingRequests.delete(message.id);

            if (message.error) {
                reject(new Error(message.error.message || 'MCP request failed'));
            } else {
                resolve(message.result);
            }
        }
    }

    async sendRequest(method: string, params?: any): Promise<any> {
        if (!this.isConnected || !this.ws) {
            throw new Error('Not connected to MCP server');
        }

        const id = uuidv4();
        const message: McpMessage = {
            id,
            method,
            params
        };

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            
            this.ws!.send(JSON.stringify(message), (error) => {
                if (error) {
                    this.pendingRequests.delete(id);
                    reject(error);
                }
            });

            // Set timeout for request
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Request timeout'));
                }
            }, 30000);
        });
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.pendingRequests.clear();
    }

    isConnectedToServer(): boolean {
        return this.isConnected;
    }

    // Azure DevOps specific methods
    async getWorkItem(id: number): Promise<any> {
        return this.sendRequest('workitem.get', { id });
    }

    async getWorkItems(ids: number[]): Promise<any[]> {
        return this.sendRequest('workitem.getBatch', { ids });
    }

    async updateWorkItem(id: number, fields: Record<string, any>): Promise<any> {
        return this.sendRequest('workitem.update', { id, fields });
    }

    async createWorkItem(type: string, fields: Record<string, any>): Promise<any> {
        return this.sendRequest('workitem.create', { type, fields });
    }

    async getAssignedWorkItems(assignedTo: string): Promise<any[]> {
        return this.sendRequest('workitem.getAssigned', { assignedTo });
    }

    async linkWorkItemToPR(workItemId: number, prUrl: string): Promise<any> {
        return this.sendRequest('workitem.linkPR', { workItemId, prUrl });
    }

    async getPullRequests(repositoryId: string): Promise<any[]> {
        return this.sendRequest('pullrequest.getAll', { repositoryId });
    }

    async getPullRequest(repositoryId: string, pullRequestId: number): Promise<any> {
        return this.sendRequest('pullrequest.get', { repositoryId, pullRequestId });
    }

    async getCommits(repositoryId: string, branch?: string): Promise<any[]> {
        return this.sendRequest('git.getCommits', { repositoryId, branch });
    }
}
