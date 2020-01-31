import { encodeStyles, perform3DS2Challenge } from "./util";
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
    iframe.remove();
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
        // Special case - form may throw a 3DS2 error. SDK will handle this itself.
        const result = message.result;

        if (result.error && result.error.reason === "3DS2_CHALLENGE_REQUIRED") {
          /* Example Init Auth Response (3DS2_CHALLENGE_REQUIRED error): 
          {
            acsTransactionId: "516faa38-bfa1-460b-ba3e-7da6d0bc45d2",
            authenticationSource: "BROWSER",
            authenticationRequestType: "DYNAMIC_CHALLENGE",
            cardholderResponseInfo: null,
            challenge: {
              encodedChallengeRequest:
                "ewogICJ0aHJlZURTU2VydmVyVHJhbnNJRCIgOiAiNWJhMDZlYmUtMWE0OS00M2Y1LWE2MGUtMmJmNjM1OWFmYTQ5IiwKICAiYWNzVHJhbnNJRCIgOiAiNTE2ZmFhMzgtYmZhMS00NjBiLWJhM2UtN2RhNmQwYmM0NWQyIiwKICAiY2hhbGxlbmdlV2luZG93U2l6ZSIgOiAiMDQiLAogICJtZXNzYWdlVHlwZSIgOiAiQ1JlcSIsCiAgIm1lc3NhZ2VWZXJzaW9uIiA6ICIyLjEuMCIKfQ==",
              requestUrl: "https://test.portal.gpwebpay.com/pay-sim-gpi/sim/acs"
            },
            challengeMandated: true,
            deviceRenderOptions: null,
            dsTransactionId: "2552ace0-2b56-4cc3-bbd5-ebc6549d4025",
            messageCategory: "PAYMENT_AUTHENTICATION",
            messageVersion: "2.1.0",
            serverTransactionId: "5ba06ebe-1a49-43f5-a60e-2bf6359afa49",
            status: "CHALLENGE_REQUIRED",
            statusReason: "LOW_CONFIDENCE"
          }
          */

          perform3DS2Challenge(result.error.raw).then(challengeResult => {
            sendIframeMessage("challenge_complete", challengeResult);
          });
          return;
        }

        // Set the submit result as a global so the BrokerWebSdk::submit() can access it
        submitResult = result;
        break;

      default:
        console.warn("Unknown message type:", message.type);
    }
  }
});

function sendIframeMessage(type, message) {
  iframe.contentWindow.postMessage(
    { sender: "sdk.js", type: type, data: message },
    formOrigin
  );
}
