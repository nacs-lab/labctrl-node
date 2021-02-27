/*************************************************************************
 *   Copyright (c) 2019 - 2019 Yichao Yu <yyc1992@gmail.com>             *
 *                                                                       *
 *   This library is free software; you can redistribute it and/or       *
 *   modify it under the terms of the GNU Lesser General Public          *
 *   License as published by the Free Software Foundation; either        *
 *   version 3.0 of the License, or (at your option) any later version.  *
 *                                                                       *
 *   This library is distributed in the hope that it will be useful,     *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of      *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU    *
 *   Lesser General Public License for more details.                     *
 *                                                                       *
 *   You should have received a copy of the GNU Lesser General Public    *
 *   License along with this library. If not,                            *
 *   see <http://www.gnu.org/licenses/>.                                 *
 *************************************************************************/

"use strict";

const DB = require('./db');
const Zynq = require('./zynq');

const db = new DB('sources.db');

const source_types = {
    zynq: Zynq
};

class SourceDB extends DB.Model {
    source_id() {
        return `${this.type}-${this.id}`;
    }
    register(sock_mgr) {
        try {
            let cls = source_types[this.type];
            if (!cls) {
                console.error(`Error adding source: ${this.name} of type ${this.type} `,
                              "Unknown source type");
                return;
            }
            sock_mgr.add_source(new cls(this.source_id(), this.params));
        }
        catch (e) {
            console.error(`Error adding source: ${this.name} of type ${this.type} `, e);
        }
    }
    async reconfig(name, params, sock_mgr) {
        let src_ent = await db.transaction(async () => {
            let update = {};
            if (name !== undefined)
                update.name = name;
            if (params)
                update.params = params;
            return await this.update(update);
        }).catch(db.err_handler(false));
        if (!src_ent) {
            console.log("Update source configuration failed.");
            return false;
        }
        if (src_ent && sock_mgr) {
            let src = sock_mgr.find_source(src_ent.source_id());
            if (src) {
                src.reconfig(src_ent.params);
            }
            else {
                console.log(`Unable to find source ${src_ent.source_id()}`);
            }
        }
        return true;
    }
    async remove(sock_mgr) {
        let src_id = this.source_id();
        if (sock_mgr) {
            let src = sock_mgr.find_source(this.source_id());
            if (!src)
                return false;
            sock_mgr.remove_source(src);
            src.destroy();
        }
        return await db.transaction(async () => {
            await this.destroy();
            return true;
        }).catch(db.err_handler(false));
    }

    // Hijack the init function ;-p
    // The importer should wait for `SourceDB.init()`
    // or `SourceDB.register_all()` before continuing.
    static init(...args) {
        if (args.length > 0)
            return super.init(...args);
        return init_job;
    }

    static async register_all(sock_mgr) {
        await init_job;
        for (let entry of await this.findAll()) {
            entry.register(sock_mgr);
        }
    }

    static check_type(type) {
        return !!source_types[type];
    }

    static async add_source(type, name, params, sock_mgr) {
        let entry = await db.transaction(async () => {
            return await this.create({ type, name, params });
        }).catch(db.err_handler(null));
        if (entry && sock_mgr)
            entry.register(sock_mgr);
        return entry;
    }
}
SourceDB.init({
    id: {
        type: DB.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    type: {
        type: DB.STRING,
        allowNull: false
    },
    name: {
        type: DB.STRING,
        allowNull: false,
        unique: true
    },
    params: {
        type: DB.JSON,
        allowNull: false,
        defaultValue: {}
    },
}, {
    sequelize: db,
    modelName: 'source'
});

const init_job = db.sync();

module.exports = SourceDB;
