module.exports = function (Application) {

return class Terminal extends Application {
    constructor() {
        super("terminal", "Terminal settings and actions");
        this.registerCommand("clear",
            this.clear,
            "Clear the terminal");
        this.registerCommand("color enable",
            this.enable,
            "Enable colors in command output");
        this.registerCommand("color disable",
            this.disable,
            "Disable colors in command output");
    }

    async clear(ctx) {
        ctx.setClientData("clear", true);
        return new Application.Response("");
    }

    async enable(ctx) {
        ctx.setClientData("color", true);
        return new Application.Response("Color output enabled.")
    }

    async disable(ctx) {
        ctx.setClientData("color", false);
        return new Application.Response("Color output disabled.")
    }
}

}
