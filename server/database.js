const fs = require("fs");

const SAVE_TIMEOUT = 5 * 1000 // 5 seconds

class Database {
    constructor(db_file) {
        this.db_file = db_file;
        this._load();
        this.transactions = {};
        this._changed = false;
        this._pendingTransactions = 0;
        var self = this;
        this.saveTimeout = null;
    }

    _scheduleSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(this._save.bind(this), SAVE_TIMEOUT);
    }

    _copy(value) {
        return JSON.parse(JSON.stringify(value));
    }

    _load() {
        try {
            // Use append to create file if it does not exist
            fs.appendFileSync(this.db_file, "");
            let fdata = fs.readFileSync(this.db_file, {encoding: "utf-8"});
            if (fdata) this.data = JSON.parse(fdata);
        } catch (err) {
            console.error("Could not create/read/parse database file");
            throw err;
        }
        if (!this.data) {
            this.data = {};
        }
    }

    _save() {
        if (this._pendingTransactions == 0) {
            fs.writeFile(this.db_file, JSON.stringify(this.data), (err) => {
                if (err) throw err;
                // console.log("Database persisted to disk");
            });
        }
    }

    async lockNamespace(ns) {
        this._pendingTransactions++;
        if (this.transactions[ns] === undefined) {
            this.transactions[ns] = [];
        }
        // We're using promises a little bit like locks: only one
        // transaction can happen in a namespace at a time.
        var self = this;
        var p = new Promise((resolve, reject) => {
            self.transactions[ns].push({resolve: resolve, reject: reject});
        });
        if (this.transactions[ns].length == 1) {
            this.transactions[ns][0].resolve();
        }
        return p;
    }

    async unlockNamespace(ns) {
        this._pendingTransactions--;
        if (!this.transactions[ns]) {
            throw new Error("No transactions ongoing in namespace " + ns);
        }
        var current = this.transactions[ns].shift();
        var next = this.transactions[ns].shift();
        if (next) {
            next.resolve();
        }
    }

    async get(ns, key, defaultValue) {
        return new Promise((resolve, reject) => {
            var value = undefined;
            if (this.data[ns]) value = this.data[ns][key];
            if (value === undefined && defaultValue === undefined) {
                console.error(`get called with non-existing key: ${ns}:${key}`);
                reject(key);
                return;
            }
            if (value === undefined && defaultValue !== undefined) {
                if (!this.data[ns]) this.data[ns] = {};
                this.data[ns][key] = defaultValue;
                value = defaultValue;
            }
            resolve(this._copy(value));
        });
    }

    async set(ns, key, value) {
        return new Promise((resolve, reject) => {
            if (!this.data[ns]) this.data[ns] = {}
            this.data[ns][key] = this._copy(value);
            this._scheduleSave();
            resolve(value);
        });
    }

    async delete(ns, key) {
        return new Promise((resolve, reject) => {
            if (!this.data[ns]) this.data[ns] = {}
            let value = this.data[ns][key];
            delete this.data[ns][key];
            this._scheduleSave();
            resolve(this._copy(value));
        });
    }
}

module.exports.Database = Database;
