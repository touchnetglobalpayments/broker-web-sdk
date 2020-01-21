# Payment Broker Web SDK

[![Travis][build-badge]][build]
[![npm package][npm-badge]][npm]
[![Coveralls][coveralls-badge]][coveralls]

The Broker Web SDK is intended to be used by application front-ends that want to make payments through
the Payment Broker.

## Usage

When built, the project produces a file called `broker-web-sdk.js` (and a minified version).

The Payment Broker team will host this file so that any browser-based consumer of the Broker can
use it to facilitate the collection and processing of payment data for any processor and method
supported by the Broker.

> Please don't include this file in your application's source code (e.g. `import './broker-web-sdk'`).
> Rather, pull it in through a script tag (e.g. `<script src="https://touchnet.com/broker-web-sdk.js"></script>`).

### API

- `BrokerWebSdk(redirectTo)` - constructor that takes the redirectTo link from a recently created PaymentSession.
- `mount(element, styles)` - inserts a payment form in `element` for collecting additional payer data (if applicable); takes a `styles` object to make the payment form look more like it's part of your page; Returns boolean of whether something was mounted.
- `submit(options)` - submits the payment form for processing. Returns a Promise with a result object. `options` is an object.
  Currently accepts `timeout` property that should be set to the time in milliseconds your application is willing to wait for a response before considering the submission to have timed-out (default is 10000 ms).
  If the SDK times-out, but the submission ultimately succeeds, the next submission will fail with a "payer data already collected" error. Your app would need to handle that situation appropriately.

### Quick Start

1. Application's back-end creates a PaymentSession with the Broker
2. Pass the PaymentSession `redirectTo` to the application's front-end
3. Load the SDK in your page: `<script src="https://touchnet.com/sdk.js">`.
4. Create a new instance of the SDK with the redirectTo: `const sdk = new BrokerWebSDK(redirectTo)`.
5. Mount the payment form: `sdk.mount('.pay-element')`, where `.pay-element` is a query selector
   for the element you want the SDK to insert the form at. Note that some payment methods may not
   require extra fields, so calling "mount" may not always insert new HTML elements into the DOM.
   For this reason, mount() will return whether it mounted something or not.
6. Register a listener on your own submit event that calls `sdk.submit()`:

```
const form = document.getElementById("checkout-form");
form.addEventListener("submit", function(event) {
  event.preventDefault();
  sdk.submit()
  .then(result => {
    if (!result.error) {
      // You could also save this redirectUrl for later
      window.location = redirectUrl;
    } else {
      // Notify the user of error
    }
    });
});
```

> We recommend that you wrap the div or element that you mount the SDK's element in with a form.
> If you do so, the user can hit enter in the SDK's form and your form's submit event will be
> triggered automatically.

`submit` will return a Promise that resolves to a result object.
You should check that the result does not have an `error` property.
If it does not have an error, it will have a `redirectUrl` property.
This is the URL that the user must visit in order to complete the payment OR
the same URL you provided as the "returnUrl" when you create a PaymentSession if no extra payment steps are required.
You have the choice to do a full-page redirect or create an iframe or whatever you want,
just know that we have no control or knowledge of the contents of this page or if it will look good in a small iframe.

    TODO: Can we include something in the return of `submit` that indicates if a redirect
    is required or if the payment is already complete?

### returnUrl

When your application created a PaymentSession, it should have provided a returnUrl. This page is
what the Broker will redirect your user to once a payment is complete.

Your application may want to display information about the results of a transaction to the user after a payment completes.
For this reason, the Broker appends the PaymentSession ID/URL to the returnUrl in the form of a query param (ex: `https://commerce-app.com/return?ps=as0d98as0df8s0f809sdf8`),
so your application can determine which PaymentSession the user is returning from.
You could pass the PaymentSession ID/URL to your back-end in order to retrieve any relevant information for the front-end.

> Your back-end should not depend on a user visiting the returnUrl page for updating its internal
> state - since the user could have closed the browser before being redirected to it -- that's what
> the message queue is for.
> The returnUrl page could be viewed more as a way to integrate the user back into your application-
> like a user-experience type thing.

It is up to you as the application developer to implement the returnUrl page in a way that makes
sense for your UI and that fits the behavior of the Broker API and Web SDK.
For example, if you chose to take the URL returned by `sdk::submit()` and open it in an iframe,
then your returnUrl page will also appear in that iframe when the payment is complete.
In order for this to not look odd, you may want the returnUrl page to automatically close the iframe its contained in or redirect
the parent page (through `window.postMessage()`, for example).

### Styles

The `mount(element, styles)` method optionally takes a styles object.
Currently the supported properties of the style object are:

- "fontFamily"
- "backgroundColor"
- "color"
- "fontWeight"
- "fontSize"
- "lineHeight"
- "padding"

> The styles part of the SDK is a big work-in-progress..

## Broker Developers

See `CONTRIBUTING.md` for more info.
