const { app, router } = require("./app.js");
app.use(router);
const server = require("http").createServer(app);
if (process.env.AZURE_IOT_HUB_EVENT_HUB_CONNECTION_STRING) {
    require("./RealTimeApi.js").createSocketIOServer(server);
}

const PORT = process.env.PORT || 9000;

async function start() {
    try {
        server.listen(PORT, () => {
            console.log(`http://localhost:${PORT}`);
        });
    } catch (error) {
        console.log(error);
    }
}

start();
