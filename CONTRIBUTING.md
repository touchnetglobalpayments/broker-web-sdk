# Broker Web SDK Developer Guide

When built/released the project produces a file called `broker-web-sdk.js` (and a minified version).

> If you notice a mistake, please fix it!

### broker-web-sdk.js

broker-web-sdk.js should expose the following methods:

- BrokerWebSdk(redirectTo) - constructor that takes the redirectTo link from a recently created PaymentSession.
- mount(element, styles) - inserts a payment form in `element` for collecting additional payer data (if applicable); takes a `styles` object to make the payment form look more like it's part of your page.
- submit() - submits the payment form for processing. Returns a Promise

#### `sdk(redirectTo)`

When a new instance of sdk is created it's given a redirectTo. Do a GET to Broker with this redirectTo
in order to retrieve information associated with the corresponding PaymentSession, such as
PaymentSession ID/URL, User info, auth redirectTo(?), processor and method.

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
