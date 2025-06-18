# MCP Server Integration Guide

## Overview

This extension communicates with Azure DevOps through a Model Context Protocol (MCP) server running on your local machine. The MCP server acts as a bridge between the VS Code extension and Azure DevOps REST APIs.

## Required MCP Methods

Your MCP server must implement these methods for full functionality:

### Work Item Operations
```typescript
// Get single work item
workitem.get(params: { id: number }) => WorkItem

// Get multiple work items
workitem.getBatch(params: { ids: number[] }) => WorkItem[]

// Update work item fields
workitem.update(params: { id: number, fields: Record<string, any> }) => WorkItem

// Create new work item
workitem.create(params: { type: string, fields: Record<string, any> }) => WorkItem

// Get work items assigned to user
workitem.getAssigned(params: { assignedTo: string }) => WorkItem[]

// Link work item to pull request
workitem.linkPR(params: { workItemId: number, prUrl: string }) => any
```

### Pull Request Operations
```typescript
// Get all pull requests for repository
pullrequest.getAll(params: { repositoryId: string }) => PullRequest[]

// Get specific pull request
pullrequest.get(params: { repositoryId: string, pullRequestId: number }) => PullRequest
```

### Git Operations
```typescript
// Get commits for repository/branch
git.getCommits(params: { repositoryId: string, branch?: string }) => Commit[]

// Get branches for repository
git.getBranches(params: { repositoryId: string }) => Branch[]

// Create new branch
git.createBranch(params: { repositoryId: string, branchName: string, sourceBranch: string }) => Branch

// Get all repositories
git.getRepositories(params: {}) => Repository[]

// Link commit to work item
git.linkCommit(params: { commitId: string, workItemId: number }) => any
```

## Message Format

All communication uses JSON-RPC 2.0 format over WebSocket:

### Request
```json
{
  "id": "unique-request-id",
  "method": "workitem.get",
  "params": {
    "id": 123
  }
}
```

### Response
```json
{
  "id": "unique-request-id",
  "result": {
    "id": 123,
    "fields": {
      "System.Title": "Fix login bug",
      "System.State": "Active",
      "System.AssignedTo": "user@company.com"
    }
  }
}
```

### Error Response
```json
{
  "id": "unique-request-id",
  "error": {
    "code": -32000,
    "message": "Work item not found"
  }
}
```

## Authentication

The MCP server should authenticate with Azure DevOps using:
- Personal Access Token from environment variable `AZURE_DEVOPS_PAT`
- Organization and project from extension configuration
- Proper API permissions for work items, git, and pull requests

## Expected Data Structures

### WorkItem
```typescript
interface WorkItem {
  id: number;
  fields: {
    'System.Title': string;
    'System.Description': string;
    'System.State': 'New' | 'Active' | 'Resolved' | 'Closed';
    'System.AssignedTo': string;
    'System.WorkItemType': string;
    'System.CreatedDate': string;
    'System.ChangedDate': string;
  };
  _links: {
    html: { href: string };
  };
}
```

### PullRequest
```typescript
interface PullRequest {
  pullRequestId: number;
  title: string;
  status: 'active' | 'completed' | 'abandoned';
  sourceRefName: string;
  targetRefName: string;
  createdBy: { displayName: string };
  creationDate: string;
  _links: {
    web: { href: string };
  };
}
```

### Commit
```typescript
interface Commit {
  commitId: string;
  comment: string;
  author: { name: string, email: string };
  committer: { name: string, email: string };
  commitDate: string;
}
```

## Connection Handling

The extension handles:
- Automatic reconnection with exponential backoff
- Request timeout (30 seconds)
- Connection status monitoring
- Error handling and user notifications

## Testing Your MCP Server

Use these test scenarios to verify your implementation:

1. **Work Item Retrieval**: `workitem.getAssigned` should return user's assigned items
2. **Work Item Updates**: `workitem.update` should modify Azure DevOps work items
3. **Pull Request Monitoring**: `pullrequest.getAll` should return active PRs
4. **Git Operations**: `git.getRepositories` should return project repositories
5. **Error Handling**: Invalid requests should return proper error responses