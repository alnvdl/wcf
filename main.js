const fs = require("fs");
const path = require("path");

const {CommandRegistry} = require("./server/command");
const {Database} = require("./server/database");
const {Server} = require("./server/server");

const {LoginCommand} = require("./server/commands/login");
const {ClientDataCommand} = require("./server/commands/cdata");
const {FikaCommand} = require("./server/commands/fika");
const {SleepCommand} = require("./server/commands/sleep");
const {TerminalCommand} = require("./server/commands/terminal");
const {EmailCommand} = require("./server/commands/email");
const {HelpCommand} = require("./server/commands/help");

const ADDRESS = "0.0.0.0";
const PORT = 8080;
const DB_FILE = path.resolve("./db.json");
const PAGE = fs.readFileSync("./client/webcli.html", {encoding: "utf-8"});

var db = new Database(DB_FILE);
var registry = new CommandRegistry();
registry.registerCommand(new LoginCommand());
registry.registerCommand(new ClientDataCommand());
registry.registerCommand(new FikaCommand());
registry.registerCommand(new SleepCommand());
registry.registerCommand(new TerminalCommand());
registry.registerCommand(new EmailCommand());
registry.registerCommand(new HelpCommand());
var server = new Server(registry, db, ADDRESS, PORT, PAGE);
server.start();
