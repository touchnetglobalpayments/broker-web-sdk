import { encodeStyles, perform3DS2Challenge, performDcc } from "./util";
import { iframeResizer } from "iframe-resizer";
import "./polyfill";

let formOrigin; // Origin of the form that we will put in an iframe (e.g. "forms.touchnet.com")
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
    const element = document.querySelector(selector);

    if (!element) {
      throw new Error("Could not find element in document to mount to");
    }

    if (element.innerHTML) {
      console.warn("The element you are trying to mount in is occupied.");
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
    if (iframe) {
      iframe.remove();
    }
  }

  submit(options) {
    options = options || {};

    // Reset the result
    submitResult = null;

    // Tell the iframe to submit
    sendIframeMessage("submit");

    // Return a Promise that will wait for the iframe to send
    // a message back before resolving, unless it times-out first
    return new Promise((resolve, reject) => {
      const maxWaitTime = options.timeout || 300000; //milliseconds
      let stopWaiting = false;

      function startTimer(waitTime) {
        return window.setTimeout(function() {
          stopWaiting = true;
        }, waitTime);
      }
      const timeoutTimer = startTimer(maxWaitTime);

      function waitForMessage() {
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
        if (submitResult) {
          if (authenticationRequired(submitResult) || dccRequired(submitResult)) {
            // Special case - 3DS2 Challenge involves opening an iframe where the user must authenticate with their bank
            // The application consuming our SDK shouldn't need to know this, so we don't want to return yet,
            // and we also don't want the timer to expire while the user is attempting to complete the challenge (for example, entering PIN sent to phone).
            window.clearTimeout(timeoutTimer);

            // Listen for new messages from iframe, since the challenge result will be submitted once completed
            submitResult = null;
            window.setTimeout(waitForMessage, 100);
          } else {
            resolve(submitResult);
          }
        } else {
          // Keep waiting.. (using recursion)
          window.setTimeout(waitForMessage, 100);
        }
      }

      waitForMessage();
    });
  }
}

// Set up listener for messages from iframe
window.addEventListener("message", event => {
  if (event.origin === formOrigin) {
    const message = event.data;
    switch (message.type) {
      case "enter":
        // This occurs when the user hits "Enter" key in the iframe.
        // If the SDK is mounted within an HTML form element and the SDK::submit method is included in the form's submit event handler,
        // this allows us to preserve the default browser behavior of form submission upon Enter event, even in our iframe,
        // by manually calling the parent form's submit event.
        if (parentForm) {
          var event = new Event("submit");
          parentForm.dispatchEvent(event);
        }
        break;

      case "submitted":
        // Set the submit result as a global so the BrokerWebSdk::submit() can access it
        const result = message.result;
        submitResult = result;

        // Special case - form may throw a 3DS2 or DCC error. SDK will handle this itself.
        if (authenticationRequired(result)) {
          // Raw error object should match the IInitiateAuthenticationResponseData from GlobalPayment's 3DS JS SDK
          perform3DS2Challenge(result.error.raw).then(challengeResult => {
            sendIframeMessage("challenge_complete", challengeResult);
          });
          return;
        } else if (dccRequired(result)){
          performDcc(result.error.raw).then(dccResult =>{
            sendIframeMessage("dcc_complete", dccResult);
          });
          return;
        }
        break;
        
      default:
        console.debug("Unknown message type:", message.type);
    }
  }
});

function authenticationRequired(submitResult) {
  return (
    submitResult &&
    submitResult.error &&
    submitResult.error.reason === "3DS2_CHALLENGE_REQUIRED"
  );
}

function dccRequired(submitResult) {
  return (
    submitResult &&
    submitResult.error &&
    submitResult.error.reason === "DCC_SELECTION_REQUIRED"
  );
}

function sendIframeMessage(type, message) {
  iframe.contentWindow.postMessage(
    { sender: "sdk.js", type: type, data: message },
    formOrigin
  );
}
