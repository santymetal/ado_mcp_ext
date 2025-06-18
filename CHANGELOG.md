# Changelog

All notable changes to the Azure DevOps Work Item Manager extension will be documented in this file.

## [1.0.0] - 2025-06-18

### Added
- Initial release of Azure DevOps Work Item Manager VS Code extension
- MCP (Model Context Protocol) server integration for Azure DevOps API communication
- GitHub Copilot integration with natural language work item commands
- Automated work item lifecycle management (assign → active → resolved → closed)
- Real-time work item tracking through interactive VS Code panel
- Azure DevOps Git integration for commit and pull request monitoring
- Automatic work item updates when commits reference work items (#123, AB#123, workitem: 123)
- Pull request monitoring with automatic state transitions on merge
- Review reminder notifications for pending pull requests
- Branch creation directly from work items
- WebSocket-based real-time communication with MCP server
- Configuration management for Azure DevOps organization and project settings
- Personal Access Token authentication support

### Features
- **Work Item Management**: Create, assign, update, and track work items
- **Copilot Commands**: Natural language work item operations
- **Git Integration**: Automatic linking of commits and PRs to work items
- **State Automation**: Smart work item state transitions based on development activity
- **Visual Interface**: Interactive webview panel with real-time updates
- **Notification System**: Review reminders and status change notifications

### Technical Details
- TypeScript 5.8+ implementation
- VS Code Extension API integration
- WebSocket communication for MCP server connectivity
- Modular architecture with clear separation of concerns
- Comprehensive error handling and user feedback
- Source maps and debugging support

### Requirements
- VS Code 1.74+
- Azure DevOps organization access
- Azure DevOps Personal Access Token
- MCP server running locally (default: ws://localhost:3000)

### Configuration
- `azuredevops.organization`: Azure DevOps organization name
- `azuredevops.project`: Azure DevOps project name
- `azuredevops.mcpServerUrl`: MCP server WebSocket URL
- `azuredevops.autoUpdateOnCommit`: Enable automatic work item updates on commit
- `azuredevops.autoUpdateOnPR`: Enable automatic work item updates on PR events
- `azuredevops.enableReviewReminders`: Enable pull request review reminders
- `azuredevops.reviewReminderDays`: Days before sending review reminders