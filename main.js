const fs = require("fs");
const path = require("path");
const settings = require("./settings.json")

const {ApplicationRegistry} = require("./server/application");
const {Database} = require("./server/database");
const {Server} = require("./server/server");

const page = fs.readFileSync("./client/webcli.html", {encoding: "utf-8"});

var db = new Database(path.resolve(settings.db_file));
var registry = new ApplicationRegistry();

settings.apps.forEach(app => {
    cls = require("./server/applications/" + app);
    registry.registerApplication(new cls());
});

var server = new Server(registry, db, settings.address, settings.port, page);
server.start();
