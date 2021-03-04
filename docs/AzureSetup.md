# Setting up infrastructure on Azure

This sample application uses some services from [Azure](https://azure.microsoft.com/en-us/) and this document details the services used and how it was setup.

## Prerequisites

-   An Azure account with a valid subscription

## IoT Hub

The first service to setup is the IoT Hub service, you may use the search bar to locate the service.

1. Click add to start creating a new IoT Hub
2. In the `Basics` tab. fill in the appropriate `Subscription`\*, `Resource group`\*, `Region`\*, `IoT hub name`\*.
3. In the `Networking` tab, pick the appropriate amount of access you require.
4. In the `Size and scale` tab, pick the `Pricing and scale tier`\* and `IoT hub units`
5. In the `Tags` tab, add appropriate tags if you require any.

-   Points marked `*` cannot be changed later, pricing tiers cannot be downgraded i.e `S1` cannot be changed to `B1`

![](docs/iot-hub.png)

For more information you can refer to the [IoT Hub documentation](https://docs.microsoft.com/en-us/azure/iot-hub/)

## IoT Hub Devices

Now you have an IoT hub which you can use to [create devices](https://docs.microsoft.com/en-us/azure/iot-hub/quickstart-send-telemetry-python#register-a-device) and start pushing data to Azure with device-to-cloud messages.
The messages sent here do not persist for a very long time (7 days), the next section covers keeping messages for extended periods.

## Time Series Insight (TSI)

For persisting device data we can use TSI to store the data into a time series database for up to 400 days. So use the search bar to get to the time series page.

1. Click add to start creating a new TSI Environment
2. In the `Basics` tab. fill in the appropriate `Subscription`\*, `Resource group`\*, `Environment Name`\*, `Region`\*. For `Tier`\*, `Gen2` includes a Cold / Warm storage and `Gen1` just has a capacity slider, pick the one that best suits your needs. This repository was setup with a `Gen2` TSI environment with 20 days of warm storage.
   For choosing `Property name` you should consult [Best practices for choosing a Time Series ID](https://docs.microsoft.com/en-us/azure/time-series-insights/how-to-select-tsid).
3. Note: This step is critical for getting your TSI Environment to consume messages from IoT hub from above. In the `Event Source` tab, create a new event source with the appropriate, `IoT Hub name` (Select the one created earlier), `IoT Hub access policy name`(select service) and create a new consumer group. If you have a dedicated timestamp in your messages you can set the timestamp property as well.
4. In the `Tags` tab, add appropriate tags if you require any.

-   Points marked `*` cannot be changed later.

![](docs/tsi-env.png)

For more information you can refer to the [Time Series Insights documentation](https://docs.microsoft.com/en-us/azure/time-series-insights/)

This is the complete setup of Azure services used in this sample application.
