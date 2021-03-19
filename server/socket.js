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

const compiling = process.env.NODE_COMPILING == '1';

const Server = compiling ? null : require('./server');

const { is_object, object_empty, update_object, copy_object } = require('../lib/utils');

class socket {
    static async #get_sock_mgr(ctx) {
        if (compiling)
            return;
        let server = Server.current();
        if (!server || !ctx || !(await server.request_approved(ctx.req)))
            return;
        return server.sock_mgr;
    }

    static async call(src_id, name, params, ctx) {
        let sock_mgr = await this.#get_sock_mgr(ctx);
        if (!sock_mgr)
            return;
        return sock_mgr.call_method(src_id, name, params);
    }
    static async get(raw_params, return_age, ctx) {
        let sock_mgr = await this.#get_sock_mgr(ctx);
        if (!sock_mgr)
            return return_age ? [undefined, 0] : undefined;
        // The age is managed on the client side by the socket to save communication bandwidth.
        // We don't need to do this on the server side (there's no point caching the values
        // that are already in the `SocketManager`)
        // and we can simply get the values from the `SocketManager` directly.
        // Simply translate the parameters to the right format and forward it.
        let params = Object.create(null);
        for (let src_id of Object.getOwnPropertyNames(raw_params))
            params[src_id] = { path: raw_params[src_id] };
        let raw_res = await sock_mgr.get_values(params);
        let res = Object.create(null);
        for (let src_id of Object.getOwnPropertyNames(raw_res))
            res[src_id] = raw_res[src_id].values;
        if (!return_age)
            return res;
        let ages = Object.create(null);
        for (let src_id of Object.getOwnPropertyNames(raw_res)) {
            let age = raw_res[src_id].age;
            let copy_age = (param) => {
                if (!is_object(param))
                    return age;
                let ages = Object.create(null);
                for (let name of Object.getOwnPropertyNames(param))
                    ages[name] = copy_age(param[name]);
                return ages;
            };
            ages[src_id] = copy_age(raw_params[src_id]);
        }
        return [res, ages];
    }
    static async set(params, ctx) {
        let sock_mgr = await this.#get_sock_mgr(ctx);
        if (!sock_mgr)
            return;
        return sock_mgr.set_values(params);
    }

    // Maintain a "cache" on the server side so that we can return the same result
    // on the server and the client (and so that the server rendered page is usable).
    // We can bypass the authentication here
    // since the cache is isolated from the actual values.
    // This works very well in development mode but doesn't work in production mode.
    // https://github.com/vercel/next.js/discussions/23042
    static put(values, ages) {
        if (compiling)
            return;
        if (!values)
            return;
        let cache = Server.namespace.get('value_cache');
        if (!cache) {
            cache = Object.create(null);
            Server.namespace.set('value_cache', cache);
        }
        for (let src_id of Object.getOwnPropertyNames(values)) {
            let src_values = values[src_id];
            if (!is_object(src_values))
                continue;
            let tree = cache[src_id];
            if (!tree)
                tree = Object.create(null);
            if (update_object(tree, src_values, false)) {
                if (object_empty(tree)) {
                    delete cache[src_id];
                }
                else {
                    cache[src_id] = tree;
                }
            }
        }
    }
    static get_cached(params) {
        if (compiling)
            return;
        // Get value from cache
        let cache = Server.namespace.get('value_cache');
        if (!cache)
            return;
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
        return collect_res(cache, params);
    }
};

module.exports = socket;
