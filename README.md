# Azure DevOps Work Item Manager - VS Code Extension

A comprehensive VS Code extension that integrates with Azure DevOps through an MCP server to provide seamless work item lifecycle management directly within your development environment.

## Features

### 🎯 Core Work Item Management
- **Assign Work Items**: Assign work items to yourself with GitHub Copilot integration
- **Update States**: Change work item states (New → Active → Resolved → Closed)
- **Create Work Items**: Create new bugs, tasks, user stories, and features
- **Link PRs**: Automatically link pull requests to work items

### 🤖 GitHub Copilot Integration
Use natural language commands with Copilot:
- `"list my work items"`
- `"assign work item #123"`
- `"update work item #456 to resolved"`
- `"create task titled 'Fix login bug'"`
- `"link PR https://dev.azure.com/... to work item #789"`

### 🔄 Automated Azure DevOps Workflow
- **ADO Commit Tracking**: Monitors Azure DevOps repositories and updates work items when commits reference them (#123, AB#123, workitem: 123)
- **ADO PR Monitoring**: Tracks Azure DevOps pull requests and automatically updates associated work items
- **State Transitions**: Moves work items through states based on ADO repository activity
- **Review Reminders**: Sends notifications for pending ADO pull request reviews

### 📊 Visual Interface
- **Work Items Panel**: Interactive webview showing assigned work items
- **Real-time Updates**: Live synchronization with Azure DevOps
- **Quick Actions**: One-click state changes, branch creation, and external links

## Architecture

The extension uses a modular architecture with clear separation of concerns:

- **MCP Client**: WebSocket communication with Azure DevOps MCP server
- **Work Item Manager**: Core business logic for CRUD operations
- **Git Integration**: Monitors repository changes and commit messages
- **PR Monitor**: Tracks pull request lifecycle and status changes
- **Copilot Integration**: Natural language command processing
- **Webview Provider**: Interactive UI components

## Configuration

Configure the extension through VS Code settings:

```json
{
  "azuredevops.organization": "your-org",
  "azuredevops.project": "your-project",
  "azuredevops.mcpServerUrl": "ws://localhost:3000",
  "azuredevops.autoUpdateOnCommit": true,
  "azuredevops.autoUpdateOnPR": true,
  "azuredevops.enableReviewReminders": true,
  "azuredevops.reviewReminderDays": 2
}
```

## Authentication

Set your Azure DevOps Personal Access Token as an environment variable:
```bash
export AZURE_DEVOPS_PAT="your-pat-token"
```

## Usage Workflow

1. **Setup**: Configure Azure DevOps organization, project, and MCP server URL
2. **Authentication**: Set your Azure DevOps Personal Access Token
3. **Work Assignment**: Use Copilot or commands to assign work items from Azure DevOps
4. **Development**: Work in your local VS Code, make commits that reference work items
5. **ADO Integration**: Extension automatically syncs commits and PRs with Azure DevOps
6. **Completion**: Work items resolve automatically when Azure DevOps PRs merge

## Commands

- `Azure DevOps: Assign Work Item` - Assign a work item to yourself
- `Azure DevOps: Update Work Item` - Change work item state
- `Azure DevOps: Create Work Item` - Create new work item
- `Azure DevOps: Link Pull Request` - Link PR to work item
- `Azure DevOps: Show Work Items Panel` - Open the work items view
- `Azure DevOps: Refresh Work Items` - Reload work items data

## MCP Server Requirements

This extension requires an Azure DevOps MCP server running on your local machine. The server handles all API communication with Azure DevOps REST APIs.

Expected MCP server methods:
- `workitem.get`, `workitem.getBatch`, `workitem.update`, `workitem.create`
- `workitem.getAssigned`, `workitem.linkPR`
- `pullrequest.getAll`, `pullrequest.get`
- `git.getCommits`

## Development

Built with:
- TypeScript 5.8+
- VS Code Extension API
- WebSocket communication
- Modern async/await patterns

Compiled output is available in the `out/` directory after running `tsc`.