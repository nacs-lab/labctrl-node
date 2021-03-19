/*************************************************************************
 *   Copyright (c) 2019 - 2021 Yichao Yu <yyc1992@gmail.com>             *
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

const SocketManager = require('./socket_manager');
const SourceDB = require('./source_db');

class MetaSource extends SocketManager.Source {
    constructor(name) {
        super(name);
        this.#refresh();
        SourceDB.afterCreate(this.#refresh);
        SourceDB.afterUpdate(this.#refresh);
        SourceDB.afterSave(this.#refresh);
        SourceDB.afterDestroy(this.#refresh);
        SourceDB.afterBulkCreate(this.#refresh);
        SourceDB.afterBulkUpdate(this.#refresh);
        SourceDB.afterBulkDestroy(this.#refresh);
    }

    #refresh = async () => {
        let values = await this.#get_sources();
        this.update_values(values);
    }
    async #get_sources() {
        let values = Object.create(null);
        values.sources = Object.create(null);
        let cur_sources = this.get_values({}).values.sources;
        if (cur_sources) {
            for (let id in cur_sources) {
                values.sources[id] = null;
            }
        }
        await SourceDB.init();
        for (let entry of await SourceDB.findAll()) {
            values.sources[entry.id] = {
                type: entry.type,
                name: entry.name,
                params: entry.params
            };
        }
        return values;
    }

    set_values() {
        return false;
    }

    async #add_source(type, name, src_params) {
        if (!type || !name || src_params === undefined)
            return { error: "Missing required source parameter." };
        if (!SourceDB.check_type(type))
            return { error: `Unknown source type: ${type}` };
        if (await SourceDB.findOne({ where: { name }}))
            return { error: `Source name ${name} already exist.` };
        let src = await SourceDB.add_source(type, name, src_params, this.sock_mgr);
        if (!src)
            return { error: "Unknown error." };
        return src.id;
    }

    async #config_source(id, name, src_params) {
        if (!id)
            return { error: "Missing required source parameter." };
        if (name === undefined && src_params === undefined)
            return false;
        if (src_params.backgroundColor) {
            src_params.backgroundColor = String(src_params.backgroundColor);
            if (!src_params.backgroundColor.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)) {
                return { error: `Invalid color ${src_params.backgroundColor}.` };
            }
        }
        else {
            src_params.backgroundColor = '';
        }
        let src = await SourceDB.findOne({ where: { id }});
        if (!src)
            return { error: `Source ${id} does not exist.` };
        if (src.name == name)
            name = undefined;
        if (name !== undefined && !name)
            return { error: `Name cannot be empty.` };
        if (name && await SourceDB.findOne({ where: { name }}))
            return { error: `Source name ${name} already exist.` };
        if (!(await src.reconfig(name, src_params, this.sock_mgr)))
            return { error: "Unknown error." };
        return true;
    }

    async #remove_source(id) {
        if (!id)
            return { error: "Missing required source parameter." };
        let src = await SourceDB.findOne({ where: { id }});
        if (!src)
            return { error: `Source ${id} does not exist.` };
        if (!(await src.remove(this.sock_mgr)))
            return { error: "Unknown error." };
        return true;
    }

    call_method(name, params) {
        if (name === 'add_source') {
            let { type, name, params: src_params } = params;
            return this.#add_source(type, name, src_params);
        }
        else if (name === 'config_source') {
            let { id, name, params: src_params } = params;
            return this.#config_source(id, name, src_params);
        }
        else if (name === 'remove_source') {
            let { id } = params;
            return this.#remove_source(id);
        }
        return;
    }
};

module.exports = MetaSource;
