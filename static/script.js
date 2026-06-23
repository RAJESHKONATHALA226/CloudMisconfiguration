// Global variables
let currentSamples = [];
let isProcessing = false;
let processingInterval = null;
let historyData = [];
let charts = {
    riskDistribution: null,
    timeline: null,
    provider: null
};
let stats = {
    total: 0,
    misconfigurations: 0,
    secure: 0
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    setupEventListeners();
    setDefaultTimestamp();
});

function initializeForm() {
    // Set default timestamp to current date/time
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('timestamp').value = now.toISOString().slice(0, 16);
}

function setDefaultTimestamp() {
    const timestampInput = document.getElementById('timestamp');
    if (!timestampInput.value) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        timestampInput.value = now.toISOString().slice(0, 16);
    }
}

function setupEventListeners() {
    // Form submission
    document.getElementById('predictionForm').addEventListener('submit', handleFormSubmit);
    
    // Control buttons
    document.getElementById('startBtn').addEventListener('click', startAutoAnalysis);
    document.getElementById('stopBtn').addEventListener('click', stopAutoAnalysis);
    document.getElementById('loadSampleBtn').addEventListener('click', loadSampleData);
    document.getElementById('clearBtn').addEventListener('click', clearForm);
    document.getElementById('randomBtn').addEventListener('click', loadRandomSample);
    document.getElementById('closeSampleBtn').addEventListener('click', closeSampleDisplay);
    
    // Initialize charts
    initializeCharts();
}

async function loadSampleData() {
    showLoading();
    try {
        const response = await fetch('/api/samples?num=10');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.samples && data.samples.length > 0) {
            currentSamples = data.samples;
            displaySampleOptions(data.samples);
            showNotification(`Loaded ${data.samples.length} samples from dataset`, 'success');
        } else {
            showNotification('No samples available in dataset', 'error');
        }
    } catch (error) {
        console.error('Error loading samples:', error);
        showNotification('Error loading samples: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function displaySampleOptions(samples) {
    const sampleDisplay = document.getElementById('sampleDisplay');
    const sampleContent = document.getElementById('sampleContent');
    
    // Create a selection interface
    let html = '<div class="sample-list">';
    html += '<p style="margin-bottom: 15px; font-weight: 600;">Select a sample to load:</p>';
    
    samples.forEach((sample, index) => {
        html += `<div class="sample-item" style="padding: 15px;" onmouseover="this.style.backgroundColor='var(--primary-color)'; cursor: pointer;" onmouseout="this.style.backgroundColor=''; cursor: pointer;" onclick="loadSampleIntoForm(${index})">
            <strong>${sample.id || 'Sample ' + (index + 1)}</strong><br>
            <span style="color: var(--text-secondary); font-size: 0.9rem;">${sample.description || 'No description'}</span><br>
            <span style="color: var(--primary-color); font-size: 0.85rem;">Provider: ${sample.cloud_provider || 'N/A'}</span>
        </div>`;
    });
    
    html += '</div>';
    sampleContent.innerHTML = html;
    sampleDisplay.style.display = 'block';
}

function loadSampleIntoForm(index) {
    const sample = currentSamples[index];
    
    // Populate form fields
    document.getElementById('description').value = sample.description || '';
    document.getElementById('cloud_provider').value = sample.cloud_provider || '';
    document.getElementById('vulnerable_code').value = sample.vulnerable_code || '';
    document.getElementById('poc').value = sample.poc || '';
    document.getElementById('source').value = sample.source || '';
    
    // Convert timestamp format
    if (sample.timestamp) {
        const timestamp = new Date(sample.timestamp);
        timestamp.setMinutes(timestamp.getMinutes() - timestamp.getTimezoneOffset());
        document.getElementById('timestamp').value = timestamp.toISOString().slice(0, 16);
    }
    
    // Close sample display
    closeSampleDisplay();
    
    // Show success message
    showNotification('Sample loaded successfully!', 'success');
}

function loadRandomSample() {
    if (currentSamples.length === 0) {
        loadSampleData().then(() => {
            if (currentSamples.length > 0) {
                const randomIndex = Math.floor(Math.random() * currentSamples.length);
                loadSampleIntoForm(randomIndex);
            }
        });
    } else {
        const randomIndex = Math.floor(Math.random() * currentSamples.length);
        loadSampleIntoForm(randomIndex);
    }
}

function closeSampleDisplay() {
    document.getElementById('sampleDisplay').style.display = 'none';
}

function clearForm() {
    document.getElementById('predictionForm').reset();
    setDefaultTimestamp();
    document.getElementById('resultsSection').style.display = 'none';
    showNotification('Form cleared', 'info');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Collect form data
    const formData = {
        description: document.getElementById('description').value,
        cloud_provider: document.getElementById('cloud_provider').value,
        vulnerable_code: document.getElementById('vulnerable_code').value,
        poc: document.getElementById('poc').value,
        source: document.getElementById('source').value,
        timestamp: document.getElementById('timestamp').value
    };
    
    // Validate required fields
    if (!formData.description || !formData.description.trim()) {
        showNotification('Please enter a description', 'error');
        document.getElementById('description').focus();
        return;
    }
    
    if (!formData.cloud_provider || !formData.cloud_provider.trim()) {
        showNotification('Please select a cloud provider', 'error');
        document.getElementById('cloud_provider').focus();
        return;
    }
    
    // Convert timestamp to ISO format
    if (formData.timestamp) {
        const date = new Date(formData.timestamp);
        formData.timestamp = date.toISOString();
    }
    
    showLoading();
    
    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            displayResults(result);
        } else {
            showNotification('Prediction error: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error making prediction:', error);
        showNotification('Error: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function displayResults(result, sampleData = null) {
    const resultsSection = document.getElementById('resultsSection');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    const statusMessage = document.getElementById('statusMessage');
    const riskValue = document.getElementById('riskValue');
    const riskBar = document.getElementById('riskBar');
    const predictionClass = document.getElementById('predictionClass');
    const confidence = document.getElementById('confidence');
    
    // Update status - Check prediction value and probabilities
    // According to the model: prediction == 1 means misconfiguration, prediction == 0 means secure
    // Use probability threshold for more accuracy - check if misconfiguration probability is high enough
    const isMisconfiguration = result.prediction === 1;
    
    // Get misconfiguration probability (class 1 probability)
    // Note: probabilities array contains percentages (0-100), not decimals
    let misconfigProb = 0;
    if (result.probabilities && result.probabilities.length > 1) {
        misconfigProb = result.probabilities[1]; // Probability of class 1 (misconfiguration) as percentage
    } else if (result.prediction === 1) {
        misconfigProb = result.risk_score; // Use risk_score as proxy
    }
    
    // Only flag as misconfiguration if:
    // 1. Prediction is 1 AND
    // 2. Misconfiguration probability is high enough (> 60%) to avoid false positives
    // This helps filter out cases where the model predicts 1 but with low confidence
    const highProbThreshold = 60; // Require 60% confidence to flag as misconfiguration
    const isHighRiskMisconfig = isMisconfiguration && misconfigProb > highProbThreshold;
    
    if (isHighRiskMisconfig) {
        statusIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        statusIcon.style.animation = 'pulse 1s infinite';
        statusIcon.style.color = 'var(--danger-color)';
        
        // Play alert sound for misconfiguration
        playAlertSound();
    } else {
        statusIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
        statusIcon.style.animation = 'pulse 2s infinite';
        statusIcon.style.color = 'var(--success-color)';
    }
    
    statusText.textContent = result.status;
    statusMessage.textContent = result.message;
    
    // Update risk score
    riskValue.textContent = result.risk_score + '%';
    riskBar.style.width = result.risk_score + '%';
    
    // Add color class based on risk
    riskValue.className = 'risk-value';
    if (result.risk_score < 30) {
        riskValue.classList.add('risk-low');
    } else if (result.risk_score < 70) {
        riskValue.classList.add('risk-medium');
    } else {
        riskValue.classList.add('risk-high');
    }
    
    // Update details - show prediction and probability info
    predictionClass.textContent = result.prediction === 1 ? 'Misconfiguration (1)' : 'Secure (0)';
    if (result.probabilities && result.probabilities.length > 1) {
        const secureProb = result.probabilities[0] || 0;
        const misconfigProb = result.probabilities[1] || 0;
        confidence.textContent = `Secure: ${secureProb.toFixed(1)}% | Misconfig: ${misconfigProb.toFixed(1)}%`;
    } else {
        confidence.textContent = result.risk_score + '%';
    }
    
    // Show results section
    resultsSection.style.display = 'block';
    
    // Add to history if sample data provided
    if (sampleData) {
        addToHistory(sampleData, result);
    }
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Add icon based on type
    let icon = '';
    if (type === 'success') {
        icon = '<i class="fas fa-check-circle"></i>';
    } else if (type === 'error') {
        icon = '<i class="fas fa-exclamation-circle"></i>';
    } else {
        icon = '<i class="fas fa-info-circle"></i>';
    }
    
    notification.innerHTML = `${icon} ${message}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Auto-analysis functions
async function startAutoAnalysis() {
    if (isProcessing) return;
    
    isProcessing = true;
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'inline-flex';
    
    // Show history and graphs sections
    document.getElementById('historySection').style.display = 'block';
    document.getElementById('graphsSection').style.display = 'block';
    
    // Reset stats
    stats = { total: 0, misconfigurations: 0, secure: 0 };
    historyData = [];
    updateStats();
    
    showNotification('Auto-analysis started!', 'success');
    
    // Load samples and start processing
    try {
        const response = await fetch('/api/samples?num=100');
        if (!response.ok) throw new Error('Failed to load samples');
        
        const data = await response.json();
        if (data.samples && data.samples.length > 0) {
            currentSamples = data.samples;
            processNextSample();
        } else {
            showNotification('No samples available', 'error');
            stopAutoAnalysis();
        }
    } catch (error) {
        console.error('Error starting auto-analysis:', error);
        showNotification('Error: ' + error.message, 'error');
        stopAutoAnalysis();
    }
}

function stopAutoAnalysis() {
    isProcessing = false;
    document.getElementById('startBtn').style.display = 'inline-flex';
    document.getElementById('stopBtn').style.display = 'none';
    
    if (processingInterval) {
        clearTimeout(processingInterval);
        processingInterval = null;
    }
    
    showNotification('Auto-analysis stopped', 'info');
}

async function processNextSample() {
    if (!isProcessing || currentSamples.length === 0) {
        stopAutoAnalysis();
        return;
    }
    
    // Get next sample
    const sample = currentSamples.shift();
    
    // Prepare data for prediction
    const formData = {
        description: sample.description || '',
        cloud_provider: sample.cloud_provider || '',
        vulnerable_code: sample.vulnerable_code || '',
        poc: sample.poc || '',
        source: sample.source || '',
        timestamp: sample.timestamp || new Date().toISOString()
    };
    
    // Convert timestamp to ISO format
    if (formData.timestamp) {
        const date = new Date(formData.timestamp);
        formData.timestamp = date.toISOString();
    }
    
    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Debug logging - log every 10th item to avoid spam
            if (stats.total % 10 === 0 || result.prediction === 1) {
                console.log(`[Sample ${stats.total + 1}] Prediction result:`, {
                    prediction: result.prediction,
                    risk_score: result.risk_score,
                    probabilities: result.probabilities,
                    status: result.status,
                    sample_id: sample.id || 'N/A',
                    provider: sample.cloud_provider || 'N/A'
                });
            }
            
            displayResults(result, { ...sample, ...result });
        }
    } catch (error) {
        console.error('Error processing sample:', error);
    }
    
    // Process next sample after a short delay
    if (isProcessing) {
        processingInterval = setTimeout(() => {
            processNextSample();
        }, 500); // 500ms delay between samples
    }
}

// History functions
function addToHistory(sampleData, result) {
    const historyItem = {
        id: sampleData.id || historyData.length + 1,
        timestamp: new Date().toLocaleTimeString(),
        description: sampleData.description || 'N/A',
        cloud_provider: sampleData.cloud_provider || 'N/A',
        prediction: result.prediction,
        risk_score: result.risk_score,
        probabilities: result.probabilities || [],
        status: result.status
    };
    
    historyData.unshift(historyItem); // Add to beginning
    if (historyData.length > 100) {
        historyData.pop(); // Keep only last 100 items
    }
    
    // Update stats - Use same logic as displayResults
    stats.total++;
    const isMisconfiguration = result.prediction === 1;
    
    // Get misconfiguration probability (already in percentage format)
    let misconfigProb = 0;
    if (result.probabilities && result.probabilities.length > 1) {
        misconfigProb = result.probabilities[1]; // Already a percentage
    } else if (result.prediction === 1) {
        misconfigProb = result.risk_score;
    }
    
    const highProbThreshold = 60; // Require 60% confidence
    const isHighRiskMisconfig = isMisconfiguration && misconfigProb > highProbThreshold;
    
    if (isHighRiskMisconfig) {
        stats.misconfigurations++;
    } else {
        stats.secure++;
    }
    
    updateHistoryDisplay();
    updateStats();
    updateCharts();
}

function updateHistoryDisplay() {
    const historyContent = document.getElementById('historyContent');
    let html = '<div class="history-list">';
    
    historyData.slice(0, 20).forEach((item, index) => {
        // Use same logic: prediction == 1 and high probability (> 60%)
        // Check if we have probability data, otherwise use risk_score as fallback
        const itemProb = item.probabilities && item.probabilities.length > 1 ? item.probabilities[1] : item.risk_score;
        const isMisconfig = item.prediction === 1 && itemProb > 60;
        const statusClass = isMisconfig ? 'misconfig' : 'secure';
        const statusIcon = isMisconfig ? 'fa-exclamation-triangle' : 'fa-check-circle';
        
        html += `
            <div class="history-item ${statusClass}">
                <div class="history-item-header">
                    <span class="history-time">${item.timestamp}</span>
                    <span class="history-status"><i class="fas ${statusIcon}"></i> ${item.status}</span>
                </div>
                <div class="history-item-body">
                    <div class="history-description">${item.description.substring(0, 100)}${item.description.length > 100 ? '...' : ''}</div>
                    <div class="history-details">
                        <span><i class="fas fa-cloud"></i> ${item.cloud_provider}</span>
                        <span><i class="fas fa-chart-line"></i> Risk: ${item.risk_score}%</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    historyContent.innerHTML = html;
}

function updateStats() {
    document.getElementById('totalProcessed').textContent = `Total: ${stats.total}`;
    document.getElementById('misconfigFound').textContent = `Misconfigurations: ${stats.misconfigurations}`;
    document.getElementById('secureFound').textContent = `Secure: ${stats.secure}`;
}

// Chart functions
function initializeCharts() {
    // Risk Distribution Chart
    const riskCtx = document.getElementById('riskDistributionChart').getContext('2d');
    charts.riskDistribution = new Chart(riskCtx, {
        type: 'doughnut',
        data: {
            labels: ['Secure', 'Misconfiguration'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        font: { family: 'Poppins' }
                    }
                },
                title: {
                    display: true,
                    text: 'Risk Distribution',
                    color: '#ffffff',
                    font: { family: 'Poppins', size: 16 }
                }
            }
        }
    });
    
    // Timeline Chart
    const timelineCtx = document.getElementById('timelineChart').getContext('2d');
    charts.timeline = new Chart(timelineCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Risk Score',
                data: [],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff',
                        font: { family: 'Poppins' }
                    }
                },
                title: {
                    display: true,
                    text: 'Risk Score Timeline',
                    color: '#ffffff',
                    font: { family: 'Poppins', size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
    
    // Provider Chart
    const providerCtx = document.getElementById('providerChart').getContext('2d');
    charts.provider = new Chart(providerCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Misconfigurations',
                data: [],
                backgroundColor: '#ef4444',
                borderColor: '#dc2626',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff',
                        font: { family: 'Poppins' }
                    }
                },
                title: {
                    display: true,
                    text: 'Misconfigurations by Provider',
                    color: '#ffffff',
                    font: { family: 'Poppins', size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

function updateCharts() {
    // Update Risk Distribution
    charts.riskDistribution.data.datasets[0].data = [stats.secure, stats.misconfigurations];
    charts.riskDistribution.update('none');
    
    // Update Timeline (last 20 items)
    const recentItems = historyData.slice(0, 20).reverse();
    charts.timeline.data.labels = recentItems.map((_, i) => `#${i + 1}`);
    charts.timeline.data.datasets[0].data = recentItems.map(item => item.risk_score);
    charts.timeline.update('none');
    
    // Update Provider Chart - count only high-confidence misconfigurations
    const providerCounts = {};
    historyData.forEach(item => {
        const itemProb = item.probabilities && item.probabilities.length > 1 ? item.probabilities[1] : item.risk_score;
        const isMisconfig = item.prediction === 1 && itemProb > 60;
        if (isMisconfig) {
            providerCounts[item.cloud_provider] = (providerCounts[item.cloud_provider] || 0) + 1;
        }
    });
    
    const providers = Object.keys(providerCounts);
    const counts = Object.values(providerCounts);
    
    charts.provider.data.labels = providers;
    charts.provider.data.datasets[0].data = counts;
    charts.provider.update('none');
}

// Sound notification
function playAlertSound() {
    try {
        // Use Web Audio API to generate a beep sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800; // Frequency in Hz
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
        // Also try HTML5 audio as fallback
        const audio = document.getElementById('alertSound');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {
                // Ignore errors, Web Audio API is primary
            });
        }
    } catch (err) {
        console.log('Could not play alert sound:', err);
    }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);