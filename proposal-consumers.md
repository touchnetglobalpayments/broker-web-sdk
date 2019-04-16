# Payment Broker UI Proposal

This is a propsal/draft of how the Payment Broker team plans to help consumer's of the Broker system implement the UI portion into their applications.

## Integrator's Guide

### JavaScript SDK

The Payment Broker team will release a hosted JavaScript SDK that any browser-based consumer of the Broker
can use to facilitate the collection and processing of payment data for any processor and method supported
by the Broker.

#### Overview

1. Application back-end creates a PaymentSession with the Broker
2. Pass the PaymentSession `token` to the application's front-end
3. Load the JS SDK in your page: `<script src="https://touchnet.com/sdk.js">`.
4. Create a new instance of the SDK with the token: `const sdk = new BrokerSDK("asdf0as8df09sdf0as9fd8d90s8f")`.
5. Mount the payment form: `sdk.mount('.pay-element')`, where `.pay-element` is a query selector for the element
   you want the SDK to insert the form at. Note that some payment methods may not require extra fields, so
   calling "mount" may not always insert new HTML elements into the DOM.
6. Register an event listener on your own submit button that calls `sdk.submit()`:

```
const btn = document.getElementById("submit-btn");
btn.onclick = function(event) {
  event.preventDefault();
  sdk.submit()
  .then(redirectUrl => {
    // Full-page redirect:
    window.location = redirectUrl;
    // Alternatively, you could save this redirectUrl for later, open an iframe, etc.
    });
}
```

`submit` will return a URL that the user must visit in order to complete the payment OR the same URL
you provided as the **returnUrl** when you created a PaymentSession, if no extra payment steps are
required. In either case, your application should make the user visit this page. You have the choice to
do a full-page redirect or create an iframe or whatever you want, just be aware that we do not
have control or knowledge of the contents of this page or if it will look good in an iframe.

#### returnUrl

When your application created a PaymentSession, it should have provided a returnUrl. This page is what
the Broker will redirect your user to once a payment is complete.

It is typical to display information about the results of a transaction to a user after completing a payment.
For this reason, the Broker appends the PaymentSession ID/URL to the returnUrl in the form of a
query param (ex: `https://commerce-app.com/return?ps=as0d98as0df8s0f809sdf8`), so your application can determine
which PaymentSession the user is returning from. You could pass the PaymentSession ID/URL to your back-end in order to retrieve any relevant information for the front-end.

    Your back-end should not depend on a user visiting the returnUrl page for updating its internal state -
    since the user could have closed the browser before being redirected to it -- that's what the message queue is for.
    The returnUrl page could be viewed more as a way to integrate the user back into your application -
    like a user-experience type thing.

It is up to you as the application developer to implement the returnUrl page in a way that makes sense
for your UI and that fits the behavior of the Broker API/SDK. For example, if you chose to take the URL returned
by `sdk::submit()` and open it in an iframe, then your returnUrl page will also appear in that iframe when the
payment is complete. In order for this to not look odd, you may want the returnUrl page to automatically close the
iframe its contained in or redirect the parent page (through `window.postMessage()`, for example).
