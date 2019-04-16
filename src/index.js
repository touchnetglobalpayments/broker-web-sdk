import { parseUrl, encodeStyles } from "./util";
import { iframeResizer } from "iframe-resizer";
import "./polyfill";

let formOrigin = "http://localhost:3000";
let element; // HTML element to mount iframe in
let parentForm; // HTML form element our element is mounted in, if any
let iframe; // HTML iframe element
let redirectUrl;

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
    parentForm = element.closest("form");

    if (!element) {
      console.error("Could not find element in document to mount to");
      return false;
    }

    if (element.innerHTML) {
      console.warn("The element you are trying to mount in is occupied.");
      return false;
    }

    // Load an iframe
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
    return true;
  }

  unmount() {
    iframe.remove();
  }

  submit() {
    // Send message to iframe
    iframe.contentWindow.postMessage(
      { sender: "sdk.js", type: "submit" },
      formOrigin
    );

    // Return a Promise that will wait for the iframe to send
    // a message back before resolving, unless it times-out first
    // Alternative idea - we emit a submit event that clients of SDK should
    // listen for, but that's not as nice as working w/Promsises and has complications of its own
    return new Promise((resolve, reject) => {
      const maxWaitTime = 5000; //milliseconds
      let stopWaiting = false;

      setTimeout(function() {
        stopWaiting = true;
      }, maxWaitTime);

      function wait() {
        if (stopWaiting) {
          reject(new Error("Failed to receive a response from the form"));
        }
        if (!redirectUrl) {
          // Keep waiting.. (using recursion)
          window.setTimeout(wait, 100);
        } else {
          resolve(redirectUrl);
        }
      }

      wait();
    });
  }
}

function redirect(redirectUrl) {
  window.top.location = redirectUrl;
}

function calcHeight(iframeElement) {
  console.log("calcHeight");
  console.log(iframeElement);
  return iframeElement.contentWindow.document.body.scrollHeight;
}

// Set up listener for messages from iframe
window.addEventListener("message", event => {
  if (event.origin === formOrigin) {
    const message = event.data;
    switch (message.type) {
      case "enter":
        // This would be when the user hits "Enter" in the iframe.
        // If our iframe form is mounted within an HTML form element,
        // we want to trigger the form's submit event manually,
        // because presumably that is where our submit() method is along
        // with any other other app-specific logic
        if (parentForm) {
          var event = new Event("submit");
          parentForm.dispatchEvent(event);
        }
        break;
      case "submitted":
        // Set the global redirectUrl
        redirectUrl = message.redirectUrl;
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
