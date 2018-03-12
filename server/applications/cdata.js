const {Application, Response, ErrorResponse} = require("../application");

class ClientData extends Application {
    constructor() {
        super("cdata", "Manage client data");
        this.registerCommand("",
            this.show,
            "Show client data");
        this.registerCommand("clear",
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

module.exports = ClientData;
