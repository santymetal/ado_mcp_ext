# Azure DevOps Work Item Manager VS Code Extension

## Overview

This project is a VS Code extension that integrates Azure DevOps work item management directly into the development workflow. The extension provides seamless work item tracking, Git integration, pull request monitoring, and GitHub Copilot integration through a Model Context Protocol (MCP) server architecture.

## System Architecture

The extension follows a modular architecture with clear separation of concerns:

- **Frontend**: VS Code extension with webview-based UI panels
- **Backend Integration**: MCP (Model Context Protocol) server for Azure DevOps API communication
- **Real-time Communication**: WebSocket connections for live updates
- **Git Integration**: Direct integration with VS Code's Git extension API
- **AI Integration**: GitHub Copilot slash commands for natural language work item management

## Key Components

### Core Modules

1. **Extension Entry Point** (`extension.ts`)
   - Main activation logic and dependency injection
   - Command registration and lifecycle management
   - Coordinates all subsystems

2. **MCP Client** (`mcpClient.ts`)
   - WebSocket-based communication with MCP server
   - Request/response handling with UUID tracking
   - Automatic reconnection logic with exponential backoff

3. **Work Item Manager** (`workItemManager.ts`)
   - Primary business logic for work item operations
   - CRUD operations for work items
   - User assignment and state management

4. **Git Integration** (`gitIntegration.ts`)
   - Monitors Git repository state changes
   - Automatic work item linking from commit messages
   - Branch creation from work items

5. **Pull Request Monitor** (`prMonitor.ts`)
   - Periodic scanning of pull requests
   - Work item association tracking
   - Status change notifications

6. **Copilot Integration** (`copilotIntegration.ts`)
   - Natural language command processing
   - Slash command registration
   - Context-aware work item operations

7. **Webview Provider** (`webviewProvider.ts`)
   - HTML/CSS/JS based UI components
   - Real-time work item list updates
   - Interactive work item management

### Configuration System

The `Config` class manages:
- Azure DevOps organization and project settings
- MCP server connection parameters
- Personal Access Token (PAT) management through environment variables
- Validation and user guidance for missing configuration

### Type System

TypeScript interfaces in `types.ts` define:
- Work item data structures with state enums
- Pull request and commit interfaces
- MCP server configuration schemas
- Notification preference settings

## Data Flow

1. **Initialization**: Extension activates → Config validation → MCP connection → Component initialization
2. **Work Item Retrieval**: WebView requests → MCP Client → Azure DevOps API → UI update
3. **Git Integration**: Commit detected → Work item ID extraction → Automatic updates
4. **PR Monitoring**: Periodic scans → Status changes → Notification system
5. **Copilot Commands**: Natural language input → Command parsing → Work item operations

## External Dependencies

### Core Dependencies
- **@types/vscode**: VS Code extension API type definitions
- **ws**: WebSocket client for MCP server communication
- **uuid**: Request ID generation for message correlation
- **typescript**: TypeScript compilation and type checking

### VS Code Extensions
- **vscode.git**: Git repository integration and event monitoring

### Azure DevOps Integration
- MCP server handles all Azure DevOps REST API communication
- Personal Access Token authentication
- Organization and project scoping

## Deployment Strategy

### Development Environment
- Node.js 20 runtime via Nix package manager
- TypeScript compilation with source maps
- Live reloading during development

### Build Process
1. npm install for dependency resolution
2. TypeScript compilation to `out/` directory
3. Extension packaging with .vscodeignore filtering
4. Source files excluded from final package

### Extension Distribution
- Standard VS Code extension format (.vsix)
- Webview assets bundled in `media/` directory
- Configuration schema embedded in package.json

## Changelog

- June 18, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.