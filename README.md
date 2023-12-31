# Payment Broker Web SDK
[![npm](https://img.shields.io/npm/v/@touchnet/broker-web-sdk)](https://www.npmjs.com/package/@touchnet/broker-web-sdk)

The Broker Web SDK is intended to be used by application front-ends that want to make payments through the TouchNet Payment Broker and have the Broker's payment method collection forms appear integrated in your user interface. It uses an iframe for security/PCI reasons.

See the [Payment Broker User Guide](docs/PaymentBrokerGuide.md) for the Payment Broker for background on the Payment Broker system and the flow of integration.

## Usage
The Payment Broker Web SDK can be pulled in via NPM or at runtime.

#### NPM package
```sh
# Bundle the Broker Web SDK along with your application
npm install @touchnet/broker-web-sdk
```

```js
var BrokerWebSdk = require('@touchnet/broker-web-sdk/umd/broker-web-sdk.min.js')
```

#### Runtime
```html
<script src="https://touchnet.com/broker-web-sdk.js"></script>
```

### API
- `BrokerWebSdk(redirectTo)` - constructor that takes the redirectTo link from a recently created PaymentSession.
- `mount(element, styles)` - inserts a payment form in `element` for collecting additional payer data (if applicable); takes a `styles` object to make the payment form look more like it's part of your page; Returns boolean of whether something was mounted.
- `submit(options)` - submits the payment form for processing. Returns a Promise with a result object. `options` is an object.
  Currently accepts `timeout` property that should be set to the time in milliseconds your application is willing to wait for a response before considering the submission to have timed-out (default is 300000 ms).
  If the SDK times-out, but the submission ultimately succeeds, the next submission will fail with a "payer data already collected" error. Your app would need to handle that situation appropriately.

### Quick Start
1. Create a payment session by calling `POST /c/{tenantId}/api/v2/customer/ps`. Your application should provide a [`returnUrl`](#returnUrl) for the end users to return to once the payment session flow is complete. See the Open API documentation for more details
2. in the response you will find a payment session id and url link labelled `redirectTo` that directs to the next step in the payment flow.
3. use the `redirectTo` link to initialize the broker SDK by calling the constructor
```javascript
// Note: requires loading the SDK via one of the methods above
const sdk = new BrokerWebSDK(redirectTo)
```
4. mount the payment frame in your UI
```javascript
// Note: `.pay-element` is a query selector for the element in which you want the SDK to insert the form.
// Some payment methods do not require extra fields, so calling `mount` may not always insert new HTML elements into the DOM.
// For this reason, mount() will returns a boolean indicating whether it mounted something or not.
sdk.mount('.pay-element')
// Register a listener on your own submit event that calls `sdk.submit()`
const form = document.getElementById("checkout-form");
form.addEventListener("submit", function(event) {
  event.preventDefault();
  sdk.submit()
  .then(result => {
    if (!result.error) {
      // You could also save this redirectUrl for later
      window.location = result.redirectUrl;
    } else {
      // Notify the user of error
    }
    });
});
```
> We recommend that you wrap the div or element that you mount the SDK's element in with a form.
> If you do so, the user can hit enter in the SDK's form and your form's submit event will be
> triggered automatically.

5. The user will interact with the broker within this iframe, insulating your application from PCI data. Upon submit, you will receive a response with either your application return URL link (if all payment data collection is complete) or a link with additional payment steps for the end user to continue the payment.
> `submit` returns a Promise that resolves to a result object.
You should check that the result does not have an `error` property.
If it does not have an error, it will have a `redirectUrl` property.
This property will contain either the URL that the user must visit in order to complete the payment OR
the same URL you provided as the `returnUrl` when you create a PaymentSession if no extra payment steps are required.
You have the choice to do a full-page redirect, create an iframe, or present this page in a manner of your choosing,
but the SDK has no control or knowledge of the contents of this page or if it will look good in a small iframe.
6. Application backend observes payment session state after user payment data collection via `GET /c/{tenantId}/api/v1/ps/{id}` and processes the payment via the `/process` endpoint of the payment session. If the application needs sanitized data from collection, it is available via the payer link on the payment session. In the case of card payments, this will give them card last 4, expiration, bill address, and card type.
> Note: Credit card payments additionally require a call to the `/capture` endpoint of the payment session to move the payment to CLEARED.
7. If the payment is not yet cleared, you can monitor the payment session status by using the payment session id to call `GET /c/{tenantId}/api/v1/ps/{id}`

### returnUrl
<a name="returnUrl"></a>
When your application created a PaymentSession, it should have provided a returnUrl. This page is what the Broker will redirect your user to once a payment is complete.

Your application may want to display information about the results of a transaction to the user after a payment completes.
For this reason, the Broker appends the PaymentSession ID/URL to the returnUrl in the form of a query param (ex: `https://commerce-app.com/return?ps=as0d98as0df8s0f809sdf8`),
so your application can determine which PaymentSession the user is returning from.
You could pass the PaymentSession ID/URL to your back-end in order to retrieve any relevant information for the front-end.

> Your back-end should not depend on a user visiting the returnUrl page for updating its internal
> state - since the user could have closed the browser before being redirected to it.
> The returnUrl page should be viewed more as a way to integrate the user back into your application for user experience purposes.

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

> The styling functionality in the SDK is a work-in-progress.

## Broker Developers
See [CONTRIBUTING.md](CONTRIBUTING.md) for more info.
