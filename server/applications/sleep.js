const {Application, Response, ErrorResponse} = require("../application");

class Sleep extends Application {
    constructor() {
        super("sleep", "Just sleep");
        this.registerCommand("[sec]",
            this.sleep,
            "Sleep for [sec] seconds.");
    }

    async do_sleep(sec) {
        return new Promise((resolve, reject) => {
            setTimeout(resolve, sec * 1000);
        });
    }

    async sleep(ctx, sec) {
        await this.do_sleep(sec);
        return new Response("");
    }
}

module.exports = Sleep;
