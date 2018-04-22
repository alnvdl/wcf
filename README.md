# WebCLIFramework

WebCLIFramework is a minimalist web-based CLI framework.

Do you sometimes want to build a very simple web application for a small team
of people, but then give up just thinking about all the effort that will be
required to have a minimally decent user interface and a database setup?

WebCLIFramework (WCF) is a minimalist framework for those cases. It allows you
to build command line applications for browsers, without having to worry about
user interfaces, database integration or dependency management.

It provides you with:
- a simulated **terminal** with a command line interface for applications
- a very easy-to-use **framework** for writing applications
- a really stupid JSON-based **database**
- a **web server** to deliver it all

It does **not** provide you:
- any performance guarantees (we trade performance for ease of development)
- any data integrity (it's just JSON dumped into a file)
- any scalability (but it should work fine for not-so-small teams)
- any security (passwords are plain text, and the server is HTTP-only)

The idea is that WCF be used for simple intranet applications in trusted
environments, with users who are comfortable with CLIs.

## Getting started

Just make sure you have [NodeJS 8+](https://nodejs.org/) installed, then
download or clone this repository and run:
```sh
$ node main.js
```

That's it. No installation, no database configuration, no nothing. Just point
your browser to [http://localhost:8080](http://localhost:8080) and enjoy. You
can start by running `help`.

You can find some sample applications in the `applications` directory. The
most interesting application right now is outside this repository. It
is a [fika](https://en.wikipedia.org/wiki/Fika_%28Sweden%29) management
application, which is the main reason WCF was written in the first place. You
can see the code (and further instructions) for this application in its
[repository](https://github.com/alnvdl/wcf_fika).

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

Restart the server and you will be able to login with different users (e.g.:
`login user1 mypassword`) and try applications that require logging in. In the
future, there will be better ways to populate the login database.

## Core concepts

An application is defined as one or more commands. Each application has its own
isolated namespace. Commands are executed by handlers within applications. For
example, the `sleep` application has one command registered, which allows the
user to specify a number of seconds to wait.

Every command always runs in the server, even the simplest ones. When commands
are executed, they may choose to keep data on the server side (**database
data**) or on the client side (**client data**). Client data is typically used
to store  temporary state and non-important data. Database data is typically
used to store more important data, and also for sharing data between clients.

Whenever client data is set (via a command's response), it is always sent back
to the server with every command you run, for every application. However, an
application can only read client data and database data belonging to its own
namespace.

Database data works the same way, but it's stored on the server side.
Applications can only read their own data, and all data is persisted to the disk
at regular intervals in a JSON file. All data read/written from/to the database
is copied from/to the in-memory representation, to make sure applications don't
accidentaly bypass the database read/write mechanism.

Since an application cannot read client or database data belonging to another
application, the only way for it to obtain information from another application
is to run commands on behalf of the user. For example, if the `email`
application needs to know the name of the user who's logged in, it can run the
`login` command, which will return whether an user is logged in and what's their
username. When a command from applicaiton X runs another command from
application Y, the framework manages all client data and database access
permissions.

### Command execution

When the server receives a command request and some client data (via a `POST`
to `/commands`), it will lookup its registered applications (based on the first
token of the command). It will then create a `Context` object, which is
responsible for providing isolation: the application will have to use this
object to get access to both client data and the database.

Contexts isolate applications, so an application can only access client data
and database data which belongs to it. Any attempt to get data that belongs to
another command should be done via the `Context.runCommand` call, which will
spawn a new execution `Context` for that command, with proper permissions.

For example, the `email` application allows one to register their email address
in the database, but only if they are logged in. For that, it needs to ask the
`login` command if that user is logged in and the `login` command must
provide a suitable command for that task. The `email` command never gets
access to `login` data. The main reason for this is not really security but
really for isolation, to prevent nasty bugs from inter-command interactions.
Since everything is written in JavaScript and no memory isolation mechanisms
were put in place, a malicious application could just take a walk anywhere it
fancies. So be careful with your applications.

## Code base
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
- `applications/*`: the core applications;
- `client/webcli.html`: a simulated (not emulated!) terminal;
- `main.js`: ties everything together by creating a database, registering
applications and starting the server;
- `config.json`: general settings and the list of applications that should be
  loaded.

### Core applications
These are the 6 core applications:
- **cdata**: manage client data (used for development purposes)
- **email**: email address management
- **help**: show system-wide help
- **login**: manages user accounts
- **sleep**: just sleeps
- **terminal**: allows customization of the simulated terminal

These applications are like any other application, they don't have any special
powers. So if you don't like `login` or `help`, feel free to write your own.

## Writing an application

Let's go through the echo application, that simply echoes back whatever the
user says.

```js
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
```

A module representing an application must always export a factory: a function
that will receive the `Application` class from the framework, and use that to
create a new application inheriting from it.

The Application class also contain two nested classes: `Response` and
`ErrorResponse`, used to send back command responses. For both of these response
classes, you need at least the first argument to their constructor, which will
provide textual feedback to the user. The second argument can be  used to
provide a JavaScript object to be consumed by other applications. For example,
the login application responds with a human-readable message and a string with
the name of the user who's logged in (if that's the case). The human-readable
message will be shown in the simulated terminal, and the string will be used by
other applications that may need to verify who's logged in.

You must then create a class for your application. This class must call `super`
with the application command-line name and a description of what the application
does (which is used to automatically generate help messages). After the parent
class is initialized, you must register commands by using the `registerCommand`
method.

This method requires three arguments: (1) a command syntax for matching, (2) a
handler function and (3) a description of what the command does (again, for help
messages). The command syntax can be described via a few examples:

- `something`: matches a command named `something`
- `something [abc]`: matches a command named `something` with an user-provided
   argument named `abc`
- `something [abc] anotherthing [def]`: matches a command names `something`
  followed by an user-provided argument named `abc`, followed by another token
  named `anotherthing`, followed by an user-provided argument named `def`
- `something [...]`: matches a command named `something` followed by any number
  of user-provided arguments
- `[...]`: matches any number of user-provided arguments

In the command-line interface, those commands will always be prefixed by the
application name, so `something` will actually be `app something`. **Also be
careful with the order in which you register your commands.** More specific
command should come first, while more generic commands should come last.
Otherwise, the more general syntaxes will match first. Pull requests that
verify and provide hints for command registration are more than welcome.

Finally, the handler function `doEcho` is declared. It receives as the first
argument a `Context` object representing the execution context of the current
command. This object must be used to get access to client and database data. The
other arguments after the first represent command arguments. The way these
arguments are named and ordered is up to the developer, but it's recommended
that they follow the command syntax declared upon command registration.

In this example, the command handler simply concatenates all arguments in a
string and returns it, thus accomplishing its noble functionality.

To wrap it all up, make sure to export your application class.

For more advanced examples, including commands that interact with other
commands, please take a look at the core applications in `server/applications`.
The [fika application](https://github.com/alnvdl/wcf_fika) is a really good 
example which makes more extensive use of the framework.

## Loading applications
To load your application into the framework, edit the `apps` array in
`config.json` and restart the server.

Provide the import path as you would for any NodeJS module: if it's a core
application, use a relative path (`./applications/login`); if it's an external
application installed via NPM, use an regular import path (`wcf_fika/fika`).

## ToDo

- Command completion
- Primitive text formatting (colors, bold, etc)
- Terminal themes and further customizability
- A more intelligent command syntax parser: allow more types of arguments,
verify if one command is obscuring another, etc
- Allow easy database population, especially for the login command. Perhaps a
  script? Or an automatically created admin with user creation powers?
- Document application utils (basically, they are convenience functions that
  an application knows other applications will likely want to use to avoid
  code duplication, but don't quite qualify as commands).

Pull requests are welcome.
