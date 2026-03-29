/* Utility Functions */

/**
 * DOM Utilities
 */
const DOM = {
    /**
     * Query a single element
     */
    query: (selector) => document.querySelector(selector),

    /**
     * Query multiple elements
     */
    queryAll: (selector) => document.querySelectorAll(selector),

    /**
     * Get element by ID
     */
    id: (id) => document.getElementById(id),

    /**
     * Create element
     */
    create: (tag, classes = '', html = '') => {
        const el = document.createElement(tag);
        if (classes) el.className = classes;
        if (html) el.innerHTML = html;
        return el;
    },

    /**
     * Add event listener
     */
    on: (el, event, handler) => {
        if (el instanceof NodeList || Array.isArray(el)) {
            el.forEach(e => e.addEventListener(event, handler));
        } else {
            el?.addEventListener(event, handler);
        }
    },

    /**
     * Add multiple event listeners
     */
    onMultiple: (el, events, handler) => {
        events.forEach(event => el?.addEventListener(event, handler));
    },

    /**
     * Show element
     */
    show: (el) => {
        if (el instanceof NodeList || Array.isArray(el)) {
            el.forEach(e => e.style.display = '');
        } else {
            el.style.display = '';
        }
    },

    /**
     * Hide element
     */
    hide: (el) => {
        if (el instanceof NodeList || Array.isArray(el)) {
            el.forEach(e => e.style.display = 'none');
        } else {
            el.style.display = 'none';
        }
    },

    /**
     * Toggle visibility
     */
    toggle: (el) => {
        el.classList.toggle('hidden');
    },

    /**
     * Add class
     */
    addClass: (el, className) => {
        if (el instanceof NodeList || Array.isArray(el)) {
            el.forEach(e => e.classList.add(className));
        } else {
            el?.classList.add(className);
        }
    },

    /**
     * Remove class
     */
    removeClass: (el, className) => {
        if (el instanceof NodeList || Array.isArray(el)) {
            el.forEach(e => e.classList.remove(className));
        } else {
            el?.classList.remove(className);
        }
    },

    /**
     * Toggle class
     */
    toggleClass: (el, className) => {
        if (el instanceof NodeList || Array.isArray(el)) {
            el.forEach(e => e.classList.toggle(className));
        } else {
            el?.classList.toggle(className);
        }
    }
};

/**
 * Form Utilities
 */
const Form = {
    /**
     * Get form data as object
     */
    getData: (formEl) => {
        const formData = new FormData(formEl);
        return Object.fromEntries(formData);
    },

    /**
     * Reset form
     */
    reset: (formEl) => {
        formEl.reset();
    },

    /**
     * Set form data
     */
    setData: (formEl, data) => {
        Object.keys(data).forEach(key => {
            const input = formEl.elements[key];
            if (input) {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    input.checked = data[key];
                } else {
                    input.value = data[key];
                }
            }
        });
    },

    /**
     * Validate form
     */
    validate: (formEl) => {
        let isValid = true;
        const inputs = formEl.querySelectorAll('[required]');
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                Form.showError(input, 'This field is required');
                isValid = false;
            } else {
                Form.clearError(input);
            }
        });

        return isValid;
    },

    /**
     * Show error message
     */
    showError: (input, message) => {
        input.style.borderColor = 'var(--danger)';
        let feedback = input.parentElement.querySelector('.validation-feedback');
        if (!feedback) {
            feedback = DOM.create('div', 'validation-feedback error');
            input.parentElement.appendChild(feedback);
        }
        feedback.textContent = message;
        feedback.classList.remove('hidden');
    },

    /**
     * Clear error message
     */
    clearError: (input) => {
        input.style.borderColor = '';
        const feedback = input.parentElement.querySelector('.validation-feedback');
        if (feedback) {
            feedback.classList.add('hidden');
        }
    }
};

/**
 * Storage Utilities
 */
const Storage = {
    /**
     * Set item in localStorage
     */
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Storage error:', e);
        }
    },

    /**
     * Get item from localStorage
     */
    get: (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Storage error:', e);
            return null;
        }
    },

    /**
     * Remove item from localStorage
     */
    remove: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Storage error:', e);
        }
    },

    /**
     * Clear all localStorage
     */
    clear: () => {
        try {
            localStorage.clear();
        } catch (e) {
            console.error('Storage error:', e);
        }
    }
};

/**
 * Number & Formatting Utilities
 */
const Format = {
    /**
     * Format number with decimals
     */
    number: (num, decimals = 0) => {
        return Number(num).toFixed(decimals);
    },

    /**
     * Format number as percentage
     */
    percentage: (num, decimals = 0) => {
        return Format.number(num, decimals) + '%';
    },

    /**
     * Format as currency
     */
    currency: (num, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(num);
    },

    /**
     * Clamp number between min and max
     */
    clamp: (num, min, max) => {
        return Math.max(min, Math.min(max, num));
    },

    /**
     * Round to nearest
     */
    round: (num, precision = 0) => {
        const factor = Math.pow(10, precision);
        return Math.round(num * factor) / factor;
    }
};

/**
 * Validation Utilities
 */
const Validate = {
    /**
     * Validate email
     */
    email: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Validate phone
     */
    phone: (phone) => {
        const re = /^\d{10}$/;
        return re.test(phone.replace(/\D/g, ''));
    },

    /**
     * Validate URL
     */
    url: (url) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Check if value is number
     */
    isNumber: (value) => {
        return !isNaN(value) && isFinite(value);
    },

    /**
     * Check in range
     */
    inRange: (num, min, max) => {
        return num >= min && num <= max;
    }
};

/**
 * Time Utilities
 */
const Time = {
    /**
     * Debounce function
     */
    debounce: (func, delay) => {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },

    /**
     * Throttle function
     */
    throttle: (func, delay) => {
        let lastCall = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                func.apply(this, args);
            }
        };
    },

    /**
     * Sleep function
     */
    sleep: (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

/**
 * Alert/Toast Utilities
 */
const Alert = {
    /**
     * Show simple alert
     */
    show: (message, type = 'info', duration = 3000) => {
        const alertEl = DOM.create('div', `alert alert-${type}`);
        alertEl.textContent = message;
        document.body.appendChild(alertEl);
        
        setTimeout(() => {
            alertEl.remove();
        }, duration);
    },

    /**
     * Show success message
     */
    success: (message) => {
        Alert.show(message, 'success');
    },

    /**
     * Show error message
     */
    error: (message) => {
        Alert.show(message, 'error', 5000);
    },

    /**
     * Show warning message
     */
    warning: (message) => {
        Alert.show(message, 'warning', 4000);
    }
};

/**
 * Export utilities
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DOM, Form, Storage, Format, Validate, Time, Alert };
}
