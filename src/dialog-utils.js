export class DialogUtils extends HTMLElement {
    static get observedAttributes() {
        return ["autofocus-target", "autoopen"];
    }

    constructor() {
        super();
        this._boundOnClose = this.onClose.bind(this);
        this._boundOnToggle = this.onToggle.bind(this);
    }

    connectedCallback() {
        this._connect();
    }

    disconnectedCallback() {
        this.dialog.removeEventListener('close', this._boundOnClose);
        this.dialog.removeEventListener('toggle', this._boundOnToggle);
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
        if (!this.dialog) {
            console.warn('DialogUtils: No <dialog> element found. Initialization aborted.');
            return;
        }
        this.dialog.id = this.dialog.id ?? this.generateUniqueId();

        this.dialog.addEventListener('close', this._boundOnClose);
        this.dialog.addEventListener('toggle', this._boundOnToggle);

        this.polyfillClosedByAny();
        this.polyfillInvokerCommands();
        this.handleAutofocus();
        this.handleAutoopen();

        this.initialized = true;
        if (this._observer) this._observer.disconnect();
    }

    onToggle(e) {
        if (e.newState === 'open') {
            this.onOpen();
        }
    }

    onOpen() {
        let isModal = document.querySelector(`#${this.dialog.id}:modal`) !== null;

        if (isModal) {
            this.disablePageScroll();
        }

        this.dialog.dispatchEvent(new CustomEvent('open', {
            detail: {
                isModal: isModal,
            },
            bubbles: true,
        }));
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
     *
     * There is a discrepancy in Browser behaviour if `loading="lazy"` is used:
     * - Firefox only stops playing if iframe.src is reset ONCE (but NOT if it is first removed or set to empty string
     *      and THEN reset to the correct source)
     * - Chromium Browsers only stop playing the iframe.src is first removed and THEN reset to the correct source
     *
     * This is why resetIframes() first removes `loading` before touching `src` and then restoring `loading`.
     */
    resetIframes() {
        let iframes = this.dialog.querySelectorAll('iframe');

        if (!iframes) return; // exit early

        iframes.forEach(iframe => {
            let src = iframe.src;
            let loading = iframe.loading;

            if (src && loading) {
                iframe.removeAttribute('loading');
            }

            if (src) {
                // Remove src to interrupt media playing
                iframe.removeAttribute('src');

                if (loading) {
                    // Restore loading
                    iframe.setAttribute('loading', loading);
                }

                // Restore the src so iframe is available if the dialog is reopened
                iframe.src = src;
            }
        });
    }
}

customElements.define('dialog-utils', DialogUtils);
