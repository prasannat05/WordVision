class WordVisionPro {
    constructor() {
        this.cache = new Map();
        this.history = this.loadHistory();
        this.isLoading = false;
        this.currentAudio = null;
        
        // API configuration
        this.dictionaryAPI = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
        this.pexelsAPI = 'https://api.pexels.com/v1/search';
        this.pexelsKey = '648F15iJlbvHludU9A9311z2exJ2NOBFCwYPbR9uf91HLy7idBe1yqre';
        
        // Initialize the application
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupApp();
            });
        } else {
            this.setupApp();
        }
    }

    setupApp() {
        this.bindEvents();
        this.setupTheme();
        this.renderHistory();
        this.setupSuggestions();
        console.log('WordVision Pro initialized successfully');
    }

    bindEvents() {
        // Get elements
        const searchBtn = document.getElementById('searchBtn');
        const wordInput = document.getElementById('wordInput');
        const voiceBtn = document.getElementById('voiceBtn');
        const themeToggle = document.getElementById('themeToggle');
        const audioBtn = document.getElementById('audioBtn');

        // Check if elements exist
        if (!searchBtn || !wordInput || !voiceBtn || !themeToggle) {
            console.error('Required elements not found');
            return;
        }

        // Bind events
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSearch();
        });

        wordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleSearch();
            }
        });
        
        wordInput.addEventListener('input', this.debounce(() => {
            this.handleInputChange();
        }, 300));

        voiceBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.startVoiceRecognition();
        });

        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleTheme();
        });

        if (audioBtn) {
            audioBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.playAudio();
            });
        }

        console.log('Events bound successfully');
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('wordvision-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('wordvision-theme', newTheme);
        this.updateThemeIcon(newTheme);
        
        this.showToast(`Switched to ${newTheme} theme`, 'success', '🎨');
        
        // Add smooth transition effect
        document.body.style.transition = 'all 0.5s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 500);
    }

    updateThemeIcon(theme) {
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    setupSuggestions() {
        const suggestionChips = document.querySelectorAll('.suggestion-chip');
        suggestionChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                const word = chip.getAttribute('data-word');
                const wordInput = document.getElementById('wordInput');
                if (wordInput) {
                    wordInput.value = word;
                    this.searchWord(word);
                }
            });
        });
    }

    handleInputChange() {
        const input = document.getElementById('wordInput');
        const value = input?.value?.trim();
        
        if (value && value.length > 2) {
            this.addInputAnimation(input);
        }
    }

    addInputAnimation(input) {
        if (input) {
            input.style.transform = 'scale(1.01)';
            setTimeout(() => {
                input.style.transform = '';
            }, 200);
        }
    }

    async handleSearch() {
        const wordInput = document.getElementById('wordInput');
        const word = wordInput?.value?.trim()?.toLowerCase();
        
        console.log('Search triggered for word:', word);
        
        if (!word) {
            this.showToast('Please enter a word to search', 'error', '⚠️');
            return;
        }
        
        if (this.isLoading) {
            console.log('Search already in progress');
            return;
        }
        
        await this.searchWord(word);
    }

    async searchWord(word) {
        try {
            console.log('Searching for word:', word);
            this.isLoading = true;
            this.showLoading(true);
            this.hideResults();
            
            // Check cache first
            if (this.cache.has(word)) {
                console.log('Loading from cache');
                const cachedData = this.cache.get(word);
                this.displayResults(word, cachedData.definition, cachedData.imageUrl);
                this.showToast('Results loaded from cache', 'info', '⚡');
                return;
            }

            // Fetch dictionary data first
            console.log('Fetching definition...');
            const definitionData = await this.fetchDefinition(word);
            
            if (!definitionData) {
                this.showToast('Word not found. Please try another word.', 'error', '❌');
                return;
            }

            // Fetch image after successful definition fetch
            console.log('Fetching image...');
            const imageUrl = await this.fetchWordImage(word);

            // Cache the results
            this.cache.set(word, { definition: definitionData, imageUrl });
            
            this.displayResults(word, definitionData, imageUrl);
            this.addToHistory(word);
            this.showToast('Word found successfully!', 'success', '✅');
            
        } catch (error) {
            console.error('Search error:', error);
            this.showToast('An error occurred while searching', 'error', '⚠️');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    async fetchDefinition(word) {
        try {
            console.log('Fetching definition for:', word);
            const response = await fetch(`${this.dictionaryAPI}${encodeURIComponent(word)}`);
            
            if (!response.ok) {
                console.log('Dictionary API response not ok:', response.status);
                return null;
            }
            
            const data = await response.json();
            console.log('Definition data:', data);
            return data[0]; // Return the first entry
        } catch (error) {
            console.error('Dictionary API error:', error);
            return null;
        }
    }

    async fetchWordImage(word) {
        try {
            console.log('Fetching image for:', word);
            const response = await fetch(`${this.pexelsAPI}?query=${encodeURIComponent(word)}&per_page=1`, {
                headers: {
                    'Authorization': this.pexelsKey
                }
            });
            
            if (!response.ok) {
                console.log('Pexels API response not ok:', response.status);
                return null;
            }
            
            const data = await response.json();
            console.log('Image data:', data);
            return data.photos && data.photos.length > 0 ? data.photos[0].src.large : null;
        } catch (error) {
            console.error('Pexels API error:', error);
            return null;
        }
    }

    displayResults(word, definitionData, imageUrl) {
        console.log('Displaying results for:', word);
        
        const resultsSection = document.getElementById('resultsSection');
        const wordTitle = document.getElementById('wordTitle');
        const wordPhonetic = document.getElementById('wordPhonetic');
        const definitionsList = document.getElementById('definitionsList');
        const audioBtn = document.getElementById('audioBtn');
        const audioPlayer = document.getElementById('audioPlayer');
        const wordImage = document.getElementById('wordImage');
        const imagePlaceholder = document.getElementById('imagePlaceholder');

        if (!resultsSection || !wordTitle || !definitionsList) {
            console.error('Required result elements not found');
            return;
        }

        // Set word title
        wordTitle.textContent = word.charAt(0).toUpperCase() + word.slice(1);

        // Set phonetic
        const phoneticText = definitionData.phonetics?.find(p => p.text)?.text || '';
        if (wordPhonetic) {
            wordPhonetic.textContent = phoneticText;
        }

        // Set audio
        const audioUrl = definitionData.phonetics?.find(p => p.audio)?.audio;
        if (audioUrl && audioBtn && audioPlayer) {
            audioPlayer.src = audioUrl;
            audioBtn.style.display = 'flex';
        } else if (audioBtn) {
            audioBtn.style.display = 'none';
        }

        // Display definitions
        this.renderDefinitions(definitionData.meanings, definitionsList);

        // Display image
        this.displayImage(imageUrl, wordImage, imagePlaceholder);

        // Show results with animation
        this.showResults();
    }

    renderDefinitions(meanings, container) {
        if (!container || !meanings) return;
        
        container.innerHTML = '';
        console.log('Rendering definitions:', meanings);
        
        meanings.forEach((meaning, meaningIndex) => {
            if (meaning.definitions && meaning.definitions.length > 0) {
                meaning.definitions.slice(0, 3).forEach((definition, defIndex) => {
                    const definitionItem = document.createElement('div');
                    definitionItem.className = 'definition-item';
                    definitionItem.style.animationDelay = `${(meaningIndex * 3 + defIndex) * 0.1}s`;
                    
                    const definitionText = document.createElement('div');
                    definitionText.className = 'definition-text';
                    definitionText.textContent = definition.definition;
                    
                    definitionItem.appendChild(definitionText);
                    
                    if (definition.example) {
                        const exampleText = document.createElement('div');
                        exampleText.className = 'definition-example';
                        exampleText.textContent = definition.example;
                        definitionItem.appendChild(exampleText);
                    }
                    
                    container.appendChild(definitionItem);
                });
            }
        });
    }

    displayImage(imageUrl, imageElement, placeholderElement) {
        if (!imageElement || !placeholderElement) return;
        
        if (imageUrl) {
            console.log('Displaying image:', imageUrl);
            imageElement.src = imageUrl;
            imageElement.style.display = 'block';
            placeholderElement.style.display = 'none';
            
            imageElement.onload = () => {
                imageElement.style.opacity = '0';
                imageElement.style.transform = 'scale(0.9)';
                
                setTimeout(() => {
                    imageElement.style.transition = 'all 0.5s ease';
                    imageElement.style.opacity = '1';
                    imageElement.style.transform = 'scale(1)';
                }, 100);
            };
        } else {
            console.log('No image available');
            imageElement.style.display = 'none';
            placeholderElement.style.display = 'flex';
            placeholderElement.innerHTML = `
                <span class="placeholder-icon">🚫</span>
                <span class="placeholder-text">No image available</span>
            `;
        }
    }

    playAudio() {
        const audioPlayer = document.getElementById('audioPlayer');
        const audioBtn = document.getElementById('audioBtn');
        
        if (audioPlayer && audioPlayer.src) {
            // Add visual feedback
            if (audioBtn) {
                audioBtn.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    audioBtn.style.transform = '';
                }, 150);
            }
            
            audioPlayer.play().catch(error => {
                console.error('Audio playback error:', error);
                this.showToast('Could not play audio', 'error', '🔇');
            });
        }
    }

    startVoiceRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showToast('Voice recognition not supported in this browser', 'error', '🎤');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        const voiceBtn = document.getElementById('voiceBtn');
        const wordInput = document.getElementById('wordInput');

        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        // Visual feedback for recording
        if (voiceBtn) {
            voiceBtn.classList.add('recording');
            voiceBtn.innerHTML = `
                <span class="btn-icon">🔴</span>
                <span class="btn-text">Listening...</span>
            `;
        }

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.trim().toLowerCase();
            if (wordInput) {
                wordInput.value = transcript;
            }
            this.searchWord(transcript);
            this.showToast(`Heard: "${transcript}"`, 'success', '🎤');
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.showToast('Voice recognition failed', 'error', '🎤');
        };

        recognition.onend = () => {
            if (voiceBtn) {
                voiceBtn.classList.remove('recording');
                voiceBtn.innerHTML = `
                    <span class="btn-icon">🎤</span>
                    <span class="btn-text">Voice</span>
                `;
            }
        };

        try {
            recognition.start();
        } catch (error) {
            console.error('Voice recognition start error:', error);
            this.showToast('Could not start voice recognition', 'error', '🎤');
        }
    }

    showLoading(show) {
        const loadingContainer = document.getElementById('loadingContainer');
        if (loadingContainer) {
            loadingContainer.style.display = show ? 'block' : 'none';
        }
    }

    showResults() {
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            
            // Animate result items
            const definitionItems = document.querySelectorAll('.definition-item');
            definitionItems.forEach((item, index) => {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    item.style.transition = 'all 0.4s ease';
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 100);
            });
        }
    }

    hideResults() {
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
    }

    addToHistory(word) {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Remove existing entry if present
        this.history = this.history.filter(item => item.word !== word);
        
        // Add to beginning
        this.history.unshift({ word, time: timeString, timestamp: now.getTime() });
        
        // Keep only last 10 searches
        if (this.history.length > 10) {
            this.history = this.history.slice(0, 10);
        }
        
        this.saveHistory();
        this.renderHistory();
    }

    renderHistory() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;
        
        if (this.history.length === 0) {
            historyList.innerHTML = '<p class="history-empty">No recent searches</p>';
            return;
        }
        
        historyList.innerHTML = '';
        
        this.history.forEach((item, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.style.animationDelay = `${index * 0.05}s`;
            
            historyItem.innerHTML = `
                <span class="history-word">${item.word}</span>
                <span class="history-time">${item.time}</span>
            `;
            
            historyItem.addEventListener('click', () => {
                const wordInput = document.getElementById('wordInput');
                if (wordInput) {
                    wordInput.value = item.word;
                    this.searchWord(item.word);
                }
            });
            
            historyList.appendChild(historyItem);
        });
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('wordvision-history');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading history:', error);
            return [];
        }
    }

    saveHistory() {
        try {
            localStorage.setItem('wordvision-history', JSON.stringify(this.history));
        } catch (error) {
            console.error('Error saving history:', error);
        }
    }

    showToast(message, type = 'info', icon = 'ℹ️') {
        const toast = document.getElementById('toast');
        const toastIcon = document.getElementById('toastIcon');
        const toastMessage = document.getElementById('toastMessage');
        
        if (!toast || !toastIcon || !toastMessage) return;
        
        // Clear existing classes
        toast.className = 'toast';
        
        // Set content
        toastIcon.textContent = icon;
        toastMessage.textContent = message;
        
        // Add type class
        toast.classList.add(type);
        
        // Show toast
        toast.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize the application
let wordVisionApp;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing WordVision Pro...');
    wordVisionApp = new WordVisionPro();
});

// Fallback initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!wordVisionApp) {
            console.log('Fallback initialization...');
            wordVisionApp = new WordVisionPro();
        }
    });
} else {
    console.log('DOM already loaded, initializing immediately...');
    wordVisionApp = new WordVisionPro();
}

// Add keyboard shortcuts and global enhancements
document.addEventListener('keydown', (e) => {
    // Escape key to clear search
    if (e.key === 'Escape') {
        const wordInput = document.getElementById('wordInput');
        const resultsSection = document.getElementById('resultsSection');
        
        if (wordInput) {
            wordInput.value = '';
            wordInput.focus();
        }
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
    }
    
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const wordInput = document.getElementById('wordInput');
        if (wordInput) {
            wordInput.focus();
        }
    }
});