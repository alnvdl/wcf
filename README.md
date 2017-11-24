# WebCLIFramework

You know when you want to write a very simple web application for a small team
of people, but then you give up when you think about all the effort that will
be required just to have a minimally decent interface and database setup?

WebCLIFramework (WCF) is a minimalist framework for those cases. It allows you
to build command line applications that run in the browser, without having to
worry about interfaces, database integration or dependency management.

It provides you:
- a simulated **terminal**
- a **web server** for providing this terminal and for running commands
- a very easy-to-use **framework** for writing the actual commands
- a really stupid JSON-based **database**

It does **not** provide you:
- any performance guarantees (we trade performance for ease of development)
- any data integrity (we're literally dumping JSON to a file)
- any scalability (but it should work fine for not-so-small teams)
- any security (passwords are plain text, and the server is HTTP-only)

The idea is that WCF be used for really simple intranet applications in trusted
environments.

## Getting started

This is the best part. Just make sure you have [NodeJS 8+](https://nodejs.org/)
installed, download or clone this repository and run:
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

## Some concepts

Every command always runs in the server, even the simplest ones. Commands may
choose to store data on the client.

This client data is always sent back to the server with every command you run.
Commands may then use this data to make sure a user is logged in, for example,
or to set some terminal display preference (e.g.: color output).

When the server receives a command request and some client data, it will create
a `Context` object. This object will provide isolation: the command handler
will have to use it to get access to both client data and the database.

Contexts isolate commands, so that a command can only access client data and
database data which belongs to it. Any attempt to get data that belongs to
another command should be done via a special `Context` call, which will spawn a
new execution `Context` for that subcommand, with proper permissions.

For example, the `email` command allows one to register their email address in
the database, but only if they are logged in. For that, it needs to ask the
`login` command if that user is logged in (and the `login` command must
provide) a suitable subcommand for that task. The `email` command never gets
access to `login` data. The main reason for this is not really security, but
really for isolation, to prevent nasty bugs from inter-command interaction.

*More details will be written when time allows.*
