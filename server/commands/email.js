const {Command, Response, ErrorResponse} = require("../command");
const {LoginCommand} = require("./login");

class EmailCommand extends Command {
    constructor() {
        super("email", "Email settings management");
        this.registerSubCommand("set [address]",
            this.set,
            "Configure an email address for notifications");
        this.registerSubCommand("unset",
            this.unset,
            "Unset a previously configured email address");
        this.registerSubCommand("list [users]",
            this.list,
            "List email addresses for a comma-separated list of [users]");
    }

    async set(ctx, address) {
        let user = await this.getCommandUtils("login").getLoggedInUser(ctx)
        if (!user) return this.getCommandUtils("login").notLoggedIn();

        let addresses = ctx.getData("addresses", {});
        // TODO: validate email addresses before setting
        addresses[user] = address;
        await ctx.setData("addresses", addresses);
        return new Response(`Changed email address to '${address}'.`, address);
    }

    async unset(ctx) {
        let user = await this.getCommandUtils("login").getLoggedInUser(ctx)
        if (!user) return this.getCommandUtils("login").notLoggedIn();

        let addresses = ctx.getData("addresses", {});
        delete addresses[user];
        await ctx.setData("addresses", addresses);
        return new Response(`Unset email address for user '${user}'.`, user);
    }

    async list(ctx, users) {
        let user = await this.getCommandUtils("login").getLoggedInUser(ctx)
        if (!user) return this.getCommandUtils("login").notLoggedIn();

        var addresses = await ctx.getData("addresses", {});

        var users = users.split(",");
        var resolved = [];
        var unresolved = [];
        users.forEach(user => {
            user = user.trim();
            if (addresses[user]) resolved.push([user, addresses[user]]);
            else unresolved.push(user);
        })

        var out = "";
        if (resolved.length) {
            out = "Resolved email addresses:\n"
            out += "User\t\tAddress\n"
            resolved.forEach(([user, address]) => {
                out += `${user}\t\t${address}\n`;
            });
        }
        if (unresolved.length) {
            if (resolved.length) out += "\n"
            out += "Unresolved email addresses:\n"
            out += unresolved.join(", ");
        }
        return new Response(out.trim(), {resolved, unresolved});
    }
}

module.exports.EmailCommand = EmailCommand;
