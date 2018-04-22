module.exports = function (Application) {

return class Echo extends Application {
    constructor() {
        super("echo", "Echoes things back");
        this.registerCommand("[...]",
            this.doEcho,
            "Echoes back whatever the user says");
    }

    async doEcho(ctx, args) {
        return new Application.Response(args.join(" "));
    }
}

}
