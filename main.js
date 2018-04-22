const path = require("path");
const config = require("./config.json")

const {Application, ApplicationRegistry} = require("./server/application");
const {Database} = require("./server/database");
const {Server} = require("./server/server");

var db = new Database(path.resolve(config.db_file));
var registry = new ApplicationRegistry();

config.apps.forEach(mod => {
    let factory = require(mod);
    let cls = factory(Application);
    registry.registerApplication(new cls());
});

var server = new Server(registry, db, config.address, config.port);
server.start();
