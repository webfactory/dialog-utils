# &lt;dialog-utils&gt;

Web Component with progressive enhancements for the HTML &lt;dialog&gt; element

## Installation

```
npm install @webfactoryde/dialog-utils
```

## Usage

The `<dialog-utils>` Web Component is meant to be a lightweight wrapper and progressive enhancement for `<dialog>` elements that are used as modal dialogs.

The enhancements are:

1. `autoopen`: The Web Component supports opening a dialog immediately if an `autoopen` attribute is present on `<dialog-utils>`.
2. `commandfor` and `command`: The Web Component polyfills the [Invoker Commands API](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API) to enable future-friendly, declarative linkup of buttons to show and close the dialog even in browsers that don't support the API yet. You can opt out of this if you prefer to write your own JavaScript logic to handle this functionality.
3. `closedby="any"`: The Web Component polyfills the [declarative attribute for light dismissal](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/closedBy) of the dialog by a click outside of it.
4. Playing media: If the dialog contains an iframe, the Web Component will ensure that any media stops playing when the dialog is closed.
5. Focus behaviour: You should use the declarative `autofocus` attribute to indicate whether the dialog itself or a specific interactive child element should receive focus when the dialog is shown. If this is not an option, the Web Component accepts a `autofocus-target` attribute with a valid DOM selector string as its value. The WC will then try to set the `autofocus` attribute on the first element that matches the selector.

### Steps to implement:

1. The JS file "dialog-utils.js" must be loaded. Depending on browser support requirements, transpilation for older browsers is recommended.
2. Wrap your  `<dialog>` with `<dialog-utils>`.
3. Add a trigger and close `<button>` with your desired markup (e.g. nested icon, attributes, translated text, etc.). The buttons need to be made identifiable with `commandfor` and `command` as per the [specification](https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element), if you want to benefit from the ease-of-use polyfills. The Web Component leaves positioning and aesthetics of the buttons to the outside context.

#### Basic example

```
<button commandfor="my-dialog" command="show-modal">Open my dialog</button>

<dialog-utils>
    <dialog id="my-dialog>
        <button commandfor="my-dialog" command="close">Close</button>
        <h1>My modal</h1>
        <p>Some content</p>
    </dialog>
</dialog-utils>
```

### Events

<dl>
    <dt><code>show</code></dt>
    <dd>The component monkey-patches the <code>show()</code> and <code>showModal()</code> methods to emit a <code>show</code> event that includes information about whether the dialog is displayed as a modal via <code>(bool) event.detail.isModal</code>.</dd>
</dl>

### Extending the component

The component is exported to allow subclassing and extending its methods.

#### Example

```
import {DialogUtils} from '@webfactoryde/dialog-utils';

class MyCustomDialogUtils extends DialogUtils {
    onShow(event) {
        // call the parent method
        super.onShow?.(event);

        // do your custom thing
    }
}

customElements.define('my-custom-dialog-utils', MyCustomDialogUtils);
```
