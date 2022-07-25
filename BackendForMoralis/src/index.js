require("dotenv").config();
const app = require("./app");
var server = require('http').createServer(app);

const port = process.env.PORT || 6100;

server.listen(port, () => console.log(`Listening on port ${port}..`));
