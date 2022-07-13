import {
  handleInitiateAuthentication,
  ChallengeWindowSize,
  handle3dsVersionCheck
} from "globalpayments-3ds";

const isWindowsMobileOs = /Windows Phone|IEMobile/.test(
  navigator.userAgent,
);

const isAndroidOrIOs = /Android|iPad|iPhone|iPod/.test(
  navigator.userAgent,
);

const isMobileXS =
  ((window.innerWidth > 0 ? window.innerWidth : screen.width) <= 360
    ? true
    : false) ||
  ((window.innerHeight > 0 ? window.innerHeight : screen.height) <= 360
    ? true
    : false);

// For IOs/Android and small screen devices always open in new tab/window
// TODO: Confirm/implement once sandbox support is in place
const isMobileNewTab =
  !isWindowsMobileOs && (isAndroidOrIOs || isMobileXS);

// Display IFrame on WIndows Phone OS mobile devices
const isMobileIFrame = isWindowsMobileOs || isMobileNewTab;

const randomId = Math.random()
  .toString(16)
  .substr(2, 8);

function encodeStyles(styles) {
  let url = "";
  const whitelist = [
    "fontFamily",
    "backgroundColor",
    "color",
    "fontWeight",
    "fontSize",
    "lineHeight",
    "padding"
  ];
  for (var s in styles) {
    if (whitelist.indexOf(s) >= 0) {
      url += "style." + s + "=" + styles[s] + "&";
    } else {
      console.warn("Style", s, "is not allowed");
    }
  }
  return url;
}

async function perform3DS2Challenge(initAuthResponse) {
  const challengeWindowOptions = {
    displayMode: "lightbox",
    size: ChallengeWindowSize.Windowed500x600,
    target: "iframe-target",
    origin: new URL(initAuthResponse.tn3DS2Origin).origin
  };

  // This will handle opening the iframe and listening for the iframe's message when completed
  const initAuthResponseAndChallengeResult = await handleInitiateAuthentication(
    initAuthResponse,
    challengeWindowOptions
  );

  // Global's SDK returns the challenge result plus the Init Auth response we gave it...
  // We're only concerned with the result.
  return initAuthResponseAndChallengeResult.challenge.response.data;
}

async function performDcc(dccRequestedException){
  const dccWindowOptions = {
    displayMode: "lightbox",
    width: 980,
    height: 660, 
    target: "iframe-target",
    origin: new URL(dccRequestedException.dccInfoUrl).origin
  }

  const dccResponse = await handleDccSelection(dccRequestedException, dccWindowOptions);

  return dccResponse;
}

async function handleDccSelection(dccRequestedException, dccWindowOptions){
  await postDccToIframe(dccRequestedException.dccInfoUrl, dccWindowOptions)
}

function postDccToIframe(dccUrl, options) {
  return new Promise((resolve, reject) => {
    let timeout;
    if (options.timeout) {
      timeout = setTimeout(() => {
        ensureIframeClosed(timeout);
        reject(new Error("timeout reached"));
      }, options.timeout)
    }
    const iframe = document.createElement("iframe");
    iframe.id = iframe.name = `globalpayments-dcc-${randomId}`;
    iframe.style.display = options.hide ? "none" : "inherit";
    iframe.src = `${dccUrl}&iframe=true`;

    createDccLightbox(iframe, options);

    // Add event listener to resolve promise when modal is finished.
    window.addEventListener("message", getWindowMessageEventHandler(resolve, {
      origin: options.origin,
      timeout: timeout,
    }));
  });
}

function createForm(action, target, fields) {
  var form = document.createElement("form");
  form.setAttribute("method", "POST");
  form.setAttribute("action", action);
  form.setAttribute("target", target);

  for (const field of fields) {
    const input = document.createElement("input");
    input.setAttribute("type", "hidden");
    input.setAttribute("name", field.name);
    input.setAttribute("value", field.value);
    form.appendChild(input);
  }

  return form;
}

function ensureIframeClosed(timeout) {
  if (timeout) {
    clearTimeout(timeout);
  }

  try {
    Array.prototype.slice.call(document
      .querySelectorAll(`[target$="-${randomId}"],[id$="-${randomId}"]`))
    .forEach((element) => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
  }
  catch (e) {
    /** */
  }
}

function getWindowMessageEventHandler(resolve, data) {
  return (event) => {
    // checking for this event here as it starting coming through after upgrading react-scripts in payer
    // collection forms to 5.0.x, causing the iframe to close prematurely.
    if (event.data === "[iFrameResizerChild]Ready") {
      return;
    }
    const origin = data.origin || window.location.origin;
    if (origin !== event.origin) {
      return;
    }
    ensureIframeClosed(data.timeout || 0);
    resolve(event.data);
  };
}

function createCloseButton(options) {
  if (
    document.getElementById(`globalpayments-frame-close-${randomId}`) !== null
  ) {
    return;
  }
}

function closeModal() {
  Array.prototype.slice.call(document
    .querySelectorAll(`[target$="-${randomId}"],[id$="-${randomId}"]`))
    .forEach((element) => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
}

function getIFrameOnloadEventHandler(iFrame, spinner, overlayElement, options) {
  return () => {
    iFrame.style.opacity = "1";
    iFrame.style.transform = "scale(1)";
    iFrame.style.backgroundColor = "#ffffff";

    if (spinner.parentNode) {
      spinner.parentNode.removeChild(spinner);
    }

    const closeButton = createCloseButton(options);
    if (closeButton) {
      overlayElement.appendChild(closeButton);
      closeButton.addEventListener(
        "click",
        () => {
          if (closeButton) {
            closeModal();
          }
        },
        true,
      );
    }
  };
}

function createDccLightbox(iFrame, options) {
  // Create the overlay
  var overlayElement = createOverlay();
  // Create the spinner
  var spinner = createSpinner();
  document.body.appendChild(spinner);
  // Configure the iframe
  if (options.height) {
      iFrame.setAttribute("height", options.height + "px");
  }
  iFrame.setAttribute("frameBorder", "0");
  if (options.width) {
      iFrame.setAttribute("width", options.width + "px");
  }
  iFrame.setAttribute("seamless", "seamless");
  iFrame.style.zIndex = "10001";
  iFrame.style.position = "absolute";
  iFrame.style.transition = "transform 0.5s ease-in-out";
  iFrame.style.transform = "scale(0.7)";
  iFrame.style.opacity = "0";
  overlayElement.appendChild(iFrame);
  if (isMobileIFrame || options.windowSize === ChallengeWindowSize.FullScreen) {
      iFrame.style.top = "0px";
      iFrame.style.bottom = "0px";
      iFrame.style.left = "0px";
      iFrame.style.marginLeft = "0px;";
      iFrame.style.width = "100%";
      iFrame.style.height = "100%";
      iFrame.style.minHeight = "100%";
      iFrame.style.WebkitTransform = "translate3d(0,0,0)";
      iFrame.style.transform = "translate3d(0, 0, 0)";
      var metaTag = document.createElement("meta");
      metaTag.name = "viewport";
      metaTag.content =
          "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0";
      document.getElementsByTagName("head")[0].appendChild(metaTag);
  }
  else {
      iFrame.style.top = "40px";
      iFrame.style.left = "50%";
      iFrame.style.marginLeft = "-" + options.width / 2 + "px";
  }
  iFrame.onload = getIFrameOnloadEventHandler(iFrame, spinner, overlayElement, options);
}

function createOverlay() {
  var overlay = document.createElement("div");
  overlay.setAttribute("id", `overlay-${randomId}`);
  overlay.style.position = "fixed";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.transition = "all 0.3s ease-in-out";
  overlay.style.zIndex = "100";
  if (isMobileIFrame) {
      overlay.style.position = "absolute !important";
      overlay.style.WebkitOverflowScrolling = "touch";
      overlay.style.overflowX = "hidden";
      overlay.style.overflowY = "scroll";
  }
  document.body.appendChild(overlay);
  setTimeout(function () {
      overlay.style.background = "rgba(0, 0, 0, 0.7)";
  }, 1);
  return overlay;
}

function createSpinner() {
  var spinner = document.createElement("img");
    spinner.setAttribute("src", 
    // tslint:disable-next-line:max-line-length
    "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+PHN2ZyB4bWxuczpzdmc9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjAiIHdpZHRoPSIzMnB4IiBoZWlnaHQ9IjMycHgiIHZpZXdCb3g9IjAgMCAxMjggMTI4IiB4bWw6c3BhY2U9InByZXNlcnZlIj48Zz48cGF0aCBkPSJNMzguNTIgMzMuMzdMMjEuMzYgMTYuMkE2My42IDYzLjYgMCAwIDEgNTkuNS4xNnYyNC4zYTM5LjUgMzkuNSAwIDAgMC0yMC45OCA4LjkyeiIgZmlsbD0iIzAwNzBiYSIgZmlsbC1vcGFjaXR5PSIxIi8+PHBhdGggZD0iTTM4LjUyIDMzLjM3TDIxLjM2IDE2LjJBNjMuNiA2My42IDAgMCAxIDU5LjUuMTZ2MjQuM2EzOS41IDM5LjUgMCAwIDAtMjAuOTggOC45MnoiIGZpbGw9IiNjMGRjZWUiIGZpbGwtb3BhY2l0eT0iMC4yNSIgdHJhbnNmb3JtPSJyb3RhdGUoNDUgNjQgNjQpIi8+PHBhdGggZD0iTTM4LjUyIDMzLjM3TDIxLjM2IDE2LjJBNjMuNiA2My42IDAgMCAxIDU5LjUuMTZ2MjQuM2EzOS41IDM5LjUgMCAwIDAtMjAuOTggOC45MnoiIGZpbGw9IiNjMGRjZWUiIGZpbGwtb3BhY2l0eT0iMC4yNSIgdHJhbnNmb3JtPSJyb3RhdGUoOTAgNjQgNjQpIi8+PHBhdGggZD0iTTM4LjUyIDMzLjM3TDIxLjM2IDE2LjJBNjMuNiA2My42IDAgMCAxIDU5LjUuMTZ2MjQuM2EzOS41IDM5LjUgMCAwIDAtMjAuOTggOC45MnoiIGZpbGw9IiNjMGRjZWUiIGZpbGwtb3BhY2l0eT0iMC4yNSIgdHJhbnNmb3JtPSJyb3RhdGUoMTM1IDY0IDY0KSIvPjxwYXRoIGQ9Ik0zOC41MiAzMy4zN0wyMS4zNiAxNi4yQTYzLjYgNjMuNiAwIDAgMSA1OS41LjE2djI0LjNhMzkuNSAzOS41IDAgMCAwLTIwLjk4IDguOTJ6IiBmaWxsPSIjYzBkY2VlIiBmaWxsLW9wYWNpdHk9IjAuMjUiIHRyYW5zZm9ybT0icm90YXRlKDE4MCA2NCA2NCkiLz48cGF0aCBkPSJNMzguNTIgMzMuMzdMMjEuMzYgMTYuMkE2My42IDYzLjYgMCAwIDEgNTkuNS4xNnYyNC4zYTM5LjUgMzkuNSAwIDAgMC0yMC45OCA4LjkyeiIgZmlsbD0iI2MwZGNlZSIgZmlsbC1vcGFjaXR5PSIwLjI1IiB0cmFuc2Zvcm09InJvdGF0ZSgyMjUgNjQgNjQpIi8+PHBhdGggZD0iTTM4LjUyIDMzLjM3TDIxLjM2IDE2LjJBNjMuNiA2My42IDAgMCAxIDU5LjUuMTZ2MjQuM2EzOS41IDM5LjUgMCAwIDAtMjAuOTggOC45MnoiIGZpbGw9IiNjMGRjZWUiIGZpbGwtb3BhY2l0eT0iMC4yNSIgdHJhbnNmb3JtPSJyb3RhdGUoMjcwIDY0IDY0KSIvPjxwYXRoIGQ9Ik0zOC41MiAzMy4zN0wyMS4zNiAxNi4yQTYzLjYgNjMuNiAwIDAgMSA1OS41LjE2djI0LjNhMzkuNSAzOS41IDAgMCAwLTIwLjk4IDguOTJ6IiBmaWxsPSIjYzBkY2VlIiBmaWxsLW9wYWNpdHk9IjAuMjUiIHRyYW5zZm9ybT0icm90YXRlKDMxNSA2NCA2NCkiLz48YW5pbWF0ZVRyYW5zZm9ybSBhdHRyaWJ1dGVOYW1lPSJ0cmFuc2Zvcm0iIHR5cGU9InJvdGF0ZSIgdmFsdWVzPSIwIDY0IDY0OzQ1IDY0IDY0OzkwIDY0IDY0OzEzNSA2NCA2NDsxODAgNjQgNjQ7MjI1IDY0IDY0OzI3MCA2NCA2NDszMTUgNjQgNjQiIGNhbGNNb2RlPSJkaXNjcmV0ZSIgZHVyPSIxMjgwbXMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIj48L2FuaW1hdGVUcmFuc2Zvcm0+PC9nPjwvc3ZnPg==");
    spinner.setAttribute("id", `loader-${randomId}`);
    spinner.style.left = "50%";
    spinner.style.position = "fixed";
    spinner.style.background = "#FFFFFF";
    spinner.style.borderRadius = "50%";
    spinner.style.width = "30px";
    spinner.style.zIndex = "200";
    spinner.style.marginLeft = "-15px";
    spinner.style.top = "120px";
    return spinner;
}

export { encodeStyles, perform3DS2Challenge, performDcc };
