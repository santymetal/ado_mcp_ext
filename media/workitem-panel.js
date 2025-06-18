(function() {
    const vscode = acquireVsCodeApi();
    
    // DOM elements
    const refreshBtn = document.getElementById('refreshBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const workItemsList = document.getElementById('workItemsList');
    const emptyState = document.getElementById('emptyState');
    
    // Event listeners
    refreshBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'refresh' });
        showLoading();
    });
    
    // Message handler
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.type) {
            case 'updateWorkItems':
                hideLoading();
                hideError();
                renderWorkItems(message.workItems);
                break;
            case 'error':
                hideLoading();
                showError(message.message);
                break;
        }
    });
    
    function showLoading() {
        loadingIndicator.classList.remove('hidden');
        workItemsList.classList.add('hidden');
        emptyState.classList.add('hidden');
        errorMessage.classList.add('hidden');
    }
    
    function hideLoading() {
        loadingIndicator.classList.add('hidden');
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        workItemsList.classList.add('hidden');
        emptyState.classList.add('hidden');
    }
    
    function hideError() {
        errorMessage.classList.add('hidden');
    }
    
    function renderWorkItems(workItems) {
        if (!workItems || workItems.length === 0) {
            workItemsList.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        workItemsList.classList.remove('hidden');
        
        workItemsList.innerHTML = workItems.map(workItem => createWorkItemElement(workItem)).join('');
        
        // Add event listeners for work item actions
        setupWorkItemEventListeners();
    }
    
    function createWorkItemElement(workItem) {
        const stateClass = `state-${workItem.state.toLowerCase()}`;
        const typeIcon = getWorkItemTypeIcon(workItem.type);
        const formattedDate = new Date(workItem.changedDate).toLocaleDateString();
        
        return `
            <div class="work-item" data-id="${workItem.id}">
                <div class="work-item-header">
                    <a href="#" class="work-item-id" data-action="open" data-id="${workItem.id}">
                        #${workItem.id}
                    </a>
                    <span class="work-item-state ${stateClass}">${workItem.state}</span>
                </div>
                
                <div class="work-item-title">${escapeHtml(workItem.title)}</div>
                
                <div class="work-item-meta">
                    <div class="work-item-type">
                        <span class="codicon ${typeIcon}"></span>
                        ${workItem.type}
                    </div>
                    <div class="work-item-date">
                        <span class="codicon codicon-calendar"></span>
                        ${formattedDate}
                    </div>
                </div>
                
                <div class="work-item-actions">
                    <select class="state-selector" data-action="updateState" data-id="${workItem.id}">
                        <option value="">Change State...</option>
                        <option value="New" ${workItem.state === 'New' ? 'selected' : ''}>New</option>
                        <option value="Active" ${workItem.state === 'Active' ? 'selected' : ''}>Active</option>
                        <option value="Resolved" ${workItem.state === 'Resolved' ? 'selected' : ''}>Resolved</option>
                        <option value="Closed" ${workItem.state === 'Closed' ? 'selected' : ''}>Closed</option>
                    </select>
                    
                    <button class="btn btn-secondary" data-action="createBranch" data-id="${workItem.id}" data-title="${escapeHtml(workItem.title)}">
                        <span class="codicon codicon-git-branch"></span>
                        Branch
                    </button>
                    
                    <button class="btn btn-secondary" data-action="open" data-id="${workItem.id}">
                        <span class="codicon codicon-external-link"></span>
                        Open
                    </button>
                </div>
            </div>
        `;
    }
    
    function setupWorkItemEventListeners() {
        // Handle work item actions
        workItemsList.addEventListener('click', (event) => {
            const action = event.target.getAttribute('data-action');
            const workItemId = event.target.getAttribute('data-id');
            
            if (!action || !workItemId) return;
            
            switch (action) {
                case 'open':
                    vscode.postMessage({
                        type: 'openWorkItem',
                        workItemId: workItemId
                    });
                    break;
                case 'createBranch':
                    const title = event.target.getAttribute('data-title');
                    vscode.postMessage({
                        type: 'createBranch',
                        workItemId: workItemId,
                        title: title
                    });
                    break;
            }
            
            event.preventDefault();
        });
        
        // Handle state selector changes
        workItemsList.addEventListener('change', (event) => {
            if (event.target.classList.contains('state-selector')) {
                const workItemId = event.target.getAttribute('data-id');
                const newState = event.target.value;
                
                if (newState) {
                    vscode.postMessage({
                        type: 'updateWorkItem',
                        workItemId: workItemId,
                        newState: newState
                    });
                    
                    // Reset selector
                    event.target.value = '';
                }
            }
        });
    }
    
    function getWorkItemTypeIcon(type) {
        switch (type.toLowerCase()) {
            case 'bug':
                return 'codicon-bug';
            case 'task':
                return 'codicon-checklist';
            case 'user story':
                return 'codicon-person';
            case 'feature':
                return 'codicon-star';
            default:
                return 'codicon-circle';
        }
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Initialize
    showLoading();
    vscode.postMessage({ type: 'refresh' });
})();
