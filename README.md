# WebCLIFramework

You know when you want to write a very simple web application for a small team
of people, but then you give up when you think about all the effort that will
be required just to have a minimally decent user interface and database setup?

WebCLIFramework (WCF) is a minimalist framework for those cases. It allows you
to build command line applications that run in the browser, without having to
worry about user interfaces, database integration or dependency management.

It provides you with:
- a simulated **terminal**
- a very easy-to-use **framework** for writing the applications
- a **web server** for providing this terminal and for running applications
- a really stupid JSON-based **database**

It does **not** provide you:
- any performance guarantees (we trade performance for ease of development)
- any data integrity (it's just JSON dumped into a file)
- any scalability (but it should work fine for not-so-small teams)
- any security (passwords are plain text, and the server is HTTP-only)

The idea is that WCF be used for simple intranet applications in trusted
environments.

## Getting started

Just make sure you have [NodeJS 8+](https://nodejs.org/) installed, then
download or clone this repository and run:
```sh
$ node main.js
```

That's it. No installation, no database configuration, no nothing. Just point
your browser to [http://localhost:8080](http://localhost:8080) and enjoy. Start
by running `help`.

You can find some example applications in `server/commands`. The most
interesting application right now is a
[fika](https://en.wikipedia.org/wiki/Fika_%28Sweden%29) management application,
which is the main reason WCF was written in the first place.

Some commands may run just fine without logging in, but others may require you
to login. For that, create (or edit) the file `db.json` in the project root:
```json
{
    "login": {
        "credentials": {
            "user1": "mypassword",
            "user2": "anotherpassword"
        }
    }
}
```

Restart the server and you will be able to login with different users and try
applications that require logging in. In the future, there will be commands for
populating the login database.

## Core concepts

An application is defined as one or more commands, grouped under a namespace.
For example, the `sleep` application has one command registered, which allows
the user to specify a number of seconds to wait.

Every command always runs in the server, even the simplest ones. After commands
are executed, applications may choose to store data on the client (client data).

Whenever client data is set, it is always sent back to the server with every
command you run, for all applications. However, an application can only read
client data belonging to its namespace. That allows easy integration between
applications. This mechanism can be used to make sure a user is logged in when
running the `email` application, for example. It can also be used to set some
terminal display preference (e.g.: color output).

Database data works the same way, but it's stored on the server side.
Applications can only read their own data, and all data is persisted to the
disk at regular intervals. All data read/written from/to the database is copied
from/to the in-memory representation, to make sure applications don't
accidentaly bypass the database read/write mechanism.

Since an application cannot read client data (or database data) belonging to
another application, the only way for it to obtain information from another
applications is to run commands on behalf of the user. For example, if the
`email` application needs to know the name of the user who's logged in, it can
run the `login` command, which will return whether an user is logged in and
what's their username. When a command from applicaiton X runs another command
from application Y, the framework manages all client data and database access
permissions.

### Command execution

When the server receives a command request and some client data (via a `POST`
to `/commands`), it will lookup its registered applications (based on the first
token of the command). It will then create a `Context` object, which is
responsible for providing isolation: the application will have to use this
object to get access to both client data and the database.

Contexts isolate applications, so a command can only access client data and
database data which belongs to it. Any attempt to get data that belongs to
another command should be done via the `Context.runCommand` call, which will
spawn a new execution `Context` for that command, with proper permissions.

For example, the `email` application allows one to register their email address
in the database, but only if they are logged in. For that, it needs to ask the
`login` command if that user is logged in -- and the `login` command must
provide a suitable command for that task. The `email` command never gets
access to `login` data. The main reason for this is not really security but
really for isolation, to prevent nasty bugs from inter-command interaction.
Since everything is written in JavaScript, a malicious application could just
take a walk anywhere it fancies, so be careful with your applications.

### Code base
The entire code base is really simple, so let's just describe what each file
does:

- `server/application.js`: contains the base class for applications (`Application`),
and also an application registry (`ApplicationRegistry`);
- `server/context.js`: contains the `Context` class, responsible for handling command
execution;
- `server/database.js`: a silly JSON-based database (calling it a database may
actually be too much of a compliment);
- `server/server.js`: a frameworkless HTTP server for receiving command requests and
serving our static page;
- `server/applications/*`: the core applications;
- `client/webcli.html`: a simulated (not emulated!) terminal;
- `main.js`: ties everything together by creating a database, registering
applications and starting the server;
- `applications.json`: lists the applications that should be loaded;

#### Core applications
These are the 6 core applications:
- cdata: manage client data
- email: allows the configuration of email addresses
- help: show system-wide help
- login: manages user accounts
- sleep: just sleeps
- terminal: allows customization of the simulated terminal

These applications are like any other application, they don't have any special
powers. If you don't like `login` or `help`, feel free to write your own.

## Writing an application

Let's go through the echo application, that simply echoes back whatever the
user says.

```js
const {Application, Response, ErrorResponse} = require("../application");

class EchoApplication extends Application {
    constructor() {
        super("echo", "Echoes back things");
        this.registerCommand("[...]",
            this.doEcho,
            "Echos back whatever the user says");
    }

    async doEcho(ctx, ...args) {
        return new Response(JSON.stringify(ctx.getAllClientData()), ctx.getAllClientData());
    }

    async clear(ctx) {
        ctx.deleteAllClientData();
        return new Response("Client data succesfully cleared.")
    }
}

module.exports.ClientDataCommand = ClientDataCommand;
```
