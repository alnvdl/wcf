const fs = require("fs");
const path = require("path");

const {ApplicationRegistry} = require("./server/application");
const {Database} = require("./server/database");
const {Server} = require("./server/server");

const {Login} = require("./server/commands/login");
const {ClientData} = require("./server/commands/cdata");
const {Fika} = require("./server/commands/fika");
const {Sleep} = require("./server/commands/sleep");
const {Terminal} = require("./server/commands/terminal");
const {Email} = require("./server/commands/email");
const {Help} = require("./server/commands/help");

const ADDRESS = "0.0.0.0";
const PORT = 8080;
const DB_FILE = path.resolve("./db.json");
const PAGE = fs.readFileSync("./client/webcli.html", {encoding: "utf-8"});

var db = new Database(DB_FILE);
var registry = new ApplicationRegistry();
registry.registerApplication(new Login());
registry.registerApplication(new ClientData());
registry.registerApplication(new Fika());
registry.registerApplication(new Sleep());
registry.registerApplication(new Terminal());
registry.registerApplication(new Email());
registry.registerApplication(new Help());
var server = new Server(registry, db, ADDRESS, PORT, PAGE);
server.start();
