# Extension API Reference

## Commands

### Azure DevOps: Assign Work Item
**Command ID**: `azuredevops.assignWorkItem`

Assigns a work item to the current user and sets it to Active state.

### Azure DevOps: Update Work Item
**Command ID**: `azuredevops.updateWorkItem`

Updates the state of an assigned work item (New, Active, Resolved, Closed).

### Azure DevOps: Create Work Item
**Command ID**: `azuredevops.createWorkItem`

Creates a new work item (Bug, Task, User Story, Feature) and assigns it to the current user.

### Azure DevOps: Link Pull Request
**Command ID**: `azuredevops.linkPR`

Links a pull request URL to a work item for tracking.

### Azure DevOps: Show Work Items Panel
**Command ID**: `azuredevops.showWorkItems`

Opens the work items panel in the Explorer view.

### Azure DevOps: Refresh Work Items
**Command ID**: `azuredevops.refreshWorkItems`

Refreshes the work items displayed in the panel.

## Configuration

### azuredevops.organization
- **Type**: string
- **Default**: ""
- **Description**: Azure DevOps organization name

### azuredevops.project
- **Type**: string
- **Default**: ""
- **Description**: Azure DevOps project name

### azuredevops.mcpServerUrl
- **Type**: string
- **Default**: "ws://localhost:3000"
- **Description**: MCP server WebSocket URL

### azuredevops.autoUpdateOnCommit
- **Type**: boolean
- **Default**: true
- **Description**: Automatically update work items when commits are made

### azuredevops.autoUpdateOnPR
- **Type**: boolean
- **Default**: true
- **Description**: Automatically update work items when PRs are created or merged

### azuredevops.enableReviewReminders
- **Type**: boolean
- **Default**: true
- **Description**: Enable review reminders for pull requests

### azuredevops.reviewReminderDays
- **Type**: number
- **Default**: 2
- **Description**: Number of days before sending review reminders

## Events

The extension listens for and responds to:

- Git repository state changes
- Commit events with work item references
- Pull request status changes
- Configuration updates
- WebSocket connection events

## Work Item Reference Formats

The extension recognizes these formats in commit messages:

- `#123` - Direct work item reference
- `AB#123` - Azure Boards work item reference
- `workitem: 123` - Explicit work item declaration
- `wi: 123` - Short work item declaration

## Error Handling

All operations include comprehensive error handling with user-friendly messages for:

- MCP server connection issues
- Azure DevOps authentication problems
- Work item access permissions
- Network connectivity problems
- Invalid work item references