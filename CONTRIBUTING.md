# Contributing to Azure DevOps Work Item Manager

Thank you for your interest in contributing to this VS Code extension!

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Install VS Code extension dependencies: `npm install @types/vscode @types/node uuid ws`
4. Compile TypeScript: `npm run compile` or `tsc`

## Prerequisites

- Node.js 18+
- VS Code 1.74+
- Azure DevOps organization and project access
- Azure DevOps Personal Access Token
- MCP server running locally

## Project Structure

```
├── src/                    # TypeScript source files
│   ├── extension.ts       # Main extension entry point
│   ├── mcpClient.ts       # MCP server communication
│   ├── workItemManager.ts # Work item operations
│   ├── gitIntegration.ts  # Azure DevOps Git integration
│   ├── prMonitor.ts       # Pull request monitoring
│   ├── copilotIntegration.ts # GitHub Copilot commands
│   ├── webviewProvider.ts # UI panel provider
│   ├── config.ts          # Configuration management
│   └── types.ts           # TypeScript interfaces
├── media/                 # Webview assets (HTML, CSS, JS)
├── out/                   # Compiled JavaScript output
└── extension.json         # VS Code extension manifest
```

## Development Workflow

1. Make changes to TypeScript files in `src/`
2. Compile: `tsc`
3. Test in VS Code Extension Development Host
4. Submit pull request

## MCP Server Integration

This extension requires a Model Context Protocol (MCP) server that implements Azure DevOps API endpoints:

### Required MCP Methods
- `workitem.get`, `workitem.getBatch`, `workitem.update`, `workitem.create`
- `workitem.getAssigned`, `workitem.linkPR`
- `pullrequest.getAll`, `pullrequest.get`
- `git.getCommits`, `git.getBranches`, `git.createBranch`
- `git.getRepositories`, `git.linkCommit`

## Testing

1. Configure VS Code settings:
   ```json
   {
     "azuredevops.organization": "test-org",
     "azuredevops.project": "test-project",
     "azuredevops.mcpServerUrl": "ws://localhost:3000"
   }
   ```

2. Set environment variable: `export AZURE_DEVOPS_PAT="your-test-token"`

3. Start MCP server on localhost:3000

4. Run extension in debug mode (F5)

## Code Style

- Use TypeScript strict mode
- Follow existing naming conventions
- Add JSDoc comments for public methods
- Handle errors gracefully with user-friendly messages

## Pull Request Guidelines

- Include clear description of changes
- Test with actual Azure DevOps instance
- Update documentation if needed
- Ensure TypeScript compilation succeeds