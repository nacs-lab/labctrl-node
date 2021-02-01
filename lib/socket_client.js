/*************************************************************************
 *   Copyright (c) 2021 - 2021 Yichao Yu <yyc1992@gmail.com>             *
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

// Uses the js file included in `_document.js`
const socket = io();
module.exports = socket;

const { is_object, object_empty, update_object, copy_object } = require('./utils');

socket.check_reconnect = function () {
    if (this.connected)
        return;
    this.disconnect();
    this.connect();
};

socket.call = async function (src_id, name, params) {
    if (!this.connected)
        return;
    return new Promise(resolve => this.emit('call', src_id, name, params, resolve));
};
socket.set = async function (params) {
    if (!this.connected)
        return;
    return new Promise(resolve => this.emit('set', params, resolve));
};

const next_id = (() => {
    // Share the same ID space for all callback registered.
    // Makes it less likely to unregister a wrong type.
    let max_id = 0;
    return function next_id() {
        max_id += 1;
        return max_id;
    }
})();

class SignalListener {
    #listeners = Object.create(null)
    #listener_ids = Object.create(null)

    constructor() {
        socket.on('signal', ({ src_id, name, params }) => {
            let listener_src = this.#listener_ids[src_id];
            if (!listener_src)
                return;
            let listener_name = listener_src[name];
            if (!listener_name)
                return;
            for (let id of listener_name) {
                try {
                    let [_src_id, _name, cb] = this.#listeners[id];
                    cb({ src_id, name, params });
                }
                catch (e) {
                    console.error("Error when processing signal " +
                                  `${name} from source ${src_id}: `, e);
                }
            }
        });
        socket.on('disconnect', () => {
            this.#listeners = Object.create(null);
            this.#listener_ids = Object.create(null);
        });
    }

    listen(src_id, name, cb) {
        if (!socket.connected)
            return -1;
        let id = next_id();
        this.#listeners[id] = [src_id, name, cb];
        let listener_src = this.#listener_ids[src_id];
        if (!listener_src) {
            listener_src = Object.create(null);
            this.#listener_ids[src_id] = listener_src;
        }
        let listener_name = listener_src[name];
        if (!listener_name) {
            listener_name = new Set();
            listener_src[name] = listener_name;
            socket.emit('listen', src_id, name);
        }
        listener_name.add(id);
        return id;
    }

    unlisten(id) {
        if (!socket.connected)
            return;
        let [src_id, name] = this.#listeners[id];
        delete this.#listeners[id];
        let listener_src = this.#listener_ids[src_id];
        if (!listener_src)
            return;
        let listener_name = listener_src[name];
        if (!listener_name)
            return;
        listener_name.delete(id);
        if (listener_name.size == 0)
            socket.emit('unlisten', src_id, name);
        delete listener_src[name];
    }
};
const signal_listener = new SignalListener();

socket.listen = function (src_id, name, cb) {
    return signal_listener.listen(src_id, name, cb);
};
socket.unlisten = function (id) {
    signal_listener.unlisten(id);
};

class WatchInfo {
    watchers = new Set()
    subwatch = Object.create(null)
};

class AgeInfo {
    maxage = 0
    subinfo = Object.create(null)
};
class SrcAgeInfo {
    maxage = 0
    info = new AgeInfo;
};

class ValueTracker {
    #watches = Object.create(null)
    #watcher_ids = Object.create(null)
    #values = Object.create(null)
    #ages = Object.create(null)

    constructor() {
        socket.on('update', (update) => {
            this._update(update);
            // TODO trigger callbacks
        });
        socket.on('disconnect', () => {
            this.#watches = Object.create(null);
            this.#watcher_ids = Object.create(null);
        });
    }

    _update_src(src_id, values) {
        let tree = this.#values[src_id];
        if (!tree)
            tree = Object.create(null);
        if (update_object(tree, values, false)) {
            if (object_empty(tree)) {
                delete this.#values[src_id];
            }
            else {
                this.#values[src_id] = tree;
            }
        }
    }
    _update_src_age(src_id, params, age) {
        let src_info = this.#ages[src_id];
        if (src_info === undefined) {
            src_info = new SrcAgeInfo();
            this.#ages[src_id] = src_info;
        }
        if (src_info.maxage < age)
            src_info.maxage = age;
        let set_age = (info, param) => {
            if (!info)
                info = new AgeInfo();
            if (!is_object(param)) {
                if (info.maxage < age)
                    info.maxage = age;
                return info;
            }
            for (let name of Object.getOwnPropertyNames(param))
                info.subinfo[name] = set_age(info.subinfo[name], param[name]);
            return info;
        };
        set_age(src_info.info, params);
    }
    _get_ages(params) {
        let ages = Object.create(null);
        for (let src_id of Object.getOwnPropertyNames(params)) {
            let src_params = params[src_id];
            let src_watch = this.#watcher_ids[src_id];
            let src_ageinfo = this.#ages[src_id];
            let src_maxage = src_ageinfo ? src_ageinfo.maxage : 0;
            let copy_age = (params, watch, ageinfo, maxage) => {
                if (watch && watch.watchers.size != 0) {
                    if (maxage < src_maxage) {
                        maxage = src_maxage;
                    }
                }
                if (ageinfo) {
                    if (maxage < ageinfo.maxage) {
                        maxage = ageinfo.maxage;
                    }
                }
                if (!is_object(params))
                    return maxage;
                let res = Object.create(null);
                for (let name of Object.getOwnPropertyNames(params)) {
                    let subwatch = watch ? watch.subwatch[name] : undefined;
                    let subageinfo = ageinfo ? ageinfo.subinfo[name] : undefined;
                    res[name] = copy_age(params[name], subwatch, subageinfo, maxage);
                }
                return res;
            };
            ages[src_id] = copy_age(src_params, src_watch,
                                    src_ageinfo ? src_ageinfo.info : undefined, 0);
        }
        return ages;
    }

    _update(update) {
        for (let src_id of Object.getOwnPropertyNames(update)) {
            let src_update = update[src_id];
            if (!src_update || !is_object(src_update.values))
                continue;
            this._update_src(src_id, src_update.values);
        }
    }

    async _refresh(params) {
        // Check if we need to manually get an update for any channels that we aren't watching.
        let req_params;
        let add_req = (src_id, params) => {
            if (!req_params)
                req_params = Object.create(null);
            req_params[src_id] = params;
        };
        for (let src_id of Object.getOwnPropertyNames(params)) {
            let src_params = params[src_id];
            let src_watch = this.#watcher_ids[src_id];
            if (!src_watch) {
                add_req(src_id, { path: src_params });
                continue;
            }
            let check_watch = (watch, params) => {
                // Watching, no need to check manually.
                if (watch.watchers.size != 0)
                    return;
                if (!is_object(params))
                    return 0;
                let req_path;
                for (let name of Object.getOwnPropertyNames(params)) {
                    let add_path = (path) => {
                        if (!req_path)
                            req_path = Object.create(null);
                        req_path[name] = path;
                    };
                    let subparams = params[name];
                    let subwatch = watch.subwatch[name];
                    if (!subwatch) {
                        add_path(subparams);
                    }
                    else {
                        let subpath = check_watch(subwatch, subparams);
                        if (subpath !== undefined) {
                            add_path(subpath);
                        }
                    }
                }
                return req_path;
            };
            let req_path = check_watch(src_watch, src_params);
            if (req_path) {
                add_req(src_id, { path: req_path });
            }
        }
        if (!req_params)
            return;
        let res = await new Promise(resolve => socket.emit('get', req_params, resolve));
        for (let src_id of Object.getOwnPropertyNames(res))
            this._update_src_age(src_id, req_params[src_id].path, res[src_id].age);
        this._update(res);
    }

    watch(watch, cb) {
        if (!socket.connected)
            return;
        let id = next_id();
        // TODO
        return id;
    }

    unwatch(id) {
        if (!socket.connected)
            return;
        // TODO
    }

    async get(params, return_age) {
        // Update cache
        if (socket.connected)
            await this._refresh(params);
        let res = this.get_cached(params);
        if (!return_age)
            return res;
        return [res, this._get_ages(params)];
    }

    get_cached(params) {
        // Get value from cache
        let collect_res = (tree, params) => {
            let res;
            for (let name of Object.getOwnPropertyNames(params)) {
                let subtree = tree[name];
                if (subtree === undefined)
                    continue;
                let subparams = params[name];
                let add_res = (subres) => {
                    if (!res)
                        res = Object.create(null);
                    res[name] = subres;
                };
                if (is_object(subparams)) {
                    if (!is_object(subtree))
                        continue;
                    let subres = collect_res(subtree, subparams);
                    if (subres !== undefined) {
                        add_res(subres);
                    }
                }
                else if (is_object(subtree)) {
                    add_res(copy_object(subtree));
                }
                else {
                    add_res(subtree);
                }
            }
            return res;
        };
        return collect_res(this.#values, params);
    }
};
const value_tracker = new ValueTracker();

socket.watch = function (watch, cb) {
    return value_tracker.watch(watch, cb);
};
socket.get = function (params, return_age) {
    return value_tracker.get(params, return_age);
};
socket.get_cached = function (params) {
    return value_tracker.get_cached(params);
};
socket.unwatch = function (id) {
    value_tracker.unwatch(id);
};
