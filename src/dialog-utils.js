export class DialogUtils extends HTMLElement {
    static get observedAttributes() {
        return ["autofocus-target", "autoopen"];
    }

    constructor() {
        super();
    }

    connectedCallback() {
        this._connect();
    }

    _connect() {
        if (this.children.length) {
            this._init();
            return;
        }

        // Children from the Light DOM not yet available, watch it for init
        this._observer = new MutationObserver(this._init.bind(this));
        this._observer.observe(this, { childList: true });
    }

    _init() {
        if (this.initialized) {
            return;
        }

        this.dialog = this.querySelector('dialog');
        this.dialog.id = this.dialog.id ?? this.generateUniqueId();

        this.dialog.addEventListener('toggle', this.onToggle.bind(this));
        this.dialog.addEventListener('close', this.onClose.bind(this));

        this.polyfillClosedByAny();
        this.polyfillInvokerCommands();
        this.handleAutofocus();
        this.handleAutoopen();

        this.initialized = true;
        if (this._observer) this._observer.disconnect();
    }

    onToggle(e) {
        if (e.newState === 'open') {
            this.onShow();
        }
    }

    onShow() {
        let isModal = document.querySelector(`#${this.dialog.id}:modal`) !== null;

        if (isModal) {
            this.disablePageScroll();
            this.dialog.dispatchEvent(new CustomEvent('show', {
                detail: {
                    isModal: isModal,
                },
                bubbles: true,
            }));
        }
    }

    onClose() {
        this.resetIframes();
        this.enablePageScroll();
    }

    generateUniqueId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }

        return Date.now() + '-' + Math.random().toString(36).substring(2, 11);
    }

    /**
     * Polyfill for light dismissal via closedby="any"
     *
     * This way, we promote the use of future-friendly declarative attributes and no additional JS is required per dialog.
     * The polyfill can be removed once the attribute is supported in all browsers.
     *
     * @see https://developer.mozilla.org/de/docs/Web/API/HTMLDialogElement/closedBy
     */
    polyfillClosedByAny() {
        if (this.dialog.closedBy) return; // exit early if native property is supported

        if (this.dialog.getAttribute('closedby') === 'any') {
            this.dialog.addEventListener('click', (event) => {
                if (event.target === event.currentTarget) {
                    this.dialog.close();
                }
            });
        }
    }

    /**
     * Polyfill declarative invoker commands to easily autowire buttons to showModal() and close() for the <dialog>
     *
     * This way, we promote the use of future-friendly declarative attributes and no additional JS is required per dialog.
     * The polyfill can be removed once the Invoker Commands API is supported in all browsers.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API
     */
    polyfillInvokerCommands() {
        // exit early if ID is missing or commandfor API is supported
        if (!this.dialog.id || typeof window.CommandEvent === "function") return;

        this.showButton = document.querySelector(`[commandfor="${this.dialog.id}"][command="show-modal"]`);
        this.closeButton = document.querySelector(`[commandfor="${this.dialog.id}"][command="close"]`);

        if (this.showButton) {
            this.showButton.addEventListener('click', () => {
                this.dialog.showModal();
            });
        }

        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => {
                this.dialog.close();
            });
        }
    }

    /**
     * Ensure autofocus is explicitly managed; this preempts issues that can arise in case the browser's
     * focus decision (and scroll behaviour) interferes with other functionality, such as a JS carousel
     * that is simultaneously initializing and attempting to calculate slide offsets.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog#usage_notes
     */
    handleAutofocus() {
        // Check if the <dialog> or any of its children have the autofocus attribute set
        const hasAutofocus = !!this.dialog.querySelector('[autofocus]');

        if (!hasAutofocus) {
            const autofocusTargetSelector = this.getAttribute('autofocus-target');
            const autofocusTarget = this.dialog.querySelector(autofocusTargetSelector);

            if (autofocusTarget) {
                autofocusTarget.setAttribute('autofocus', '');
            } else {
                this.dialog.setAttribute('autofocus', '');
            }
        }
    }

    handleAutoopen() {
        const openImmediately = this.hasAttribute('autoopen');

        if (openImmediately) {
            this.dialog.showModal();
        }
    }

    enablePageScroll() {
        document.body.style.overflow = this.origBodyOverflow;

        // tidy up if origBodyOverflow was an empty string and no other inline styles are active
        if (document.body.getAttribute('style') === '') {
            document.body.removeAttribute('style');
        }
    }

    disablePageScroll() {
        this.origBodyOverflow = document.body.style.overflow;

        document.body.style.overflow = 'hidden';
    }

    /**
     * Ensure that any interactive iframe content (i.e. embedded video) stops playing when the dialog is closed
     */
    resetIframes() {
        let iframes = this.dialog.querySelectorAll('iframe');

        if (!iframes) return; // exit early

        iframes.forEach(iframe => {
            // In case of legacy lazyloading techniques prior to loading="lazy",
            // the src attribute may be empty, but a data-src should be present.
            let originalSrc = iframe.dataset.src ?? iframe.src;

            // Reset the src to stop any media playing
            iframe.src = '';

            // Restore the src so iframe is available if the dialog is reopened
            setTimeout(() => {
                iframe.src = originalSrc;
            }, 100);
        });
    }
}

customElements.define('dialog-utils', DialogUtils);
