import BrokerWebSdk from "../../src";

// DOM Elements
var checkoutBtn = document.getElementById("checkout-btn");
var paymentPicker = document.getElementById("payment-picker");
var configForm = document.getElementById("config-form");
var checkoutForm = document.getElementById("checkout-form");
var userForm = document.getElementById("user-form");
var colorPicker = document.getElementById("color-picker");
var bgColorPicker = document.getElementById("bg-color-picker");
var fontWeight = document.getElementById("font-weight");
var fontFamily = document.getElementById("font-family");
var formsUrl = document.getElementById("forms-url");
var payForm = document.getElementById("pay-form");
var btn = document.getElementById("submit-btn");

// Init
var redirectTo = getRedirectTo();
var returnUrl = "http://localhost:3000/return.html";
var mountElement = "#pay-form";
var broker = new BrokerWebSdk(redirectTo);
var mounted = mountPaymentForm();

// Event Handlers
paymentPicker.addEventListener("change", function(event) {
  if (mounted) broker.unmount(mountElement);
  // createPaymentSession(paymentMethod).then(redirectTo => {
  redirectTo = getRedirectTo();
  // mount returns true if something was mounted so we can perform other
  // actions accordingly
  broker = new BrokerWebSdk(redirectTo);
  mounted = mountPaymentForm();
});

checkoutForm.addEventListener("submit", function(event) {
  event.preventDefault();

  console.log("checkoutForm submit event");
  broker.submit().then(url => {
    console.log("broker.submit Promise result", url);
    // openPaymentModal(url);
  });
});

// "Server-Side" Logic - Normally these would be things the app server would do,
// but we're doing them client-side for the sake of simplifying this demonstration
function createPaymentSession(paymentMethod) {
  // Pretend like this method is just sending the necessary info (i.e. payment method)
  // to your app server. Your server would then create the PaymentSession with the
  // Broker and return the sessionToken to your client JS/HTML.

  // Build the PaymentSession object to send to the Broker
  var configFormData = new FormData(configForm);
  var checkoutFormData = new FormData(checkoutForm);
  var userFormData = new FormData(userForm);
  var paymentSession = {
    merchantConfigId: configFormData.get("merchantConfigId"),
    askAmount: convertAmount(checkoutFormData.get("amount")),
    askCurrency: checkoutFormData.get("currency"),
    paymentMethod: paymentMethod,
    returnUrl: returnUrl,
    // Optional fields
    referenceId: "asdf",
    userInfo: {
      firstName: userFormData.get("firstName"),
      lastName: userFormData.get("lastName"),
      email: userFormData.get("email")
    }
  };

  console.log("Creating a PaymentSession with the Broker");
  var paymentServiceUrl = configFormData.get("paymentServiceUrl");
  return (
    fetch(paymentServiceUrl + "/ps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentSession)
    })
      .then(resp => {
        if (!resp.ok) {
          console.warn(
            "Broker responded with an error while trying to create a PaymentSession"
          );
        }
        return resp.json();
      })
      // Seems like all we need to know on client-side in order to access a session
      // would be the sessionId and some sort of auth token ("unique visitor token")
      //.then(ps => ps.sessionToken);
      .then(ps => {
        console.log(ps);
        return ps._links.redirectTo.href;
      })
  );
}

// Helper Methods
function isBrokerPaymentMethod(method) {
  // Returns whether the given payment method is one that the should
  // be handle by the Payment Broker (since currently not every payment method
  // is implemented by the new Payment Broker system yet)
  return ["pse", "safetypay"].indexOf(method) >= 0;
}

function convertAmount(amountStr) {
  // In reality, this should account for currencies that have more/less than two decimal places
  return parseFloat(amountStr) * 100;
}

function openPaymentModal(url) {
  var modalContent = document.querySelector("#payment-redirect-modal-content");
  var iframe = document.createElement("iframe");
  iframe.src = url;
  modalContent.appendChild(iframe);
  $(".payment-redirect-modal").modal("show");
  setTimeout(() => {
    // Trying to enlarge the modal...
    // iframe.height = "500px";
    iframe.height = window.innerHeight - 30 + "px";
    $(".payment-redirect-modal").modal("handleUpdate");
  }, 100);
}

function mountPaymentForm() {
  return broker.mount(mountElement, {
    fontFamily: fontFamily.value,
    backgroundColor: bgColorPicker.value,
    color: colorPicker.value,
    fontWeight: fontWeight.value
    // padding: "15px"
  });
}

function getRedirectTo() {
  // This is just for testing - redirectTo would come from PaymentSession in real life
  var url = formsUrl.value + "/#method=" + paymentPicker.value;
  // Add user info
  var user = new FormData(userForm);
  url +=
    "&firstName=" +
    user.get("firstName") +
    "&lastName=" +
    user.get("lastName") +
    "&email=" +
    user.get("email");
  console.log(url);
  return url;
}
