/** 
JavaScript client for the TouchNet Payment Service

Architect: Nikola Nikolov
*/
export default class PaymentSessionClient {
  constructor(authToken) {
    this.paymentSessionUrl = null;
    this.paymentMethod = null;
    this.newPaymentUrl = null;
    this.processUrl = null;
    this.newPayerUrl = null;
    this.currentPaymentUrl = null;
    // Bearer token to be placed in the header
    this.token = authToken;
  }

  setToken(token) {
    this.token = token;
  }

  getPaymentSession(paymentSessionUrl) {
    this.paymentSessionUrl = paymentSessionUrl || this.paymentSessionUrl;

    return this.fetch(this.paymentSessionUrl).then(session => {
      this.paymentMethod = session.paymentMethod;
      this.newPaymentUrl = session._links.addPayment.href;
      this.currentPaymentUrl = session._links.getCurrentPayment
        ? session._links.getCurrentPayment.href
        : null;
      return session;
    });
  }

  getPayment(paymentUrl) {
    return this.fetch(paymentUrl);
  }

  getCurrentPayment() {
    return this.getPayment(this.currentPaymentUrl).then(payment => {
      switch (payment.paymentStatus) {
        case "PAYER_INFO_REQUIRED":
          this.newPayerUrl = payment._links.addPayerInfo.href;
          break;
        case "READY_TO_PROCESS":
          this.processUrl = payment._links.process.href;
          break;
        case "INITIALIZED_WITH_PROCESSOR":
        case "FAILURE":
          break;
      }
      return payment;
    });
  }

  createPayment() {
    return this.fetch(this.newPaymentUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }).then(payment => {
      this.newPayerUrl = payment._links.addPayerInfo.href;
      this.currentPaymentUrl = payment._links.self.href;
      return payment;
    });
  }

  shouldCreatePayment() {
    // If there is no current payment or the current payment is failed,
    // we should create a new payment
    if (this.currentPaymentUrl) {
      return this.getPayment(this.currentPaymentUrl).then(payment => {
        if (payment.status === "FAILED") return true;
        else return false;
      });
    } else {
      return this.getPayment(this.currentPaymentUrl);
    }
  }

  getOrCreatePayment() {
    // Try to get the current payment - if that fails or the status is FAILED
    // then it means we should create a new payment
    if (this.currentPaymentUrl) {
      return this.getCurrentPayment().then(payment => {
        if (payment.paymentStatus === "FAILURE") {
          return this.createPayment();
        } else {
          return payment;
        }
      });
    } else {
      return this.createPayment();
    }
  }

  createPayer(payer) {
    return this.fetch(this.newPayerUrl, {
      method: "POST",
      body: JSON.stringify(payer),
      headers: { "Content-Type": "application/json" }
    });
  }

  /** Process the PaymentSession */
  process() {
    return this.getCurrentPayment()
      .then(payment => payment._links.process.href)
      .then(processUrl =>
        this.fetch(processUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        })
      );
  }

  /** Wrapper around built-in fetch that will return a Promise
  that either resolves with the JSON of the response body or an _Error */
  fetch(input, init) {
    console.debug("Fetching ", input, "with options", init);
    let status = 400;

    // Put the "unique visitor token" token in the header
    const auth = "Bearer " + this.token;
    if (init) {
      if (init instanceof Headers) {
        init.headers.append("Authorization", auth);
      } else {
        init.headers["Authorization"] = auth;
      }
    } else {
      let headers = new Headers();
      headers.append("Authorization", auth);
      init = {
        headers: headers
      };
    }

    return fetch(input, init)
      .then(response => {
        status = response.status;
        return response.json();
      })
      .then(response => {
        console.debug(response);
        if (status >= 200 && status < 300) {
          return response;
        } else {
          const error = this.buildError(status, response);
          return Promise.reject(error);
        }
      })
      .catch(error => {
        if (error instanceof TypeError) {
          // Thrown by fetch() b/c of network error
          return Promise.reject(
            new _Error("ConnectionError", "TODO: ConnectionError message???")
          );
        }
        if (error instanceof SyntaxError) {
          // Thrown by response.json() if response isn't valid JSON
          return Promise.reject(
            new _Error(
              "ApiError",
              "TODO: Message for this ApiError..? (json parse failed)"
            )
          );
        }
        // For anything else, just rethrow
        return Promise.reject(error);
      });
  }

  /** Takes a raw response (JSON) from the server and builds an Error object accordingly */
  buildError(status, rawResp) {
    if (rawResp.appCode === "invalid_action") {
      return new _Error("InvalidActionError", rawResp);
    }
    switch (status) {
      case 200:
      case 201:
        return rawResp;
      case 400:
        return new _Error("InvalidRequestError", rawResp);
      case 403:
        // This is an actual HTTP error code. Not implemented on server-side yet.
        return new _Error("InvalidActionError", rawResp);
      case 404:
        return new _Error("ResourceNotFound", rawResp);
      default:
        return new _Error("GenericError", rawResp);
    }
  }
}

class _Error {
  constructor(type, rawResponse) {
    this.type = type;
    this.raw = rawResponse;
    this.init();
  }

  init() {
    // Probably need a more robust way of handling errors - would be nice if error response
    // from server included the type..
    if (Array.isArray(this.raw)) {
      this.msg = "";
      if (this.type === "InvalidRequestError") {
        this.raw.forEach(
          error => (this.msg += error.fieldName + " " + error.message)
        );
      } else {
        this.raw.forEach(error => (this.msg += error.message));
      }
    }
  }
}
