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

class Command {
    constructor(name, doc = "") {
        if (!name) throw new Error("Command must have a name");
        this.name = name;
        this.doc = doc;
        this.subcommands = {
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

    _match_and_extract(subcmd, args) {
        var subcmd_parts = (subcmd === "")? [] : subcmd.split(" ");
        if (subcmd_parts.length != args.length) {
            return {match: false, subcmd: subcmd, args: []};
        }
        var actual_args = [];
        for (var i = 0; i < args.length; i++) {
            var arg = args[i];
            var expected = subcmd_parts[i];
            if (this._isParameter(expected)) {
                actual_args.push(arg);
            } else if (arg != expected) {
                return {match: false, subcmd: subcmd, args: []};
            }
        }
        return {match: true, subcmd: subcmd, args: actual_args};
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

    registerSubCommand(syntax, handler, doc="") {
        if (syntax == "help") {
            throw new Error("'help' subcommand is reserved")
        }
        this.subcommands[syntax] = {handler, doc}
    }

    getCommandUtils(cmdName) {
        if (this._registry === null) {
            throw new Error("This command is not yet registed with a registry")
        }
        return this._registry.getCommandUtils(cmdName);
    }

    async help(ctx, params_only = false) {
        var str = ""
        if (!params_only) {
            str += `${this.name}: ${this.doc}\n`;
            str += `Possible variations:\n`
        }
        Object.keys(this.subcommands).forEach(subcmd => {
            if (subcmd === "help") return;
            let subcmddoc = this.subcommands[subcmd].doc;
            if (subcmd) subcmd = " " + subcmd;
            str += `    ${this.name}${subcmd}: ${subcmddoc}\n`
        });
        return new Response(str.replace(/\s+$/, ""));
    }

    async run(ctx, args) {
        var subcmds = Object.keys(this.subcommands);
        var cmdmatch;
        for (var i = 0; i < subcmds.length; i++) {
            cmdmatch = this._match_and_extract(subcmds[i], args);
            if (cmdmatch.match) break;
        }

        if (cmdmatch.match) {
            var handler = this.subcommands[cmdmatch.subcmd].handler;
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
module.exports.Command = Command;

class CommandRegistry {
    constructor() {
        this.commands = {}
    }

    getCommandHandler(cmdName) {
        if (!this.commandExists(cmdName)) {
            throw new Error("Command not registered: " + cmdName);
        }
        return this.commands[cmdName];
    }

    registerCommand(handler) {
        let cmdName = handler.getName();
        if (handler.getRegistry() !== null) {
            throw new Error("This command is already registered with another registry");
        }
        if (this.commandExists(cmdName)) {
            throw new Error("Command already registered: " + cmdName);
        }
        handler.setRegistry(this);
        this.commands[cmdName] = handler;
    }

    getCommandUtils(cmdName) {
        if (!this.commands[cmdName]) {
            throw new Error(`The command '${cmdName}' is not yet registed with this registry`);
        }
        let utils = this.commands[cmdName].constructor.Utils;
        if (!utils) {
            throw new Error(`The command '${cmdName}' does not provide a utils facility`);
        }
        return utils;
    }

    commandExists(cmdName) {
        return this.commands[cmdName] !== undefined;
    }

    getAllCommands() {
        return this.commands;
    }

}
module.exports.CommandRegistry = CommandRegistry;
