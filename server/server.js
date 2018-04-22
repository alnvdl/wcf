const fs = require("fs");
const http = require("http");

const {Context} = require("./context");

function badRequest(res, reason="Bad Request") {
    console.log(reason);
    res.writeHead(400, "Bad Request");
    res.end();
}

function internalServerError(res, err) {
    console.error(err);
    res.writeHead(500, "Internal Server Error");
    res.end();
}

function ok(res, data=null, contentType=null) {
    if (data && contentType === null) {
        throw new Error("Cannot send data without Content-Type header");
    }
    if (data) {
        res.writeHead("200", "OK", {
            "Content-Type": contentType
        });
        res.end(data);
    } else {
        res.writeHead("200", "OK");
        res.end();
    }
}

function is_valid_command_post(req) {
    return (req.url === "/commands" &&
        req.method === "POST" &&
        req.headers["content-type"] === "application/json; charset=utf-8" &&
        req.headers["content-length"] < 8192);
}

function is_page_request(req) {
    return (req.method === "GET" && req.url === "/");
}

class Server {
    constructor(registry, db, address, port, page) {
        this.registry = registry;
        this.db = db;
        this.address = address;
        this.port = port;
        this.page = fs.readFileSync(require.resolve("../client/webcli.html"), {
            encoding: "utf-8"
        });
    }

    start() {
        const server = http.createServer((req, res) => {
            if (is_valid_command_post(req)) {
                var data = "";
                req.setEncoding("utf-8");
                req.on("error", (err) => { internalServerError(res, err); });
                req.on("data", chunk => { data += chunk; });
                req.on("end", () => { this.runCommand(data, res) });
            } else if (is_page_request(req)) {
                ok(res, this.page, "text/html; charset=utf-8");
            }
            else {
                badRequest(res, `Invalid request: ${req.method} ${req.url}`);
            }
        });

        server.listen(this.port, this.address);
        console.log(`Server listening on http://${this.address}:${this.port}`);
    }

    async runCommand(data, res) {
        try {
            data = JSON.parse(data);
        } catch (e) {
            badRequest(res, "Malformed request: " + e);
            return;
        }

        var ctx = new Context(this.registry, this.db, data.cdata);
        var cmdResponse = await ctx.runCommand(data.command);
        try {
            var newCdata = cmdResponse.error? null : ctx.getAllClientData();
            var resData = JSON.stringify({response: cmdResponse, cdata: newCdata});
            ok(res, resData, "application/json; charset=utf-8");
        } catch (e) {
            internalServerError(res);
        }
    }
}

module.exports.Server = Server;
