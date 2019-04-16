# Payer Collection Form

The Payer Collection Form consists of a helper file and React components for collecting payer data for the payment services (Realex APM service, for example).

## Prerequisites

[Node.js](http://nodejs.org/) >= 6 must be installed. You can download Node [directly](https://nodejs.org/) or use a Node version manager (recommended) like [nvm](https://github.com/creationix/nvm) or [nvm-windows](https://github.com/coreybutler/nvm-windows).

This project was bootstrapped with [nwb](https://github.com/insin/nwb). nwb may need to be installed globally in order to run the scripts - refer to their docs for more instructions.

Requires packages from Touchnet's private registry. Refer to [tn-common-web](https://pdsource.ks.touchnet.com:8443/!/#tn-common-web/view/head/trunk) for configuring that.

## Installation

With Node installed, run `npm install` from the project directory to download and install all the dependencies listed in the `package.json`.

## Demo Development Server

- `npm start` will run a development server with the component's demo app at [http://localhost:3000](http://localhost:3000) with hot module reloading.

## Running Tests

- `npm test` will run the tests once.

- `npm run test:coverage` will run the tests and produce a coverage report in `coverage/`.

- `npm run test:watch` will run the tests on every change.

## Building

- `npm run build` will build the component for publishing to npm and also bundle the demo app.

- `npm run clean` will delete built resources.
