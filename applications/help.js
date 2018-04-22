module.exports = function (Application) {

return class Help extends Application {
    constructor() {
        super("help", "Helping people help themselves");
        this.registerCommand("",
            this.general_help,
            "Shows the list of all commands available");
    }

    async general_help(ctx) {
        if (!this.getRegistry()) {
            return new Application.ErrorResponse("Help command not registed with a registry");
        }

        var out = "Available commands:\n"
        var allCommands = this.getRegistry().getAllApplications();
        Object.keys(allCommands).sort().forEach(cmdName => {
            let handler = allCommands[cmdName];
            out += `    ${cmdName}: ${handler.getDoc()}\n`
        });
        return new Application.Response(out.trim());
    }
}

}
