import {
  handleInitiateAuthentication,
  ChallengeWindowSize
} from "globalpayments-3ds";

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

export { encodeStyles, perform3DS2Challenge };
