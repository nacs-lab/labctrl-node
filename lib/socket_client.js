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

const { is_object } = require('./utils');

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
socket.get = async function (raw_params, return_age) {
    if (!this.connected)
        return return_age ? [undefined, 0] : undefined;
    // TODO check cached values
    let params = Object.create(null);
    for (let src_id of Object.getOwnPropertyNames(raw_params))
        params[src_id] = { path: raw_params[src_id] };
    let raw_res = await new Promise(resolve => this.emit('get', params, resolve));
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
};
socket.set = async function (params) {
    if (!this.connected)
        return;
    return new Promise(resolve => this.emit('set', params, resolve));
};
