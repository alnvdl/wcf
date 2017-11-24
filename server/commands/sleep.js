const {Command, Response, ErrorResponse} = require("../command");

class SleepCommand extends Command {
    constructor() {
        super("sleep", "Just sleep");
        this.registerSubCommand("[sec]",
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

module.exports.SleepCommand = SleepCommand;
