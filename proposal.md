# Proposal

## Integrator's Guide

### JavaScript SDK

The Payment Broker team will release a hosted JavaScript SDK that any browser-based consumer of the Broker
can use to facilitate the collection and processing of payment data for any processor and method supported
by the Broker.

#### Overview

1. Application's back-end creates a PaymentSession with the Broker
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
    // You could also save this redirectUrl for later
    window.location = redirectUrl;
    })
}
```

`submit` will return a URL that the user must visit in order to complete the payment OR the same URL
you provided as the "returnUrl" when you create a PaymentSession if no extra payment steps are
required. In either case, your application should make the user visit this page. You have the choice to
do a full-page redirect or create an iframe or whatever you want, just know that we have no control or
knowledge of the contents of this page or if it will look good in a small iframe.

    TODO: Can we include something in the return of `submit` that indicates if a redirect
    is required or if the payment is already complete?

### Hosted Payer Page

As an alternative to using sdk.js to inline payment data collection, you can redirect your user to the
"hostedPayerPage" URL of the PaymentSession. (See below for more info).

## Implementor's Guide

### sdk.js

sdk.js should expose the following methods:

- sdk(token) - constructor that takes an opaque token to be used to retrieve information about the PaymentSession
- mount(element) - inserts HTML into the DOM element for collecting additional payer data (if applicable)
- submit() - submits the PaymentSession for processing (e.g. POST Payer, POST process)

#### `sdk(token)`

When a new instance of sdk is created it's given a token. Do a GET to Broker with this token
in order to retrieve information associated with the corresponding PaymentSession, such as
PaymentSession ID/URL, User info, auth token(?), processor and method.

    The token part of this is not required in order for this to work. As long as the client-side has access to
    the aforementioned information. The advantage of the token would be hiding semi-sensitive?
    information and keeping the URL from exceeding 2048 chars. PayPal is an example of this pattern.

#### `mount(element)`

Based on the information from the token (i.e. processor and method), sdk can retrieve the "component"
required for that processor's payment method. There could be different ways to do this retrieval:

1. Internally - all the HTML/JS for every payment method is stored in sdk.js
   Downsides: could make sdk.js unnecessarily large if there were lots of payment methods; maybe
   more coordination b/w processor module developers?

2. Externally - the HTML/JS for each payment method/processor is hosted separately and only loaded
   when needed. sdk.js would just have a reference to where each component is stored.
   Downsides: more fragmentation b/w components?

Note that the HTML component inserted into the DOM could be an `<iframe>` that loads some other externally
hosted component. This might be the case for cards for PCI reasons, for example.
See [example](https://stripe-payments-demo.appspot.com/).

Also note that at this level it doesn't really matter the specific technology we use to create these
"components" - be it React, Web Components, React + WebComponents, Svelte, Vue, etc. In the end,
they all produce HTML to be inserted into the DOM.

#### `submit()`

Validates the information in the component (i.e. Payer) and POSTs it to the Broker/Payment Module and calls "/process".
Returns the URL from the "Process event" (and maybe more info if need be). This allows the application to make the decision
about how to present the external pay site (redirect, iframe, iframe in modal, etc).

### PaymentSession

PaymentSession (and thus Broker system) has no knowledge or care in the world about UI. It does,
however, have a field/link called "externalRedirectUrl" or "hostedPayerPage" or something to that effect.
The value of the field would always be a URL that an application can redirect/iframe/modal-with-iframe/whatever-they-want their user to as an alternative to using sdk.js for facilitating the payment flow.

Example PaymentSession:

```
{
  "id": "234-2345F",
  "brokerPaymentSessionUrl": "/broker/c/123/api/v1/ps-meta/234-2345F",
  "merchantConfigId": "123",
  "askAmount": 100,
  "askCurrency": "USD",
  "clientReturnUrl": "http://commerce-app.com/payment-complete",
  "clientToken": "sdf098asd0f89asd0f98sf90",
  "_links": {
    "self": {
      "href": "/gpm/c/123/api/v1/ps/234-2345F"
    },
    "payments": {
      "href": "/gpm/c/123/api/v1/ps/234-2345F/payments"
    },
    "hostedPayerPage": {
      "href": "http://touchnet.com/payform#token=sdf098asd0f89asd0f98sf90"
    }
  }
}
```

`token` in the "hostedPayerPage" URL is the same as the `clientToken` field, which is the same token
that gets passed into sdk's constructor.

### hostedPayerPage

"hostedPayerPage" is some externally hosted page that would also use sdk.js in order to collect any
additional payer data, if any, and redirect the user to the next destination - whether that is a
processor page or the application's returnUrl.

### returnUrl

When an application created a PaymentSession, they provided a returnUrl.

    I'm thinking returnUrl has to be mandatory because the application doesn't/shouldn't know which
    payment methods will require external redirection. I think our API is basically a redirection API
    after all.

When a payment is finished (or cancelled..), the user will end up back on the application's
returnUrl page. The application shouldn't depend on a user visiting this page for updating
its internal state, since the user could have closed the browser before being redirected -- that's
what the message queue is for.

However, the returnUrl page may want to display information to the user about the status of the payment
or order. For this reason, we will append the PaymentSession ID/URL to the returnUrl in the form of a
query param. Example: `https://commerce-app.com/return?ps=as0d98as0df8s0f809sdf8"`.

The back-end would then need to use that PaymentSession ID/URL to retrieve the Session status
on behalf of the front-end (unless we also included some type of client token in returnUrl's query params
for authorization, but we're already assuming there is always a back-end because of the message queue thing).
