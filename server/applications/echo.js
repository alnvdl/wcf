const {Application, Response, ErrorResponse} = require("../application");

class Echo extends Application {
    constructor() {
        super("echo", "Echoes back things");
        this.registerCommand("[...]",
            this.doEcho,
            "Echoes back whatever the user says");
    }

    async doEcho(ctx, args) {
        return new Response(args.join(" "));
    }

}

module.exports = Echo;
