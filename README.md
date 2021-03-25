# forge-dataviz-iot-reference-app

![Application](docs/dataviz-intro.jpg)

This sample application demonstrates the functionality of the Forge Data Visualization extension. To learn more about the extension and the features it offers, check out https://forge.autodesk.com/en/docs/dataviz/v1/developers_guide/introduction/overview/.

## Directory Structure

    .
    ├── assets                  # Static svg and png files
    ├── client                  # Client-side code + configuration
    ├── docs                    # Additional documentation on how to upload a Revit model, setup Azure etc.
    ├── scss                    # SCSS files
    ├── server                  # Server-side configuration - router, sample synthetic/CSV data
    ├── shared                  # Config files shared between client and server
    ├── tools                   # Tools to use in your own webpack file
    ├── package.json
    ├── webpack.config.js
    ├── LICENSE
    └── README.md

## Setup

### Prerequisite

To successfully run this _IoT Reference App_, you need a _Forge account_. To setup your Forge account, simply follow [this step-by-step tutorial](https://forge.autodesk.com/developer/start-now/signup).

### Running the reference app

You can find a comprehensive steps of setting up this _IoT Reference App_ in [this Forge developer's guide](https://forge.autodesk.com/en/docs/dataviz/v1/developers_guide/quickstart/running_the_application/).

## Advanced Users

### Customization options

If you'd like to add your own customization on top of our baseline, then you can easily do so by modifying the following files:

-   _custom.scss_ : Override or add custom styling to your application.
-   _client/pages/CustomPage.jsx_ : Create a custom page for your application.
-   _server/CustomRouter.js_ : Override or add new API routes.

## Further Reading

API Reference - https://forge.autodesk.com/en/docs/dataviz/v1/reference/Core/

## License

This sample app uses an [MIT License](LICENSE)
