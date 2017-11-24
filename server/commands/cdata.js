const {Command, Response, ErrorResponse} = require("../command");

class ClientDataCommand extends Command {
    constructor() {
        super("cdata", "Manage client data");
        this.registerSubCommand("",
            this.show,
            "Show client data");
        this.registerSubCommand("clear",
            this.clear,
            "Clear all client data");
    }

    async show(ctx) {
        return new Response(JSON.stringify(ctx.getAllClientData()), ctx.getAllClientData());
    }

    async clear(ctx) {
        ctx.deleteAllClientData();
        return new Response("Client data succesfully cleared.")
    }
}

module.exports.ClientDataCommand = ClientDataCommand;
