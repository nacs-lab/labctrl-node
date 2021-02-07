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

    static async register_all(sock_mgr) {
        await init_job;
        for (let entry of await this.findAll()) {
            entry.register(sock_mgr);
        }
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
