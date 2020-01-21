import { parseUrl, encodeStyles } from "./util";
import { iframeResizer } from "iframe-resizer";
import "./polyfill";

let formOrigin; // Origin of the form that we will put in an iframe (e.g. "forms.touchnet.com")
let element; // HTML element to mount iframe in
let iframe; // HTML iframe element
let parentForm; // HTML form element our iframe is mounted in, if any
let submitResult; // Response from iframe after it is submitted

export default class BrokerWebSdk {
  constructor(redirectUrl) {
    this.redirectUrl = redirectUrl;
    this.iframeMode = true;
    formOrigin = new URL(redirectUrl).origin;
  }

  /** Finds the element using the query `selector` and mounts a form within it.
      Returns true if something was mounted, false otherwise. Some payment methods
      may not need any additional information, in which case, nothing will be mounted.
   */
  mount(selector, styles) {
    element = document.querySelector(selector);

    if (!element) {
      console.error("Could not find element in document to mount to");
      return false;
    }

    if (element.innerHTML) {
      console.warn("The element you are trying to mount in is occupied.");
      return false;
    }

    // Create and insert an iframe
    iframe = document.createElement("iframe");
    iframe.width = "100%";
    iframe.frameBorder = 0;
    iframe.src =
      this.redirectUrl +
      "&iframe=" +
      this.iframeMode +
      "&" +
      encodeStyles(styles);
    element.appendChild(iframe);
    iFrameResize({ log: false }, iframe); // Set log to true for debugging

    // Save the <form> element we're mounting in (if any) for future reference
    parentForm = element.closest("form");

    return true;
  }

  unmount() {
    iframe.remove();
  }

  submit(options) {
    options = options || {};

    // Reset the result
    submitResult = null;

    // Tell the iframe to submit
    iframe.contentWindow.postMessage(
      { sender: "sdk.js", type: "submit" },
      formOrigin
    );

    // Return a Promise that will wait for the iframe to send
    // a message back before resolving, unless it times-out first
    return new Promise((resolve, reject) => {
      const maxWaitTime = options.timeout || 10000; //milliseconds
      let stopWaiting = false;

      setTimeout(function() {
        stopWaiting = true;
      }, maxWaitTime);

      function wait() {
        if (stopWaiting) {
          // Rather than throw errors, we'll keep everything in the result object
          // and make clients check if there is an error (ala golang ;)
          resolve({
            error: {
              type: "connection_error",
              message: "Request timed-out"
            }
          });
        }
        if (!submitResult) {
          // Keep waiting.. (using recursion)
          window.setTimeout(wait, 100);
        } else {
          resolve(submitResult);
        }
      }

      wait();
    });
  }
}

// Set up listener for messages from iframe
window.addEventListener("message", event => {
  if (event.origin === formOrigin) {
    const message = event.data;
    switch (message.type) {
      case "enter":
        // This would be when the user hits "Enter" in the iframe.
        // If we mounted the iframe within an HTML form element,
        // we want to trigger that form's submit event manually,
        // because presumably that is where our submit() method is along
        // with any other other app-specific logic
        if (parentForm) {
          var event = new Event("submit");
          parentForm.dispatchEvent(event);
        }
        break;
      case "submitted":
        // Set the submit result as a global so the BrokerWebSdk::submit() can access it
        submitResult = message.result;
        break;
      case "loaded":
        // Using iframeResizer instead
        // iframe.height = message.height;
        break;
      default:
      // console.log("Unknown message", message);
    }
  }
});
