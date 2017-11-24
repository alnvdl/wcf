const {Command, Response, ErrorResponse} = require("../command");
const {LoginCommand} = require("./login");

class FikaCommand extends Command {
    constructor() {
        super("fika", "Serious business fika management");
        this.registerSubCommand("start",
            this.start,
            "Start a fika session hosted by you");
        this.registerSubCommand("end",
            this.end,
            "End a fika session being hosted by you");
        this.registerSubCommand("status",
            this.status,
            "Show the status of all current fika sessions");
        this.registerSubCommand("join",
            this.status,
            "Show currently open fika sessions");
        this.registerSubCommand("join [who]",
            this.join,
            "Join a fika session being hosted by someone ([who])");
        this.registerSubCommand("leave",
            this.leave_list,
            "Show fika sessions you're currently participating in");
        this.registerSubCommand("leave [who]",
            this.leave,
            "Leave a fika session being hosted by someone ([who])");
        this.registerSubCommand("next",
            this.next,
            "Show who is responsible for the next fika");
        this.registerSubCommand("history",
            this.history,
            "Show all previous fika sessions");
        this.registerSubCommand("balances",
            this.balances,
            "Shows the balances of all users");

    }

    getSessionString(session, host, indentLevel=0) {
        let out = "";

        out += `Host: ${host}\n`
        out += `started at ${(new Date(session.startDate)).toLocaleString()}\n`;
        if (session.endDate) {
            out += `ended at ${(new Date(session.endDate)).toLocaleString()}\n`;
        }
        let allParticipants = [`${host} (host)`].concat(session.participants);
        out += `Participants: ${allParticipants.join(", ")}\n`

        let indentStr = "    ".repeat(indentLevel);
        if (indentLevel) {
            out = out.replace(/\n/g, "\n" + indentStr)
        }

        return indentStr + out.trim();
    }

    async status(ctx) {
        var sessions = await ctx.getData("sessions", {});

        var currentSessions = Object.keys(sessions);

        if (currentSessions.length == 0) {
            return new Response("There are currently no fika sessions being hosted");
        }

        var out = "Currently open fika sessions:\n";
        currentSessions.forEach(session => {
            let sessionObj = sessions[session];
            out += this.getSessionString(sessionObj, session, 1) + "\n\n";
        });
        return new Response(out.trim());
    }

    async start(ctx) {
        let user = await this.getCommandUtils("login").getLoggedInUser(ctx)
        if (!user) return this.getCommandUtils("login").notLoggedIn();

        var sessions = await ctx.getData("sessions", {});
        if (user in sessions) {
            return new ErrorResponse("You already have a fika session under your name. Please end it first.");
        }
        sessions[user] = {
            startDate: new Date(),
            participants: []
        }
        await ctx.setData("sessions", sessions);
        ctx.deleteClientData("reallyEnd");
        return new Response(`Session started!\n` +
            `Tell people in your fika to login and run the 'fika join ${user}' command.`);
    }

    async leave_list(ctx) {
        let user = await this.getCommandUtils("login").getLoggedInUser(ctx);
        if (!user) return this.getCommandUtils("login").notLoggedIn();

        var sessions = await ctx.getData("sessions", {});

        var mySessions = Object.keys(sessions).filter(session => {
            return sessions[session].participants.includes(user);
        });

        if (mySessions.length == 0) {
            return new Response("You are not currently part of any fika sessions");
        }

        var out = "Fika sessions you are currently a part of:\n";
        mySessions.forEach(session => {
            let startDate = new Date(sessions[session].startDate);
            out += `    ${session}: started at ${startDate.toLocaleString()}\n`;
        });
        return new Response(out.trim());
    }

    async join(ctx, who) {
        let user = await this.getCommandUtils("login").getLoggedInUser(ctx);
        if (!user) return this.getCommandUtils("login").notLoggedIn();
        let host = await this.getCommandUtils("login").getUser(ctx, who);
        if (!host) return this.getCommandUtils("login").userDoesNotExit();

        if (user === host) {
            return new ErrorResponse(`You cannot join your own fika session`);
        }
        var sessions = await ctx.getData("sessions", {});
        var session = sessions[host];
        if (!session) {
            return new ErrorResponse(`User ${host} is not currently hosting a fika session`);
        }
        if (session.participants.includes(user)) {
            return new ErrorResponse(`You are already in the fika session hosted by ${host}`);
        }
        session.participants.push(user);
        await ctx.setData("sessions", sessions);

        return new Response(`You joined the fika session hosted by ${host}!`);
    }

    async leave(ctx, who) {
        let user = await this.getCommandUtils("login").getLoggedInUser(ctx);
        if (!user) return this.getCommandUtils("login").notLoggedIn();
        let host = await this.getCommandUtils("login").getUser(ctx, who);
        if (!host) return this.getCommandUtils("login").userDoesNotExit();

        if (user === host) {
            return new ErrorResponse(`You cannot leave your own fika session, end it instead`);
        }
        var sessions = await ctx.getData("sessions", {});
        var session = sessions[host];
        if (!session) {
            return new ErrorResponse(`User ${host} is not currently hosting a fika session`);
        }
        if (!session.participants.includes(user)) {
            return new ErrorResponse(`You are not part of the fika session hosted by ${host}`);
        }
        session.participants.splice(session.participants.indexOf(user), 1);
        await ctx.setData("sessions", sessions);

        return new Response(`You left the fika session hosted by ${host}!`);
    }

    async end(ctx) {
        let user = await this.getCommandUtils("login").getLoggedInUser(ctx);
        if (!user) return this.getCommandUtils("login").notLoggedIn();

        var sessions = await ctx.getData("sessions", {});
        var session = sessions[user];
        if (!session) {
            return new ErrorResponse(`You are not currently hosting a fika session`);
        }

        if (session.participants.length == 0) {
            delete sessions[user];
            await ctx.setData("sessions", sessions);
            return new Response("Session ended!\n" +
            "Since your fika session had no participants, it was not logged and no funds transfer took place.")
        }

        if (!ctx.getClientData("reallyEnd")) {
            ctx.setClientData("reallyEnd", true);
            return new Response(`After you end a section, funds will be transferred and it will be added to the history.\n` +
            `Warning: ending a session is an irreversible action.\n` +
            `To really end this session, please confirm the details below run the 'fika end' command again:\n\n` +
            this.getSessionString(session, user, 1));
        } else {
            ctx.deleteClientData("reallyEnd");

            var balances = await ctx.getData("balances", {});
            if (!balances[user]) balances[user] = 0;
            let total = 0;
            session.participants.forEach(participant => {
                if (!balances[participant]) balances[participant] = 0;
                balances[user]++;
                balances[participant]--;
                total++;
            });

            var history = await ctx.getData("history", []);
            session.host = user;
            session.endDate = new Date();
            history.push(session);
            delete sessions[user];

            await ctx.setData("sessions", sessions);
            await ctx.setData("history", history);
            await ctx.setData("balances", balances);

            return new Response(`Session ended! Your balance has increased by ${total}.\n`+
            `This is the session as it has been logged to the history:\n\n`+
            this.getSessionString(session, user, 1));
        }
    }

    async balances(ctx) {
        var balances = await ctx.getData("balances", {});
        let out = "Current fika balances:\n";
        Object.keys(balances).forEach(user => {
            out += `    ${user}\t\t${balances[user]}\n`
        });
        return new Response(out.trim(), balances);
    }

    async history(ctx) {
        let history = await ctx.getData("history", []);
        if (history.length == 0) {
            return new Response("There is no fika session history.", history);
        }
        let out = "Previous fika sessions (at most 5 are shown):\n";
        history.slice(-5).forEach(session => {
            out += this.getSessionString(session, session.host, 1) + "\n\n";
        });
        return new Response(out.trim(), history);
    }

    async next(ctx) {
        var balances = await ctx.getData("balances", {});
        balances = Object.entries(balances);

        // Sort by balance
        balances.sort((a, b) => {
            return a[1] - b[1];
        });

        // Group by balance
        var groups = {};
        balances.forEach(([user, balance]) => {
            if (balance in groups) groups[balance].push(user);
            else groups[balance] = [user];
        });

        // Sort groups alphabetically and flatten everything
        var nextList = []
        Object.keys(groups)
            .sort((a, b) =>  a - b)
            .forEach(balance => {
            groups[balance].sort().forEach(user => {
                nextList.push([user, balance]);
            });
        });

        var out = "Next fika hosts:\n"
        out += "    User\t\tBalance\n"
        nextList.forEach(([user, balance]) => {
            out += `    ${user}\t\t${balance}\n`;
        });

        return new Response(out.trim(), nextList);
    }
}

module.exports.FikaCommand = FikaCommand;
