class Response {
    constructor(message = "", value = null) {
        this.error = 0;
        this.message = message;
        this.value = value;
    }
}
module.exports.Response = Response;

class ErrorResponse extends Response {
    constructor(message = "", value = null) {
        super(message, value);
        this.error = 1;
    }
}
module.exports.ErrorResponse = ErrorResponse;

COMMAND_TIMEOUT = 60 * 1000; // 60 seconds

class Application {
    constructor(name, doc = "") {
        if (!name) throw new Error("Application must have a name");
        this.name = name;
        this.doc = doc;
        this.commands = {
            "help": {handler: this.help, doc: ""}
        }
        this._registry = null;
    }

    _timeout(sec) {
        return new Promise((_, reject) => {
            setTimeout(reject, sec, "Command execution timed out");
        });
    }

    _isParameter(str) {
        return str.match(/\[(.*?)\]/) !== null
    }

    _match_and_extract(cmd, args) {
        var cmd_parts = (cmd === "")? [] : cmd.split(" ");
        if (cmd_parts[cmd_parts.length - 1] !== "[...]" &&
            cmd_parts.length != args.length) {
            return {match: false, cmd: cmd, args: []};
        }
        var actual_args = [];
        for (var i = 0; i < args.length; i++) {
            var arg = args[i];
            var expected = cmd_parts[i];
            if (expected === "[...]") {
                actual_args.push(args.slice(i));
                break;
            }
            else if (this._isParameter(expected)) {
                actual_args.push(arg);
            } else if (arg != expected) {
                return {match: false, cmd: cmd, args: []};
            }
        }
        return {match: true, cmd: cmd, args: actual_args};
    }

    getRegistry() {
        return this._registry;
    }

    setRegistry(registry) {
        this._registry = registry;
    }

    getName() {
        return this.name;
    }

    getDoc() {
        return this.doc;
    }

    registerCommand(syntax, handler, doc="") {
        if (syntax == "help") {
            throw new Error("'help' subcommand is reserved")
        }
        this.commands[syntax] = {handler, doc}
    }

    getApplicationUtils(appName) {
        if (this._registry === null) {
            throw new Error("This application is not yet registed with a registry")
        }
        return this._registry.getApplicationUtils(appName);
    }

    async help(ctx, params_only = false) {
        var str = ""
        if (!params_only) {
            str += `${this.name}: ${this.doc}\n`;
            str += `Possible variations:\n`
        }
        Object.keys(this.commands).forEach(cmd => {
            if (cmd === "help") return;
            let cmddoc = this.commands[cmd].doc;
            if (cmd) cmd = " " + cmd;
            str += `    ${this.name}${cmd}: ${cmddoc}\n`
        });
        return new Response(str.replace(/\s+$/, ""));
    }

    async run(ctx, args) {
        var cmds = Object.keys(this.commands);
        var cmdmatch;
        for (var i = 0; i < cmds.length; i++) {
            cmdmatch = this._match_and_extract(cmds[i], args);
            if (cmdmatch.match) break;
        }

        if (cmdmatch.match) {
            var handler = this.commands[cmdmatch.cmd].handler;
            if (!handler) {
                return new ErrorResponse("Error executing command: could not find handler")
            }
            return await Promise.race([
                this._timeout(COMMAND_TIMEOUT),
                handler.call(this, ctx, ...cmdmatch.args)
            ]);
        } else {
            var helpstr = await this.help(ctx, true);
            return new ErrorResponse("Invalid arguments. Try one of the following instead:\n" + helpstr.message)
        }
    }
}
module.exports.Application = Application;

class ApplicationRegistry {
    constructor() {
        this.applications = {}
    }

    getApplication(appName) {
        if (!this.applicationExists(appName)) {
            throw new Error("Application not registered: " + appName);
        }
        return this.applications[appName];
    }

    registerApplication(app) {
        let appName = app.getName();
        if (app.getRegistry() !== null) {
            throw new Error("This application is already registered with another registry");
        }
        if (this.applicationExists(appName)) {
            throw new Error("Application already registered: " + appName);
        }
        app.setRegistry(this);
        this.applications[appName] = app;
    }

    getApplicationUtils(appName) {
        if (!this.applications[appName]) {
            throw new Error(`The application '${appName}' is not yet registed with this registry`);
        }
        let utils = this.applications[appName].constructor.Utils;
        if (!utils) {
            throw new Error(`The application '${appName}' does not provide a utils facility`);
        }
        return utils;
    }

    applicationExists(appName) {
        return this.applications[appName] !== undefined;
    }

    getAllApplications() {
        return this.applications;
    }

}
module.exports.ApplicationRegistry = ApplicationRegistry;
