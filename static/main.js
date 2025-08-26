/**
 * NeuroScan AI - Medical Imaging Upload Interface
 * CONNECTED TO FLASK BACKEND
 */

class MedicalImageUploader {
    constructor() {
        this.currentFile = null;
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.allowedFormats = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff']; // Simplified for preview
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        this.filePreview = document.getElementById('filePreview');
        this.removeFileBtn = document.getElementById('removeFile');
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.resultsCard = document.getElementById('resultsCard');
        this.resultsContent = document.getElementById('resultsContent');
        this.alertContainer = document.getElementById('alertContainer');
    }

    bindEvents() {
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));
        this.removeFileBtn.addEventListener('click', () => this.removeFile());
        this.analyzeBtn.addEventListener('click', () => this.analyzeFile());
    }

    handleDragOver(e) { e.preventDefault(); this.uploadArea.classList.add('drag-over'); }
    handleDragLeave(e) { e.preventDefault(); this.uploadArea.classList.remove('drag-over'); }

    handleFileDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) this.processFile(files[0]);
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) this.processFile(files[0]);
    }

    processFile(file) {
        const validation = this.validateFile(file);
        if (!validation.valid) {
            this.showAlert(validation.message, 'error');
            return;
        }
        this.currentFile = file;
        this.displayFileInfo(file);
        this.createFilePreview(file);
        this.enableAnalyzeButton();
        this.hideResults();
    }

    validateFile(file) {
        if (file.size > this.maxFileSize) return { valid: false, message: `File size exceeds 50MB limit.` };
        return { valid: true };
    }

    displayFileInfo(file) {
        this.fileName.textContent = file.name;
        this.fileSize.textContent = this.formatFileSize(file.size);
        this.fileInfo.style.display = 'block';
    }

    createFilePreview(file) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                this.filePreview.innerHTML = '';
                this.filePreview.appendChild(img);
            };
            reader.readAsDataURL(file);
        } else {
            this.filePreview.innerHTML = `<div class="non-image-preview"><i class="fas fa-file-medical"></i><p>${file.name}</p></div>`;
        }
    }

    enableAnalyzeButton() { this.analyzeBtn.disabled = false; }

    removeFile() {
        this.currentFile = null;
        this.fileInput.value = '';
        this.fileInfo.style.display = 'none';
        this.analyzeBtn.disabled = true;
        this.hideProgress();
        this.hideResults();
        this.filePreview.innerHTML = '';
    }

    async analyzeFile() {
        if (!this.currentFile) {
            this.showAlert('No file selected for analysis', 'error');
            return;
        }

        try {
            this.showProgress();
            this.analyzeBtn.disabled = true;

            const formData = new FormData();
            formData.append('file', this.currentFile);

            this.updateProgress(30, 'Uploading to secure server...');
            
            const response = await fetch('/predict', { method: 'POST', body: formData });

            this.updateProgress(80, 'AI model is analyzing the scan...');

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server error during analysis.');
            }

            const data = await response.json(); // e.g., { prediction: 'Meningioma' }
            
            this.updateProgress(100, 'Analysis complete!');
            await this.delay(500);
            this.hideProgress();

            this.showResults(data.prediction);
            this.showAlert('Analysis completed successfully!', 'success');

        } catch (error) {
            this.hideProgress();
            console.error('Analysis error:', error);
            this.showAlert(`Analysis failed: ${error.message}`, 'error');
        } finally {
            this.analyzeBtn.disabled = false;
        }
    }

    showProgress() { this.progressContainer.style.display = 'block'; }
    updateProgress(percentage, text) {
        this.progressFill.style.width = `${percentage}%`;
        this.progressText.textContent = text;
    }
    hideProgress() { this.progressContainer.style.display = 'none'; }

    showResults(prediction) {
        const isTumor = prediction.toLowerCase() !== 'notumor';
        const resultClass = isTumor ? 'tumor' : 'notumor';
        const resultIcon = isTumor ? 'fa-exclamation-triangle' : 'fa-check-circle';
        const resultColor = isTumor ? 'var(--warning)' : 'var(--success)';

        this.resultsContent.innerHTML = `
            <div class="result-details ${resultClass}">
                <i class="fas ${resultIcon}" style="font-size: 3rem; color: ${resultColor}; margin-bottom: 1rem;"></i>
                <h4 style="color: var(--text-primary); margin-bottom: 0.5rem;">Analysis Complete</h4>
                <p style="color: var(--text-secondary); font-size: 1.1rem; margin-bottom: 1.5rem;">The AI model's analysis suggests:</p>
                <div style="background: rgba(0,0,0,0.2); padding: 1rem 1.5rem; border-radius: 8px; display: inline-block;">
                    <p style="font-size: 1.75rem; font-weight: 600; color: ${resultColor}; margin: 0; text-transform: capitalize;">${prediction}</p>
                </div>
            </div>
        `;
        this.resultsCard.style.display = 'block';
    }

    hideResults() { this.resultsCard.style.display = 'none'; }

    showAlert(message, type = 'success') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        this.alertContainer.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 5000);
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

document.addEventListener('DOMContentLoaded', () => { new MedicalImageUploader(); });