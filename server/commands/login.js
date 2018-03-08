const {Application, Response, ErrorResponse} = require("../application");

class Login extends Application {
    constructor() {
        super("login", "User account management");
        this.registerCommand("",
            this.whoami,
            "Print the username of who is currently logged in");
        // FIXME: ordering is important here (because otherwise it
        // would check if user bye exists). It shouldn't be order
        // dependent, and literal matches should have precedence.
        this.registerCommand("bye",
            this.logout,
            "Log out")
        this.registerCommand("[username]",
            this.isthere,
            "Verify if user [username] exists")
        this.registerCommand("[username] [password]",
            this.dologin,
            "Attempt to login with [username] and [password]")
        this.registerCommand("change password to [newPassword]",
            this.changepassword,
            "Change the user password to [newPassword]")
    }

    async whoami(ctx) {
        var username = ctx.getClientData("username");
        var password = ctx.getClientData("password");

        var credentials = await ctx.getData("credentials", {});
        if (username && password && credentials[username] === password) {
            return new Response(`Logged in as '${username}'`, username)
        } else {
            if (username === undefined) {
                return new ErrorResponse(`Not logged in.`);
            }
            return new ErrorResponse(`Not logged in.\nAttempted ` +
            `login with username '${username}', but it does not ` +
            `exist or password is wrong`)
        }
    }

    async isthere(ctx, username) {
        var credentials = await ctx.getData("credentials", {});
        if (credentials[username] !== undefined) {
            return new Response(`Username '${username}' exists.`, username);
        } else {
            return new ErrorResponse(`Username '${username}' does not exist.`);
        }
    }

    async dologin(ctx, username, password) {
        var credentials = await ctx.getData("credentials", {});
        if (credentials[username] === password) {
            ctx.setClientData("username", username);
            ctx.setClientData("password", password);
            return new Response(`Logged in as '${username}'`, username)
        } else {
            return new ErrorResponse(`Login failed.\nAttempted ` +
            `login with username '${username}', but it does not ` +
            `exist or password is wrong.`)
        }
    }

    async changepassword(ctx, newPassword) {
        var username = ctx.getClientData("username");
        var currentPassword = ctx.getClientData("password");

        if (newPassword.length < 10) {
            return new ErrorResponse(`Password must be at least 10 characters long.`);
        }

        if (username === undefined) {
            return new ErrorResponse(`Not logged in.`);
        }

        var credentials = await ctx.getData("credentials", {});
        if (credentials[username] === currentPassword) {
            credentials[username] = newPassword;
            await ctx.setData("credentials", credentials);
            // Logout the user after the password is changed
            ctx.deleteClientData("username");
            ctx.deleteClientData("password");
            return new Response("Password succesfully changed.\n" +
                "You have been logged out, please login with your new password.", username)
        } else {
            return new ErrorResponse(`Login failed.\nAttempted ` +
            `login with username '${username}', but it does not ` +
            `exist or password is wrong.`)
        }
    }

    async logout(ctx) {
        var username = ctx.getClientData("username");
        var password = ctx.getClientData("password");

        var credentials = await ctx.getData("credentials", {});
        if (username && credentials[username] === password) {
            ctx.deleteClientData("username");
            ctx.deleteClientData("password");
            return new Response(`Logged out!`);
        } else {
            return new ErrorResponse(`Not logged in.`);
        }
    }
}

var LoginUtils = {
    getLoggedInUser: async function(ctx) {
        var loggedIn = await ctx.runCommand("login");
        return loggedIn.error? false : loggedIn.value;
    },

    getUser: async function(ctx, username) {
        var user = await ctx.runCommand("login " + username);
        return user.error? false : user.value;
    },

    userDoesNotExit: function() {
        return new ErrorResponse("The user you referred to does not exist.")
    },

    notLoggedIn: function() {
        return new ErrorResponse("Please login first.")
    }
}

Login.Utils = LoginUtils;
module.exports.Login = Login;
