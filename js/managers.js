/* Page Manager - Handles page navigation and state */

class PageManager {
    constructor() {
        this.currentPage = 'home';
        this.pages = {};
        this.init();
    }

    /**
     * Initialize page manager
     */
    init() {
        // Get all pages
        document.querySelectorAll('.page').forEach(page => {
            const pageId = page.id.replace('-page', '');
            this.pages[pageId] = page;
        });

        // Set initial page
        this.show('home');
    }

    /**
     * Show a page
     */
    show(pageName) {
        // Hide all pages
        Object.keys(this.pages).forEach(page => {
            this.pages[page].classList.remove('active');
        });

        // Show requested page
        if (this.pages[pageName]) {
            this.pages[pageName].classList.add('active');
            this.currentPage = pageName;
            window.scrollTo(0, 0);
            this.onPageChange(pageName);
        }
    }

    /**
     * Get current page
     */
    getCurrent() {
        return this.currentPage;
    }

    /**
     * Callback when page changes
     */
    onPageChange(pageName) {
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('pagechange', { detail: { page: pageName } }));
    }

    /**
     * Register page change listener
     */
    onPageChange(callback) {
        window.addEventListener('pagechange', callback);
    }
}

/**
 * Theme Manager - Handles dark/light mode
 */
class ThemeManager {
    constructor() {
        this.currentTheme = 'dark';
        this.init();
    }

    /**
     * Initialize theme
     */
    init() {
        const savedTheme = Storage.get('theme') || 'dark';
        this.setTheme(savedTheme);
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        this.currentTheme = theme;
        Storage.set('theme', theme);
        this.updateThemeIcon();
    }

    /**
     * Toggle theme
     */
    toggle() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    /**
     * Get current theme
     */
    getCurrent() {
        return this.currentTheme;
    }

    /**
     * Update theme toggle icon
     */
    updateThemeIcon() {
        const icon = DOM.query('.theme-toggle i');
        if (icon) {
            if (this.currentTheme === 'dark') {
                icon.className = 'fas fa-sun';
            } else {
                icon.className = 'fas fa-moon';
            }
        }
    }
}

/**
 * Modal Manager - Handle modals and dialogs
 */
class ModalManager {
    constructor() {
        this.modals = {};
    }

    /**
     * Register modal
     */
    register(name, element) {
        this.modals[name] = element;
    }

    /**
     * Show modal
     */
    show(name) {
        if (this.modals[name]) {
            this.modals[name].classList.add('active');
            this.modals[name].style.display = 'flex';
        }
    }

    /**
     * Hide modal
     */
    hide(name) {
        if (this.modals[name]) {
            this.modals[name].classList.remove('active');
            this.modals[name].style.display = 'none';
        }
    }

    /**
     * Hide all modals
     */
    hideAll() {
        Object.keys(this.modals).forEach(name => this.hide(name));
    }
}

/**
 * Global Managers
 */
const pageManager = new PageManager();
const themeManager = new ThemeManager();
const modalManager = new ModalManager();

/**
 * Export managers
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PageManager, ThemeManager, ModalManager, pageManager, themeManager, modalManager };
}
