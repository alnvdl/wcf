const {Response, ErrorResponse} = require("./command");

class Context {
    constructor(registry, db, clientData) {
        this.registry = registry;
        this.db = db;
        this.clientData = clientData;
        if (!this.clientData) {
            this.clientData = {}
        }
    }

    verifyRunning() {
        if (!this.ns) throw new Error("Command not running");
    }

    getClientData(key) {
        this.verifyRunning();
        if (!this.clientData[this.ns]) return;
        return this.clientData[this.ns][key];
    }

    getAllClientData() {
        return this.clientData;
    }

    setClientData(key, value) {
        this.verifyRunning();
        if (!this.clientData[this.ns]) this.clientData[this.ns] = {};
        this.clientData[this.ns][key] = value;
    }

    deleteClientData(key) {
        this.verifyRunning();
        if (!this.clientData[this.ns]) this.clientData[this.ns] = {};
        delete this.clientData[this.ns][key];
    }

    deleteAllClientData() {
        this.verifyRunning();
        this.clientData = {};
    }

    async _lockNamespace() {
        this.verifyRunning();
        return this.db.lockNamespace(this.ns);
    }

    async _unlockNamespace() {
        this.verifyRunning();
        return this.db.unlockNamespace(this.ns);
    }

    async getData(key, defaultValue) {
        this.verifyRunning();
        return this.db.get(this.ns, key, defaultValue)
    }

    async setData(key, value) {
        this.verifyRunning();
        return this.db.set(this.ns, key, value);
    }

    async runCommand(cmd) {
        let parts = cmd.split(" ");
        let cmdName = parts[0];
        if (!this.registry.commandExists(cmdName)) {
            return new ErrorResponse(`Commmand not found: ${cmdName}`, cmdName);
        }

        // Check if a command is trying to run a subcommand that is
        // itself. This is not allowed to avoid deadlocks. More on
        // that in the comments below.
        // Commands that need to call their own functionality
        // should do it internally via function calls.
        if (this.ns === cmdName) {
            throw new Error(`Commands cannot call themselves (${cmdName} tried that)`);
        }

        // Decide which context to use for running the command.
        //
        // If this context was created outside this class and
        // runCommand was called, use `this` as the context.
        //
        // If this context was created inside this class and
        // runCommand was called from within another command, spawn
        // a new context with its own namespace.
        var ctxToUse = this;
        if (this.ns) {
            ctxToUse = new Context(this.registry, this.db, this.clientData);
        }
        ctxToUse.ns = cmdName;

        let args = parts.slice(1);
        let handler = this.registry.getCommandHandler(cmdName);

        // Only one command of a type can run at once.
        // This is a simple (and perhaps overly excessive) measure
        // to make sure database operations are isolated.
        //
        // Because of this, commands should return fast. If a
        // command must perform long operations, it should run them
        // asynchronously and return a token for retrieving the
        // result later on.
        await ctxToUse._lockNamespace();
        try {
            var rsp = await handler.run(ctxToUse, args);
        } catch (e) {
            let msg = "Details: "
            if (e && e.message) {
                msg += e.message;
            } else if (e) {
                msg += e;
            } else {
                msg = "";
            }
            if ("Stack: ", console.log(e.stack));
            rsp = new ErrorResponse(`Error running command: ${cmdName}\n${msg}`.trim(), cmdName);
        } finally {
            await ctxToUse._unlockNamespace();
        }
        if (rsp === undefined) {
            rsp = new Response();
        }
        return rsp;
    }
}

module.exports.Context = Context;
