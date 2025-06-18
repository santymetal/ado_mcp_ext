# Setup Guide

## Prerequisites

1. **VS Code 1.74+**
2. **Azure DevOps Access**
   - Organization and project access
   - Personal Access Token (PAT) with work item read/write permissions
3. **MCP Server**
   - Running locally on your machine
   - Implements Azure DevOps API endpoints

## Installation Steps

### 1. Install the Extension

```bash
# Clone the repository
git clone https://github.com/your-username/azure-devops-workitem-manager.git
cd azure-devops-workitem-manager

# Install dependencies
npm install

# Compile TypeScript
npm run compile
```

### 2. Configure VS Code Settings

Open VS Code settings and add:

```json
{
  "azuredevops.organization": "your-organization-name",
  "azuredevops.project": "your-project-name",
  "azuredevops.mcpServerUrl": "ws://localhost:3000"
}
```

### 3. Set Authentication

Set your Azure DevOps Personal Access Token:

```bash
export AZURE_DEVOPS_PAT="your-personal-access-token"
```

### 4. Start MCP Server

Ensure your MCP server is running on localhost:3000 and implements these endpoints:

- `workitem.get`, `workitem.getBatch`, `workitem.update`, `workitem.create`
- `workitem.getAssigned`, `workitem.linkPR`
- `pullrequest.getAll`, `pullrequest.get`
- `git.getCommits`, `git.getBranches`, `git.createBranch`
- `git.getRepositories`, `git.linkCommit`

### 5. Load Extension

1. Open VS Code
2. Press F5 to open Extension Development Host
3. The extension will activate automatically

## Usage

### GitHub Copilot Commands

- "list my work items"
- "assign work item #123"
- "update work item #456 to resolved"
- "create task titled 'Fix login bug'"

### Manual Commands

- `Ctrl+Shift+P` → "Azure DevOps: Assign Work Item"
- View work items in the Explorer panel
- Use quick actions in the work items panel

### Automatic Features

- Commits with #123 automatically update work items
- Pull requests link to work items when created
- Work items resolve when PRs merge
- Review reminders after configurable days

## Troubleshooting

### Extension Not Loading
- Check VS Code version (1.74+ required)
- Verify TypeScript compilation succeeded
- Check output console for errors

### MCP Connection Issues
- Verify MCP server is running on configured port
- Check WebSocket connection in VS Code output
- Validate MCP server implements required endpoints

### Authentication Problems
- Verify AZURE_DEVOPS_PAT environment variable is set
- Check PAT has work item read/write permissions
- Ensure organization and project names are correct

### Work Items Not Updating
- Verify MCP server has proper Azure DevOps API access
- Check commit message format includes work item references
- Review VS Code output for error messages