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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpClient = void 0;
const vscode = __importStar(require("vscode"));
const ws_1 = __importDefault(require("ws"));
const uuid_1 = require("uuid");
class McpClient {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.ws = null;
        this.pendingRequests = new Map();
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new ws_1.default(this.serverUrl);
                this.ws.on('open', () => {
                    console.log('Connected to MCP server');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    resolve();
                });
                this.ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.handleMessage(message);
                    }
                    catch (error) {
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
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async attemptReconnect() {
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
    handleMessage(message) {
        if (message.id && this.pendingRequests.has(message.id)) {
            const { resolve, reject } = this.pendingRequests.get(message.id);
            this.pendingRequests.delete(message.id);
            if (message.error) {
                reject(new Error(message.error.message || 'MCP request failed'));
            }
            else {
                resolve(message.result);
            }
        }
    }
    async sendRequest(method, params) {
        if (!this.isConnected || !this.ws) {
            throw new Error('Not connected to MCP server');
        }
        const id = (0, uuid_1.v4)();
        const message = {
            id,
            method,
            params
        };
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            this.ws.send(JSON.stringify(message), (error) => {
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
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.pendingRequests.clear();
    }
    isConnectedToServer() {
        return this.isConnected;
    }
    // Azure DevOps specific methods
    async getWorkItem(id) {
        return this.sendRequest('workitem.get', { id });
    }
    async getWorkItems(ids) {
        return this.sendRequest('workitem.getBatch', { ids });
    }
    async updateWorkItem(id, fields) {
        return this.sendRequest('workitem.update', { id, fields });
    }
    async createWorkItem(type, fields) {
        return this.sendRequest('workitem.create', { type, fields });
    }
    async getAssignedWorkItems(assignedTo) {
        return this.sendRequest('workitem.getAssigned', { assignedTo });
    }
    async linkWorkItemToPR(workItemId, prUrl) {
        return this.sendRequest('workitem.linkPR', { workItemId, prUrl });
    }
    async getPullRequests(repositoryId) {
        return this.sendRequest('pullrequest.getAll', { repositoryId });
    }
    async getPullRequest(repositoryId, pullRequestId) {
        return this.sendRequest('pullrequest.get', { repositoryId, pullRequestId });
    }
    async getCommits(repositoryId, branch) {
        return this.sendRequest('git.getCommits', { repositoryId, branch });
    }
}
exports.McpClient = McpClient;
//# sourceMappingURL=mcpClient.js.map