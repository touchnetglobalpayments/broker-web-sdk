function parseUrl(url) {
  // Returns an object of the URL query string after the fragment ('#')
  // Currently, we're URL-encoding the fragment - not sure if it's
  // necessary but that's how the server sends it
  const fragment = decodeURIComponent(new URL(url).hash.slice(1));
  const keyPairs = fragment.split("&");
  let params = {};
  for (var i = keyPairs.length - 1; i >= 0; i--) {
    const [key, value] = keyPairs[i].split("=");
    // Check if the key is itself an object with members (e.g. 'style.color')
    const obj = key.split(".");
    // Right now only support one nested object
    if (obj.length === 2) {
      let subObject = {};
      subObject[obj[1]] = value;
      params[obj[0]] = subObject;
    } else {
      params[key] = value;
    }
  }
  return params;
}

function getPaymentUrl() {
  // The URL of the PaymentSession should be in the browser window's URL
  // as a "fragment" - the part after the '#'.
  // parseUrl();
  const fragment = new URL(window.location).hash.slice(1);
  const elems = fragment.split("&");
  return elems[0];
}

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

export { parseUrl, encodeStyles };
